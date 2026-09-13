export const WORK_TYPES = ["개인", "회사", "개인프로젝트"] as const;
export type WorkType = (typeof WORK_TYPES)[number];

export const TASK_STATUSES = ["예정", "진행중", "완료", "보류", "드랍"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PROJECT_STATUSES = ["예정", "진행중", "완료", "보류", "드랍"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const DATE_MODES = ["date", "datetime", "date_range", "datetime_range", "none"] as const;
export type DateMode = (typeof DATE_MODES)[number];

export interface Project {
  id: string;
  user_id: string;
  name: string;
  work_type: WorkType;
  start_date: string | null;
  end_date: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  work_type: WorkType;
  title: string;
  project_id: string | null;
  date_mode: DateMode;
  start_date: string | null;
  start_time: string | null;
  end_date: string | null;
  end_time: string | null;
  due_date: string | null;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
}

export type TaskInput = Omit<Task, "id" | "user_id" | "due_date" | "created_at" | "updated_at">;

export interface ProjectInput {
  name: string;
  work_type: WorkType;
  start_date: string | null;
  end_date: string | null;
  status: ProjectStatus;
}

export interface ProjectStats {
  total: number;
  scheduled: number;
  inProgress: number;
  done: number;
  onHold: number;
  dropped: number;
  progress: number;
  incompleteTasks: Task[];
}

/** Free-text progress log the user keeps on a task/project — accumulates over time, never overwritten. */
export interface TaskNote {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectNote {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationLog {
  id: string;
  user_id: string;
  notification_date: string;
  kind: "daily_digest" | "expiry_warning";
  sent_at: string | null;
  status: "sent" | "skipped" | "failed";
  task_count: number;
}

// ---------------------------------------------------------------------------
// Membership / admin / payment / support
// ---------------------------------------------------------------------------

export const ROLES = ["user", "admin", "super_admin"] as const;
export type Role = (typeof ROLES)[number];

export const MEMBERSHIP_STATUSES = ["pending", "active", "suspended", "expired"] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  membership_status: MembershipStatus | null;
  unlimited: boolean;
  access_start_at: string | null;
  access_end_at: string | null;
  trial_used: boolean;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
}

export const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "cancelled",
  "refunded",
  "partially_refunded",
  "not_required",
  "waived",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface PaymentRecord {
  id: string;
  user_id: string;
  is_trial: boolean;
  months: number | null;
  payment_method: string | null;
  bank_name: string | null;
  depositor_name: string | null;
  paid_at: string | null;
  expected_amount: number | null;
  paid_amount: number | null;
  refunded_amount: number;
  payment_status: PaymentStatus;
  memo: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Sanitized shape returned to the owning user — never includes memo/confirmed_by. */
export type MyPaymentRecord = Omit<PaymentRecord, "memo" | "confirmed_by" | "user_id">;

export const MEMBERSHIP_ACTIONS = [
  "apply",
  "approve",
  "extend",
  "change_period",
  "unlimited_grant",
  "unlimited_revoke",
  "suspend",
  "resume",
  "refund_adjust",
  "expire",
] as const;
export type MembershipAction = (typeof MEMBERSHIP_ACTIONS)[number];

export interface MembershipHistoryEntry {
  id: string;
  user_id: string;
  action: MembershipAction;
  previous_status: MembershipStatus | null;
  new_status: MembershipStatus | null;
  previous_end_at: string | null;
  new_end_at: string | null;
  note: string | null;
  performed_by: string | null;
  created_at: string;
}

export interface RefundHistoryEntry {
  id: string;
  payment_id: string;
  user_id: string;
  refund_amount: number;
  refund_type: "full" | "partial";
  period_adjustment: "keep" | "adjust" | "immediate_end";
  new_access_end_at: string | null;
  memo: string | null;
  performed_by: string | null;
  created_at: string;
}

export interface AdminHistoryEntry {
  id: string;
  target_user_id: string;
  action: "grant_admin" | "revoke_admin" | "grant_super_admin" | "revoke_super_admin";
  previous_role: Role | null;
  new_role: Role | null;
  performed_by: string | null;
  created_at: string;
}

export const INQUIRY_CATEGORIES = ["이용신청", "결제", "이용기간", "이용중지", "환불", "기타"] as const;
export type InquiryCategory = (typeof INQUIRY_CATEGORIES)[number];

export const INQUIRY_STATUSES = ["pending", "answered", "closed"] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export interface SupportInquiry {
  id: string;
  user_id: string;
  category: InquiryCategory;
  subject: string;
  message: string;
  status: InquiryStatus;
  admin_reply: string | null;
  replied_at: string | null;
  replied_by: string | null;
  created_at: string;
}

/** Admin-only per-member note. Never exposed to the member themselves (separate table, no owner-select RLS policy). */
export interface MemberNote {
  user_id: string;
  memo1: string | null;
  updated_by: string | null;
  updated_at: string;
}

/** Admin-only, append-only log of confirmed-payment notes per member (never overwritten). */
export interface MemberPaymentNote {
  id: string;
  user_id: string;
  content: string;
  created_by: string | null;
  created_at: string;
}
