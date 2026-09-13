import { compareDateStr, formatShortDateRange, formatTimeOrNone, isDateInRange, todayKST } from "./date";
import type { Project, ProjectStats, Task, WorkType } from "./types";

/** "프로젝트: 이름" — used anywhere a project's name is shown so it can't be mistaken for a Task title. */
export function projectDisplayName(name: string): string {
  return `프로젝트: ${name}`;
}

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

/** A range task that actually spans more than one calendar day — shown as one merged bar on the month grid instead of a chip repeated in every day it touches. */
export function isMultiDayTask(task: Task): boolean {
  return (
    (task.date_mode === "date_range" || task.date_mode === "datetime_range") &&
    task.start_date !== null &&
    task.end_date !== null &&
    task.end_date !== task.start_date
  );
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

/** Canonical display order across every Task/Project list in the app: 업무(회사) > 개인프로젝트 > 개인. */
const WORK_TYPE_ORDER: Record<WorkType, number> = {
  회사: 0,
  개인프로젝트: 1,
  개인: 2,
};

function compareOptionalDate(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return compareDateStr(a, b);
}

function compareTaskDisplayOrder(a: Task, b: Task): number {
  const workDiff = WORK_TYPE_ORDER[a.work_type] - WORK_TYPE_ORDER[b.work_type];
  if (workDiff !== 0) return workDiff;
  const dueDiff = compareOptionalDate(a.due_date, b.due_date);
  if (dueDiff !== 0) return dueDiff;
  return a.title.localeCompare(b.title, "ko");
}

/** Sort for the "today briefing" popup and other snapshot views: 업무>개인프로젝트>개인, then 마감일, then 이름(가나다순). */
export function sortForPopup(tasks: Task[]): Task[] {
  return [...tasks].sort(compareTaskDisplayOrder);
}

/** Sort for period/list views — same ordering as sortForPopup. */
export function sortForPeriod(tasks: Task[]): Task[] {
  return [...tasks].sort(compareTaskDisplayOrder);
}

/** Same 업무>개인프로젝트>개인 → 마감일(종료일) → 이름(가나다순) ordering, for Project lists. */
export function sortProjectsForDisplay(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => {
    const workDiff = WORK_TYPE_ORDER[a.work_type] - WORK_TYPE_ORDER[b.work_type];
    if (workDiff !== 0) return workDiff;
    const dueDiff = compareOptionalDate(a.end_date, b.end_date);
    if (dueDiff !== 0) return dueDiff;
    return a.name.localeCompare(b.name, "ko");
  });
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
