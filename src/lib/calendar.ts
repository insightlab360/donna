import { addDaysStr, compareDateStr, endOfMonthStr, endOfWeekSat, startOfMonthStr, startOfWeekSun } from "./date";
import type { WorkType } from "./types";

/** Full weeks (Sun-Sat) covering the month that `anchor` falls in, for a 6-row month grid. */
export function getMonthGridDates(anchor: string): string[] {
  const gridStart = startOfWeekSun(startOfMonthStr(anchor));
  const gridEnd = endOfWeekSat(endOfMonthStr(anchor));
  const dates: string[] = [];
  let cur = gridStart;
  while (compareDateStr(cur, gridEnd) <= 0) {
    dates.push(cur);
    cur = addDaysStr(cur, 1);
  }
  return dates;
}

/** Sun-Sat dates of the week `anchor` falls in. */
export function getWeekDates(anchor: string): string[] {
  const start = startOfWeekSun(anchor);
  return Array.from({ length: 7 }, (_, i) => addDaysStr(start, i));
}

const WORK_TYPE_ABBR: Record<WorkType, string> = {
  회사: "회사",
  개인: "개인",
  개인프로젝트: "프로젝트",
};

export function workTypeAbbr(workType: WorkType): string {
  return WORK_TYPE_ABBR[workType];
}
