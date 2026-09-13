import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { isWeekday, todayKST } from "@/lib/date";
import { getOverdueTasks, getTasksOnDate, isTaskOpen, sortForPopup } from "@/lib/tasks-logic";
import { dailyDigestHtml, dailyDigestSubject } from "@/lib/email/dailyDigestTemplate";
import { expiryWarningHtml, expiryWarningSubject } from "@/lib/email/membershipTemplates";
import { sendAppEmail } from "@/lib/email/send";
import { daysRemaining } from "@/lib/membership/period";
import type { MembershipStatus, Project, Task } from "@/lib/types";

export const dynamic = "force-dynamic";

// Tune if the active member base grows large enough that a single .in()/.insert()
// call would carry too many rows — everything below is chunked by this constant
// instead of issuing one DB round trip per user.
const CRON_BATCH_SIZE = 500;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

type AdminClient = ReturnType<typeof createAdminClient>;

interface CronProfile {
  id: string;
  email: string;
  name: string | null;
  membership_status: MembershipStatus | null;
  unlimited: boolean;
  access_end_at: string | null;
}

interface NotificationLogRow {
  user_id: string;
  notification_date: string;
  kind: "daily_digest" | "expiry_warning";
  sent_at?: string;
  status: "sent" | "skipped" | "failed";
  task_count?: number;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Every profile that could possibly need today's processing (active membership, or unlimited), paginated in batches instead of one query per user. */
async function fetchCandidateProfiles(admin: AdminClient): Promise<CronProfile[]> {
  const profiles: CronProfile[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await admin
      .from("profiles")
      .select("id,email,name,membership_status,unlimited,access_end_at")
      .or("unlimited.eq.true,membership_status.eq.active")
      .range(from, from + CRON_BATCH_SIZE - 1);
    if (error) throw new Error(error.message);
    profiles.push(...((data ?? []) as CronProfile[]));
    if (!data || data.length < CRON_BATCH_SIZE) break;
    from += CRON_BATCH_SIZE;
  }
  return profiles;
}

/**
 * Flips every stale 'active' row to 'expired' in one server-side UPDATE ... WHERE
 * (backed by the profiles (membership_status, access_end_at) index), then logs all
 * of them in one batch INSERT — no per-user round trip either way.
 */
async function batchAutoExpire(admin: AdminClient, today: string): Promise<void> {
  const { data, error } = await admin
    .from("profiles")
    .update({ membership_status: "expired" })
    .eq("membership_status", "active")
    .eq("unlimited", false)
    .lt("access_end_at", today)
    .select("id, access_end_at");
  if (error || !data || data.length === 0) return;

  for (const rowBatch of chunk(data, CRON_BATCH_SIZE)) {
    await admin.from("membership_history").insert(
      rowBatch.map((r) => ({
        user_id: r.id,
        action: "expire" as const,
        previous_status: "active" as const,
        new_status: "expired" as const,
        previous_end_at: r.access_end_at,
        new_end_at: r.access_end_at,
        note: "자동 만료 처리 (일일 배치)",
      }))
    );
  }
}

/** Which (user_id, kind) pairs already have a notification_logs row for today — one batched lookup instead of one per user. */
async function fetchAlreadyLogged(admin: AdminClient, today: string, userIds: string[]): Promise<Set<string>> {
  const seen = new Set<string>();
  for (const idBatch of chunk(userIds, CRON_BATCH_SIZE)) {
    const { data } = await admin
      .from("notification_logs")
      .select("user_id, kind")
      .eq("notification_date", today)
      .in("user_id", idBatch);
    for (const row of data ?? []) seen.add(`${row.user_id}:${row.kind}`);
  }
  return seen;
}

async function insertLogs(admin: AdminClient, rows: NotificationLogRow[]): Promise<void> {
  for (const batch of chunk(rows, CRON_BATCH_SIZE)) {
    if (batch.length > 0) await admin.from("notification_logs").insert(batch);
  }
}

const DIGEST_TASK_COLUMNS = "id,user_id,title,work_type,project_id,date_mode,start_date,start_time,end_date,due_date,status,created_at";
const DIGEST_PROJECT_COLUMNS = "id,user_id,name";

/** All tasks/projects for every digest candidate in one query each (instead of one pair of queries per user), grouped in memory. */
async function fetchDigestData(
  admin: AdminClient,
  userIds: string[]
): Promise<{ tasksByUser: Map<string, Task[]>; projectsByUser: Map<string, Map<string, Project>>; error: boolean }> {
  const tasksByUser = new Map<string, Task[]>();
  const projectsByUser = new Map<string, Map<string, Project>>();
  if (userIds.length === 0) return { tasksByUser, projectsByUser, error: false };

  for (const idBatch of chunk(userIds, CRON_BATCH_SIZE)) {
    const [taskRes, projectRes] = await Promise.all([
      admin.from("tasks").select(DIGEST_TASK_COLUMNS).in("user_id", idBatch),
      admin.from("projects").select(DIGEST_PROJECT_COLUMNS).in("user_id", idBatch),
    ]);
    if (taskRes.error) return { tasksByUser, projectsByUser, error: true };

    for (const t of (taskRes.data ?? []) as Task[]) {
      if (!tasksByUser.has(t.user_id)) tasksByUser.set(t.user_id, []);
      tasksByUser.get(t.user_id)!.push(t);
    }
    for (const proj of (projectRes.data ?? []) as Project[]) {
      if (!projectsByUser.has(proj.user_id)) projectsByUser.set(proj.user_id, new Map());
      projectsByUser.get(proj.user_id)!.set(proj.id, proj);
    }
  }
  return { tasksByUser, projectsByUser, error: false };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const today = todayKST();
  if (!isWeekday(today)) {
    return NextResponse.json({ skipped: "weekend", date: today });
  }

  const admin = createAdminClient();
  const results: Array<{ userId: string; status: string }> = [];

  // 1) One server-side UPDATE ... WHERE flips every stale 'active' row to 'expired'
  // (index-backed, zero per-user round trips), then one batch INSERT logs them.
  await batchAutoExpire(admin, today);

  // 2) One (paginated) query for every profile that could need processing today —
  // post-expiry, so a just-expired row is correctly excluded already.
  let profiles: CronProfile[];
  try {
    profiles = await fetchCandidateProfiles(admin);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "profiles fetch failed" }, { status: 500 });
  }

  const activeProfiles = profiles.filter((p) => p.unlimited || p.membership_status === "active");
  const warningCandidates = profiles.filter(
    (p) => !p.unlimited && p.membership_status === "active" && p.access_end_at && daysRemaining(p.access_end_at, today) === 7
  );

  // 3) One batched dedupe lookup covers both notification kinds for every relevant user.
  const relevantIds = Array.from(new Set([...activeProfiles.map((p) => p.id), ...warningCandidates.map((p) => p.id)]));
  const alreadyLogged = await fetchAlreadyLogged(admin, today, relevantIds);

  const logRows: NotificationLogRow[] = [];

  // 4) Expiry warnings — email sends stay per-recipient (inherent to sending mail),
  // but every DB read/write around them is batched.
  const warningsToSend = warningCandidates.filter((p) => !alreadyLogged.has(`${p.id}:expiry_warning`));
  for (const p of warningsToSend) {
    try {
      await sendAppEmail({
        to: p.email,
        subject: expiryWarningSubject(),
        html: expiryWarningHtml({ name: p.name, endDate: p.access_end_at! }),
      });
      logRows.push({ user_id: p.id, notification_date: today, kind: "expiry_warning", sent_at: new Date().toISOString(), status: "sent" });
    } catch {
      logRows.push({ user_id: p.id, notification_date: today, kind: "expiry_warning", status: "failed" });
    }
  }

  // 5) Daily digest — one tasks query + one projects query for every candidate, grouped in memory.
  const digestCandidates = activeProfiles.filter((p) => !alreadyLogged.has(`${p.id}:daily_digest`));
  const { tasksByUser, projectsByUser, error: digestFetchFailed } = await fetchDigestData(
    admin,
    digestCandidates.map((p) => p.id)
  );

  if (digestFetchFailed) {
    for (const p of digestCandidates) {
      logRows.push({ user_id: p.id, notification_date: today, kind: "daily_digest", status: "failed", task_count: 0 });
      results.push({ userId: p.id, status: "failed" });
    }
  } else {
    for (const p of digestCandidates) {
      const tasks = tasksByUser.get(p.id) ?? [];
      const projectsById = projectsByUser.get(p.id) ?? new Map<string, Project>();
      const todayTasks = sortForPopup(getTasksOnDate(tasks, today).filter(isTaskOpen));
      const overdueTasks = getOverdueTasks(tasks, today);

      if (todayTasks.length === 0) {
        logRows.push({ user_id: p.id, notification_date: today, kind: "daily_digest", status: "skipped", task_count: 0 });
        results.push({ userId: p.id, status: "skipped_no_tasks" });
        continue;
      }

      try {
        await sendAppEmail({
          to: p.email,
          subject: dailyDigestSubject(today),
          html: dailyDigestHtml({ dateStr: today, tasks: todayTasks, overdueTasks, projectsById }),
        });
        logRows.push({
          user_id: p.id,
          notification_date: today,
          kind: "daily_digest",
          sent_at: new Date().toISOString(),
          status: "sent",
          task_count: todayTasks.length,
        });
        results.push({ userId: p.id, status: "sent" });
      } catch {
        logRows.push({ user_id: p.id, notification_date: today, kind: "daily_digest", status: "failed", task_count: todayTasks.length });
        results.push({ userId: p.id, status: "failed" });
      }
    }
  }

  // 6) One batch INSERT (chunked) writes every notification_logs row produced this run.
  await insertLogs(admin, logRows);

  return NextResponse.json({ date: today, processed: results.length, results });
}
