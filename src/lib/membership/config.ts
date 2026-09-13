/**
 * Single source of truth for membership pricing/policy. Every price
 * calculation, admin display, email, and validation must read from here —
 * never hardcode a price or duration limit elsewhere.
 */
export const MEMBERSHIP_CONFIG = {
  monthlyPrice: 3000,
  trialDays: 7,
  minMonths: 1,
  maxMonths: 24,
  currency: "KRW",
} as const;

export function calculatePrice(months: number): number {
  return MEMBERSHIP_CONFIG.monthlyPrice * months;
}

export function isValidMonths(months: number): boolean {
  return Number.isInteger(months) && months >= MEMBERSHIP_CONFIG.minMonths && months <= MEMBERSHIP_CONFIG.maxMonths;
}

export function formatKRW(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}
