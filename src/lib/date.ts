import { formatInTimeZone } from "date-fns-tz";

export const KST = "Asia/Seoul";

const WEEKDAYS_KR = ["일", "월", "화", "수", "목", "금", "토"];

/** Today's date in Asia/Seoul as 'yyyy-MM-dd', independent of server timezone. */
export function todayKST(): string {
  return formatInTimeZone(new Date(), KST, "yyyy-MM-dd");
}

/** Current time in Asia/Seoul as 'HH:mm'. */
export function nowTimeKST(): string {
  return formatInTimeZone(new Date(), KST, "HH:mm");
}

/**
 * All date-only arithmetic below treats 'yyyy-MM-dd' strings as calendar dates
 * and uses UTC getters/setters exclusively so results never depend on the
 * timezone of the machine running the code (Korea has no DST, so a fixed
 * +9:00 offset is always safe, but relying on *local* Date getters would
 * break on a server running in UTC or any other zone).
 */
export function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toDateOnlyString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysStr(dateStr: string, days: number): string {
  const d = parseDateOnly(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateOnlyString(d);
}

/** 0 = Sunday ... 6 = Saturday */
export function weekdayOf(dateStr: string): number {
  return parseDateOnly(dateStr).getUTCDay();
}

export function isWeekday(dateStr: string): boolean {
  const day = weekdayOf(dateStr);
  return day >= 1 && day <= 5;
}

export function compareDateStr(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function isDateInRange(date: string, start: string, end: string): boolean {
  return compareDateStr(start, date) <= 0 && compareDateStr(date, end) <= 0;
}

export function startOfWeekMon(dateStr: string): string {
  const day = weekdayOf(dateStr);
  const diff = day === 0 ? -6 : 1 - day;
  return addDaysStr(dateStr, diff);
}

export function endOfWeekSun(dateStr: string): string {
  return addDaysStr(startOfWeekMon(dateStr), 6);
}

export function startOfMonthStr(dateStr: string): string {
  const d = parseDateOnly(dateStr);
  return toDateOnlyString(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
}

export function endOfMonthStr(dateStr: string): string {
  const d = parseDateOnly(dateStr);
  return toDateOnlyString(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
}

export function addMonthsStr(dateStr: string, months: number): string {
  const d = parseDateOnly(dateStr);
  return toDateOnlyString(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1)));
}

/** '9월 15일' */
export function formatMonthDayKR(dateStr: string): string {
  const d = parseDateOnly(dateStr);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
}

/** '9월 15일 화요일' */
export function formatMonthDayWeekdayKR(dateStr: string): string {
  const d = parseDateOnly(dateStr);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 ${WEEKDAYS_KR[d.getUTCDay()]}요일`;
}

/** '9/15' */
export function formatShortDate(dateStr: string): string {
  const d = parseDateOnly(dateStr);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

/** '9/13 – 9/17' */
export function formatShortDateRange(start: string, end: string): string {
  return `${formatShortDate(start)} – ${formatShortDate(end)}`;
}

/** 'HH:MM' from a stored time value, or the "시간 미지정" placeholder. */
export function formatTimeOrNone(time: string | null): string {
  if (!time) return "시간 미지정";
  return time.slice(0, 5);
}

export function weekdayLabelKR(dateStr: string): string {
  return WEEKDAYS_KR[weekdayOf(dateStr)];
}
