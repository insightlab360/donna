import { addDaysStr, compareDateStr, parseDateOnly, todayKST, toDateOnlyString } from "@/lib/date";
import { MEMBERSHIP_CONFIG } from "./config";

/**
 * Adds calendar months to a 'yyyy-MM-dd' date, preserving day-of-month and
 * clamping to the target month's last day (e.g. Jan 31 + 1 month = Feb 28/29).
 * Never approximate a month as 30 days.
 */
export function addCalendarMonths(dateStr: string, months: number): string {
  const d = parseDateOnly(dateStr);
  const totalMonths = d.getUTCMonth() + months;
  const targetYear = d.getUTCFullYear() + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const day = Math.min(d.getUTCDate(), daysInTargetMonth);
  return toDateOnlyString(new Date(Date.UTC(targetYear, targetMonth, day)));
}

export function trialEndDate(startDate: string): string {
  return addDaysStr(startDate, MEMBERSHIP_CONFIG.trialDays);
}

export function monthlyEndDate(startDate: string, months: number): string {
  return addCalendarMonths(startDate, months);
}

export function daysRemaining(accessEndAt: string, today = todayKST()): number {
  const end = parseDateOnly(accessEndAt);
  const start = parseDateOnly(today);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export type MembershipStatus = "pending" | "active" | "suspended" | "expired" | null;

export interface MembershipLike {
  membership_status: MembershipStatus;
  unlimited: boolean;
  access_end_at: string | null;
}

/** True membership status right now, independent of whether a nightly job has flipped the DB flag yet. */
export function effectiveStatus(m: MembershipLike, today = todayKST()): MembershipStatus {
  if (m.unlimited) return "active";
  if (m.membership_status === "active" && m.access_end_at && compareDateStr(m.access_end_at, today) < 0) {
    return "expired";
  }
  return m.membership_status;
}

export function isEffectivelyActive(m: MembershipLike, today = todayKST()): boolean {
  return effectiveStatus(m, today) === "active";
}

/** Display label for remaining time, e.g. "D-7", "오늘 종료", "기간 종료", "무제한". */
export function remainingLabel(m: MembershipLike, today = todayKST()): string {
  if (m.unlimited) return "무제한";
  if (!m.access_end_at) return "-";
  const remaining = daysRemaining(m.access_end_at, today);
  if (remaining < 0) return "기간 종료";
  if (remaining === 0) return "오늘 종료";
  return `D-${remaining}`;
}
