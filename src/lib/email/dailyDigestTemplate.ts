import { formatMonthDayKR, formatMonthDayWeekdayKR } from "@/lib/date";
import { formatTaskWhen, isDueToday } from "@/lib/tasks-logic";
import type { Project, Task } from "@/lib/types";
import { escapeHtml } from "./escapeHtml";

export function dailyDigestSubject(dateStr: string): string {
  return `[My Assistant Donna] ${formatMonthDayKR(dateStr)} 오늘의 할 일`;
}

function taskLine(task: Task, project: Project | undefined, today: string): string {
  const when = escapeHtml(formatTaskWhen(task));
  const title = escapeHtml(task.title);
  const meta = [task.work_type, project?.name]
    .filter((v): v is string => Boolean(v))
    .map(escapeHtml)
    .join(" · ");
  const dueTodayTag = isDueToday(task, today)
    ? '<span style="display:inline-block;margin-left:6px;padding:1px 6px;border-radius:9999px;background:#000;color:#fff;font-size:11px;">오늘 마감</span>'
    : "";

  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #eee;">
        <div style="font-size:12px;color:#666;font-weight:600;">${when}${dueTodayTag}</div>
        <div style="font-size:14px;color:#111;margin-top:2px;">${title}</div>
        <div style="font-size:12px;color:#888;margin-top:2px;">${meta} · ${escapeHtml(task.status)}</div>
      </td>
    </tr>`;
}

export function dailyDigestHtml(params: {
  dateStr: string;
  tasks: Task[];
  overdueTasks: Task[];
  projectsById: Map<string, Project>;
}): string {
  const { dateStr, tasks, overdueTasks, projectsById } = params;

  const taskRows = tasks.map((t) => taskLine(t, projectsById.get(t.project_id ?? ""), dateStr)).join("");
  const overdueRows = overdueTasks.map((t) => taskLine(t, projectsById.get(t.project_id ?? ""), dateStr)).join("");

  const overdueSection =
    overdueTasks.length > 0
      ? `
      <table role="presentation" width="100%" style="margin-top:24px;border-top:2px solid #111;padding-top:12px;">
        <tr><td style="font-size:13px;font-weight:700;color:#c0392b;padding-bottom:4px;">기한이 지난 할 일 ${overdueTasks.length}개</td></tr>
        ${overdueRows}
      </table>`
      : "";

  return `
  <div style="max-width:560px;margin:0 auto;padding:24px;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#111;">
    <p style="font-size:12px;color:#888;margin:0 0 4px;">${formatMonthDayWeekdayKR(dateStr)}</p>
    <h1 style="font-size:18px;margin:0 0 16px;">오늘 해야 할 일이 ${tasks.length}개 있습니다.</h1>
    <table role="presentation" width="100%">
      ${taskRows}
    </table>
    ${overdueSection}
    <p style="margin-top:28px;font-size:11px;color:#aaa;">My Assistant Donna · 나의 비서 도나</p>
  </div>`;
}
