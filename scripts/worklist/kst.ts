import { formatInTimeZone } from "date-fns-tz";

const KST = "Asia/Seoul";

/** Today's date in Asia/Seoul as 'yyyy-MM-dd', independent of the runner's own timezone. */
export function todayKST(): string {
  return formatInTimeZone(new Date(), KST, "yyyy-MM-dd");
}

/** -1 / 0 / 1, comparing two 'yyyy-MM-dd' strings lexicographically (safe for ISO dates). */
export function compareDateStr(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
