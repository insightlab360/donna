import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { isWeekday, todayKST } from "@/lib/date";
import { getOverdueTasks, getTasksOnDate, isTaskOpen, sortForPopup } from "@/lib/tasks-logic";
import { dailyDigestHtml, dailyDigestSubject } from "@/lib/email/dailyDigestTemplate";
import { expiryWarningHtml, expiryWarningSubject } from "@/lib/email/membershipTemplates";
import { sendAppEmail } from "@/lib/email/send";
import { daysRemaining } from "@/lib/membership/period";
import type { Profile, Project, Task } from "@/lib/types";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

type AdminClient = ReturnType<typeof createAdminClient>;

/** Flips a stale 'active' row to 'expired' once its access_end_at has passed. Idempotent. */
async function autoExpireIfDue(admin: AdminClient, profile: Profile, today: string): Promise<Profile> {
  if (profile.unlimited || profile.membership_status !== "active" || !profile.access_end_at) return profile;
  if (profile.access_end_at >= today) return profile;

  await admin.from("profiles").update({ membership_status: "expired" }).eq("id", profile.id);
  await admin.from("membership_history").insert({
    user_id: profile.id,
    action: "expire",
    previous_status: "active",
    new_status: "expired",
    previous_end_at: profile.access_end_at,
    new_end_at: profile.access_end_at,
    note: "자동 만료 처리 (일일 배치)",
  });
  return { ...profile, membership_status: "expired" };
}

async function maybeSendExpiryWarning(admin: AdminClient, profile: Profile, today: string) {
  if (profile.unlimited || profile.membership_status !== "active" || !profile.access_end_at) return;
  if (daysRemaining(profile.access_end_at, today) !== 7) return;

  const { data: existingLog } = await admin
    .from("notification_logs")
    .select("id")
    .eq("user_id", profile.id)
    .eq("notification_date", today)
    .eq("kind", "expiry_warning")
    .maybeSingle();
  if (existingLog) return;

  try {
    await sendAppEmail({
      to: profile.email,
      subject: expiryWarningSubject(),
      html: expiryWarningHtml({ name: profile.name, endDate: profile.access_end_at }),
    });
    await admin
      .from("notification_logs")
      .insert({ user_id: profile.id, notification_date: today, kind: "expiry_warning", sent_at: new Date().toISOString(), status: "sent" });
  } catch {
    await admin
      .from("notification_logs")
      .insert({ user_id: profile.id, notification_date: today, kind: "expiry_warning", status: "failed" });
  }
}

async function processUser(admin: AdminClient, userId: string, email: string, today: string): Promise<string> {
  const { data: profileRow } = await admin.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (!profileRow) return "no_profile";

  let profile = profileRow as Profile;
  profile = await autoExpireIfDue(admin, profile, today);
  await maybeSendExpiryWarning(admin, profile, today);

  const isActiveMember = profile.unlimited || profile.membership_status === "active";
  if (!isActiveMember) return "membership_inactive";

  const { data: existingLog } = await admin
    .from("notification_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("notification_date", today)
    .eq("kind", "daily_digest")
    .maybeSingle();

  if (existingLog) return "already_processed";

  const [{ data: taskRows, error: taskError }, { data: projectRows }] = await Promise.all([
    admin.from("tasks").select("*").eq("user_id", userId),
    admin.from("projects").select("*").eq("user_id", userId),
  ]);

  if (taskError) {
    await admin
      .from("notification_logs")
      .insert({ user_id: userId, notification_date: today, kind: "daily_digest", status: "failed", task_count: 0 });
    return "failed";
  }

  const tasks = (taskRows ?? []) as Task[];
  const projects = (projectRows ?? []) as Project[];
  const projectsById = new Map(projects.map((p) => [p.id, p]));

  const todayTasks = sortForPopup(getTasksOnDate(tasks, today).filter(isTaskOpen));
  const overdueTasks = getOverdueTasks(tasks, today);

  if (todayTasks.length === 0) {
    await admin
      .from("notification_logs")
      .insert({ user_id: userId, notification_date: today, kind: "daily_digest", status: "skipped", task_count: 0 });
    return "skipped_no_tasks";
  }

  try {
    await sendAppEmail({
      to: email,
      subject: dailyDigestSubject(today),
      html: dailyDigestHtml({ dateStr: today, tasks: todayTasks, overdueTasks, projectsById }),
    });
    await admin.from("notification_logs").insert({
      user_id: userId,
      notification_date: today,
      kind: "daily_digest",
      sent_at: new Date().toISOString(),
      status: "sent",
      task_count: todayTasks.length,
    });
    return "sent";
  } catch {
    await admin.from("notification_logs").insert({
      user_id: userId,
      notification_date: today,
      kind: "daily_digest",
      status: "failed",
      task_count: todayTasks.length,
    });
    return "failed";
  }
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

  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    for (const user of data.users) {
      if (!user.email) continue;
      const status = await processUser(admin, user.id, user.email, today);
      results.push({ userId: user.id, status });
    }

    if (data.users.length < perPage) break;
    page += 1;
  }

  return NextResponse.json({ date: today, processed: results.length, results });
}
