import { formatShortDate } from "@/lib/date";
import type { MembershipAction, PaymentRecord, PaymentStatus, Profile, Role } from "@/lib/types";
import { daysRemaining, effectiveStatus } from "./period";

const ROLE_LABELS: Record<Role, string> = {
  super_admin: "소유자",
  admin: "관리자",
  user: "회원",
};

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role] ?? role;
}

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "대기중",
  paid: "결제완료",
  cancelled: "취소됨",
  refunded: "환불완료",
  partially_refunded: "부분환불",
  not_required: "결제불필요",
  waived: "무료제공",
};

export function paymentStatusLabel(status: PaymentStatus): string {
  return PAYMENT_STATUS_LABELS[status] ?? status;
}

const MEMBERSHIP_ACTION_LABELS: Record<MembershipAction, string> = {
  apply: "이용신청",
  approve: "승인",
  extend: "연장",
  change_period: "기간변경",
  unlimited_grant: "무제한 전환",
  unlimited_revoke: "무제한 해제",
  suspend: "이용중지",
  resume: "재개",
  refund_adjust: "환불에 따른 기간조정",
  expire: "자동만료",
};

export function membershipActionLabel(action: MembershipAction): string {
  return MEMBERSHIP_ACTION_LABELS[action] ?? action;
}

export type MemberFilter = "all" | "pending" | "active" | "trial" | "paid" | "expiring" | "expired" | "suspended";

export const MEMBER_FILTERS: { key: MemberFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "pending", label: "대기" },
  { key: "active", label: "이용중" },
  { key: "trial", label: "체험" },
  { key: "paid", label: "유료" },
  { key: "expiring", label: "만료예정" },
  { key: "expired", label: "종료" },
  { key: "suspended", label: "중지" },
];

/** "9/13 – 10/13" style summary of a member's own usage period, or "무제한". Used in nav where every user sees their own state. */
export function periodRangeLabel(profile: Profile): string {
  if (profile.unlimited) return "무제한";
  if (profile.access_start_at && profile.access_end_at) {
    return `${formatShortDate(profile.access_start_at)} – ${formatShortDate(profile.access_end_at)}`;
  }
  return "-";
}

export function usageTypeLabel(profile: Profile, latestPayment: PaymentRecord | undefined): string {
  if (profile.unlimited) return "무제한";
  if (latestPayment?.is_trial) return "체험";
  if (latestPayment) return "유료";
  return "-";
}

export function statusLabel(status: ReturnType<typeof effectiveStatus>): string {
  switch (status) {
    case "pending":
      return "대기";
    case "active":
      return "이용중";
    case "suspended":
      return "중지";
    case "expired":
      return "종료";
    default:
      return "미신청";
  }
}

export function matchesFilter(profile: Profile, latestPayment: PaymentRecord | undefined, filter: MemberFilter): boolean {
  const status = effectiveStatus(profile);
  if (filter === "all") return true;
  if (filter === "pending") return status === "pending";
  if (filter === "suspended") return status === "suspended";
  if (filter === "expired") return status === "expired";
  if (filter === "active") return status === "active";
  if (filter === "trial") return status === "active" && !!latestPayment?.is_trial && !profile.unlimited;
  if (filter === "paid") return status === "active" && !!latestPayment && !latestPayment.is_trial && !profile.unlimited;
  if (filter === "expiring") {
    if (status !== "active" || profile.unlimited || !profile.access_end_at) return false;
    const remaining = daysRemaining(profile.access_end_at);
    return remaining >= 0 && remaining <= 7;
  }
  return true;
}
