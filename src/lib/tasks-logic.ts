import { compareDateStr, formatShortDateRange, formatTimeOrNone, isDateInRange, todayKST } from "./date";
import type { Project, ProjectStats, Task, TaskStatus } from "./types";

/** How a task's date/time should read in a list row, matching the spec's display examples. */
export function formatTaskWhen(task: Task): string {
  if (task.date_mode === "none") return "기한 미정";
  if (task.date_mode === "date_range" || task.date_mode === "datetime_range") {
    return formatShortDateRange(task.start_date!, task.end_date ?? task.start_date!);
  }
  return formatTimeOrNone(task.start_time);
}

export function computeDueDate(task: {
  date_mode: Task["date_mode"];
  start_date: string | null;
  end_date: string | null;
}): string | null {
  if (task.date_mode === "none") return null;
  if (task.date_mode === "date_range" || task.date_mode === "datetime_range") {
    return task.end_date ?? task.start_date;
  }
  return task.start_date;
}

export function isTaskOnDate(task: Task, dateStr: string): boolean {
  if (task.date_mode === "none" || task.start_date === null) return false;
  if (task.date_mode === "date_range" || task.date_mode === "datetime_range") {
    const end = task.end_date ?? task.start_date;
    return isDateInRange(dateStr, task.start_date, end);
  }
  return task.start_date === dateStr;
}

export function isTaskOpen(task: Task): boolean {
  return task.status !== "완료" && task.status !== "드랍";
}

export function isTaskUndetermined(task: Task): boolean {
  return task.date_mode === "none";
}

/** Open tasks with no date at all — shown in their own "기한 미정" list, never on the calendar or in today/period views. */
export function getUndeterminedTasks(tasks: Task[]): Task[] {
  return sortForPopup(tasks.filter((t) => isTaskUndetermined(t) && isTaskOpen(t)));
}

export function getTasksOnDate(tasks: Task[], dateStr: string): Task[] {
  return tasks.filter((t) => isTaskOnDate(t, dateStr));
}

export function getOverdueTasks(tasks: Task[], today = todayKST()): Task[] {
  return tasks.filter(
    (t): t is Task & { due_date: string } => t.due_date !== null && isTaskOpen(t) && compareDateStr(t.due_date, today) < 0
  );
}

export function isDueToday(task: Task, today = todayKST()): boolean {
  return task.due_date === today;
}

/** Safe range check for due_date-based views — tasks with no date (date_mode 'none') never match. */
export function isDueInRange(task: Task, start: string, end: string): boolean {
  return task.due_date !== null && isDateInRange(task.due_date, start, end);
}

const POPUP_STATUS_ORDER: Record<TaskStatus, number> = {
  진행중: 0,
  예정: 1,
  보류: 2,
  완료: 3,
  드랍: 4,
};

/** Sort for the "today briefing" popup: open work first, then by time, then newest first. */
export function sortForPopup(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const statusDiff = POPUP_STATUS_ORDER[a.status] - POPUP_STATUS_ORDER[b.status];
    if (statusDiff !== 0) return statusDiff;

    const timeDiff = compareOptionalTime(a.start_time, b.start_time);
    if (timeDiff !== 0) return timeDiff;

    return b.created_at.localeCompare(a.created_at);
  });
}

/** Sort for period lookups: due date first, then time, undated last. */
export function sortForPeriod(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const dueDiff = compareOptionalDate(a.due_date, b.due_date);
    if (dueDiff !== 0) return dueDiff;
    return compareOptionalTime(a.start_time, b.start_time);
  });
}

function compareOptionalDate(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return compareDateStr(a, b);
}

function compareOptionalTime(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.localeCompare(b);
}

export function computeProjectStats(project: Project, allTasks: Task[]): ProjectStats {
  const tasks = allTasks.filter((t) => t.project_id === project.id);
  const total = tasks.length;
  const scheduled = tasks.filter((t) => t.status === "예정").length;
  const inProgress = tasks.filter((t) => t.status === "진행중").length;
  const done = tasks.filter((t) => t.status === "완료").length;
  const onHold = tasks.filter((t) => t.status === "보류").length;
  const dropped = tasks.filter((t) => t.status === "드랍").length;
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);
  const incompleteTasks = sortForPeriod(tasks.filter((t) => isTaskOpen(t)));

  return { total, scheduled, inProgress, done, onHold, dropped, progress, incompleteTasks };
}
