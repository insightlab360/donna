import type { SupabaseClient } from "@supabase/supabase-js";
import { todayKST } from "@/lib/date";
import { approvalHtml, approvalSubject } from "@/lib/email/membershipTemplates";
import { sendAppEmail } from "@/lib/email/send";
import type {
  InquiryStatus,
  MembershipAction,
  MembershipStatus,
  MemberNote,
  MemberPaymentNote,
  PaymentStatus,
  Profile,
  Role,
} from "@/lib/types";
import { calculatePrice, isValidMonths } from "./config";
import { monthlyEndDate, trialEndDate } from "./period";

type AdminClient = SupabaseClient;

export class MembershipActionError extends Error {}

export interface PaymentInput {
  payment_method: string;
  bank_name?: string | null;
  depositor_name?: string | null;
  paid_at: string;
  paid_amount: number;
  payment_confirmed: boolean;
  memo?: string | null;
}

async function getProfile(admin: AdminClient, userId: string): Promise<Profile> {
  const { data, error } = await admin.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw new MembershipActionError(error.message);
  if (!data) throw new MembershipActionError("회원을 찾을 수 없습니다");
  return data as Profile;
}

async function logHistory(
  admin: AdminClient,
  params: {
    userId: string;
    action: MembershipAction;
    previousStatus: MembershipStatus | null;
    newStatus: MembershipStatus | null;
    previousEndAt: string | null;
    newEndAt: string | null;
    note: string | null;
    performedBy: string;
  }
) {
  await admin.from("membership_history").insert({
    user_id: params.userId,
    action: params.action,
    previous_status: params.previousStatus,
    new_status: params.newStatus,
    previous_end_at: params.previousEndAt,
    new_end_at: params.newEndAt,
    note: params.note,
    performed_by: params.performedBy,
  });
}

async function logAudit(
  admin: AdminClient,
  params: { actorId: string; action: string; targetTable: string; targetId: string; before: unknown; after: unknown }
) {
  await admin.from("audit_logs").insert({
    actor_id: params.actorId,
    action: params.action,
    target_table: params.targetTable,
    target_id: params.targetId,
    before: params.before,
    after: params.after,
  });
}

function validatePayment(months: number, payment: PaymentInput) {
  if (!payment.payment_confirmed) {
    throw new MembershipActionError("결제 확인 완료 체크가 필요합니다");
  }
  if (!payment.payment_method || !payment.paid_at || !payment.paid_amount) {
    throw new MembershipActionError("결제수단, 입금일시, 입금금액을 모두 입력해주세요");
  }
  const expected = calculatePrice(months);
  if (payment.paid_amount !== expected && !payment.memo) {
    throw new MembershipActionError("예상금액과 실제금액이 다릅니다. 관리자 메모를 입력해주세요");
  }
}

export async function approveMembership(
  admin: AdminClient,
  actorId: string,
  targetId: string,
  params: { type: "trial" | "paid"; months?: number; payment?: PaymentInput }
): Promise<Profile> {
  const profile = await getProfile(admin, targetId);
  if (profile.membership_status !== "pending") {
    throw new MembershipActionError("승인 대기 상태의 회원만 승인할 수 있습니다");
  }

  const today = todayKST();
  let accessEndAt: string;
  let expectedAmount: number | null = null;

  if (params.type === "trial") {
    if (profile.trial_used) throw new MembershipActionError("이미 무료체험을 사용했습니다");
    accessEndAt = trialEndDate(today);
  } else {
    const months = params.months;
    if (!months || !isValidMonths(months)) {
      throw new MembershipActionError("이용기간은 1~24개월 사이여야 합니다");
    }
    if (!params.payment) throw new MembershipActionError("결제 정보가 필요합니다");
    validatePayment(months, params.payment);
    expectedAmount = calculatePrice(months);
    accessEndAt = monthlyEndDate(today, months);
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      membership_status: "active",
      access_start_at: today,
      access_end_at: accessEndAt,
      trial_used: params.type === "trial" ? true : profile.trial_used,
    })
    .eq("id", targetId);
  if (updateError) throw new MembershipActionError(updateError.message);

  if (params.type === "trial") {
    await admin.from("payment_history").insert({
      user_id: targetId,
      is_trial: true,
      payment_status: "not_required" as PaymentStatus,
    });
  } else {
    await admin.from("payment_history").insert({
      user_id: targetId,
      is_trial: false,
      months: params.months,
      payment_method: params.payment!.payment_method,
      bank_name: params.payment!.bank_name ?? null,
      depositor_name: params.payment!.depositor_name ?? null,
      paid_at: params.payment!.paid_at,
      expected_amount: expectedAmount,
      paid_amount: params.payment!.paid_amount,
      payment_status: "paid" as PaymentStatus,
      memo: params.payment!.memo ?? null,
      confirmed_by: actorId,
      confirmed_at: new Date().toISOString(),
    });
  }

  await logHistory(admin, {
    userId: targetId,
    action: "approve",
    previousStatus: profile.membership_status,
    newStatus: "active",
    previousEndAt: profile.access_end_at,
    newEndAt: accessEndAt,
    note: params.type === "trial" ? "무료체험 승인" : `유료 승인 (${params.months}개월)`,
    performedBy: actorId,
  });

  const updated = await getProfile(admin, targetId);
  await logAudit(admin, { actorId, action: "approve_membership", targetTable: "profiles", targetId, before: profile, after: updated });

  await sendAppEmail({
    to: profile.email,
    subject: approvalSubject(),
    html: approvalHtml({ name: profile.name, isTrial: params.type === "trial", startDate: today, endDate: accessEndAt }),
  }).catch(() => {});

  return updated;
}

export async function extendMembership(
  admin: AdminClient,
  actorId: string,
  targetId: string,
  params: { months: number; payment?: PaymentInput; waived?: boolean; note?: string }
): Promise<Profile> {
  const profile = await getProfile(admin, targetId);
  if (profile.membership_status !== "active" && profile.membership_status !== "expired") {
    throw new MembershipActionError("이용중이거나 만료된 회원만 연장할 수 있습니다");
  }
  if (!isValidMonths(params.months)) {
    throw new MembershipActionError("이용기간은 1~24개월 사이여야 합니다");
  }

  const expectedAmount = calculatePrice(params.months);
  if (!params.waived) {
    if (!params.payment) throw new MembershipActionError("결제 정보가 필요합니다");
    validatePayment(params.months, params.payment);
  }

  const today = todayKST();
  const isExpired = profile.membership_status === "expired";
  const newStart = isExpired ? today : (profile.access_start_at ?? today);
  const baseDate = isExpired ? today : profile.access_end_at ?? today;
  const newEnd = monthlyEndDate(baseDate, params.months);

  const { error: updateError } = await admin
    .from("profiles")
    .update({ membership_status: "active", access_start_at: newStart, access_end_at: newEnd })
    .eq("id", targetId);
  if (updateError) throw new MembershipActionError(updateError.message);

  await admin.from("payment_history").insert({
    user_id: targetId,
    is_trial: false,
    months: params.months,
    payment_method: params.payment?.payment_method ?? null,
    bank_name: params.payment?.bank_name ?? null,
    depositor_name: params.payment?.depositor_name ?? null,
    paid_at: params.payment?.paid_at ?? null,
    expected_amount: expectedAmount,
    paid_amount: params.payment?.paid_amount ?? 0,
    payment_status: (params.waived ? "waived" : "paid") as PaymentStatus,
    memo: params.payment?.memo ?? (params.waived ? params.note ?? null : null),
    confirmed_by: actorId,
    confirmed_at: new Date().toISOString(),
  });

  await logHistory(admin, {
    userId: targetId,
    action: "extend",
    previousStatus: profile.membership_status,
    newStatus: "active",
    previousEndAt: profile.access_end_at,
    newEndAt: newEnd,
    note: params.note ?? `${isExpired ? "재승인" : "연장"} (${params.months}개월)`,
    performedBy: actorId,
  });

  const updated = await getProfile(admin, targetId);
  await logAudit(admin, { actorId, action: "extend_membership", targetTable: "profiles", targetId, before: profile, after: updated });
  return updated;
}

export async function changePeriod(
  admin: AdminClient,
  actorId: string,
  targetId: string,
  params: { access_start_at?: string; access_end_at: string; note?: string }
): Promise<Profile> {
  const profile = await getProfile(admin, targetId);

  const { error } = await admin
    .from("profiles")
    .update({
      access_start_at: params.access_start_at ?? profile.access_start_at,
      access_end_at: params.access_end_at,
      unlimited: false,
    })
    .eq("id", targetId);
  if (error) throw new MembershipActionError(error.message);

  await logHistory(admin, {
    userId: targetId,
    action: "change_period",
    previousStatus: profile.membership_status,
    newStatus: profile.membership_status,
    previousEndAt: profile.access_end_at,
    newEndAt: params.access_end_at,
    note: params.note ?? "관리자 기간 변경",
    performedBy: actorId,
  });

  const updated = await getProfile(admin, targetId);
  await logAudit(admin, { actorId, action: "change_period", targetTable: "profiles", targetId, before: profile, after: updated });
  return updated;
}

export async function setSuspended(
  admin: AdminClient,
  actorId: string,
  targetId: string,
  suspended: boolean,
  note?: string
): Promise<Profile> {
  const profile = await getProfile(admin, targetId);
  if (suspended && profile.membership_status !== "active") {
    throw new MembershipActionError("이용중인 회원만 중지할 수 있습니다");
  }
  if (!suspended && profile.membership_status !== "suspended") {
    throw new MembershipActionError("중지된 회원만 재개할 수 있습니다");
  }

  const newStatus: MembershipStatus = suspended ? "suspended" : "active";
  const { error } = await admin.from("profiles").update({ membership_status: newStatus }).eq("id", targetId);
  if (error) throw new MembershipActionError(error.message);

  await logHistory(admin, {
    userId: targetId,
    action: suspended ? "suspend" : "resume",
    previousStatus: profile.membership_status,
    newStatus,
    previousEndAt: profile.access_end_at,
    newEndAt: profile.access_end_at,
    note: note ?? null,
    performedBy: actorId,
  });

  const updated = await getProfile(admin, targetId);
  await logAudit(admin, {
    actorId,
    action: suspended ? "suspend_membership" : "resume_membership",
    targetTable: "profiles",
    targetId,
    before: profile,
    after: updated,
  });
  return updated;
}

export async function setUnlimited(
  admin: AdminClient,
  actorId: string,
  targetId: string,
  params: { unlimited: boolean; access_end_at?: string; months?: number }
): Promise<Profile> {
  const profile = await getProfile(admin, targetId);
  const today = todayKST();

  if (params.unlimited) {
    const { error } = await admin
      .from("profiles")
      .update({ unlimited: true, membership_status: "active", access_start_at: profile.access_start_at ?? today, access_end_at: null })
      .eq("id", targetId);
    if (error) throw new MembershipActionError(error.message);

    await logHistory(admin, {
      userId: targetId,
      action: "unlimited_grant",
      previousStatus: profile.membership_status,
      newStatus: "active",
      previousEndAt: profile.access_end_at,
      newEndAt: null,
      note: "무제한 전환",
      performedBy: actorId,
    });
  } else {
    let newEnd = params.access_end_at ?? null;
    if (!newEnd) {
      if (!params.months || !isValidMonths(params.months)) {
        throw new MembershipActionError("무제한 해제 시 새 이용기간(종료일 또는 개월 수)이 필요합니다");
      }
      newEnd = monthlyEndDate(today, params.months);
    }

    const { error } = await admin
      .from("profiles")
      .update({ unlimited: false, membership_status: "active", access_start_at: today, access_end_at: newEnd })
      .eq("id", targetId);
    if (error) throw new MembershipActionError(error.message);

    await logHistory(admin, {
      userId: targetId,
      action: "unlimited_revoke",
      previousStatus: profile.membership_status,
      newStatus: "active",
      previousEndAt: null,
      newEndAt: newEnd,
      note: "무제한 해제",
      performedBy: actorId,
    });
  }

  const updated = await getProfile(admin, targetId);
  await logAudit(admin, {
    actorId,
    action: params.unlimited ? "grant_unlimited" : "revoke_unlimited",
    targetTable: "profiles",
    targetId,
    before: profile,
    after: updated,
  });
  return updated;
}

export async function refundPayment(
  admin: AdminClient,
  actorId: string,
  params: {
    paymentId: string;
    refundAmount: number;
    refundType: "full" | "partial";
    periodAdjustment: "keep" | "adjust" | "immediate_end";
    newAccessEndAt?: string;
    memo: string;
  }
): Promise<void> {
  const { data: payment, error: paymentError } = await admin
    .from("payment_history")
    .select("*")
    .eq("id", params.paymentId)
    .maybeSingle();
  if (paymentError) throw new MembershipActionError(paymentError.message);
  if (!payment) throw new MembershipActionError("결제 내역을 찾을 수 없습니다");

  const paidAmount = payment.paid_amount ?? 0;
  const alreadyRefunded = payment.refunded_amount ?? 0;
  if (alreadyRefunded + params.refundAmount > paidAmount) {
    throw new MembershipActionError("환불 금액이 결제 금액을 초과할 수 없습니다");
  }

  const newRefundedTotal = alreadyRefunded + params.refundAmount;
  const newPaymentStatus: PaymentStatus = newRefundedTotal >= paidAmount ? "refunded" : "partially_refunded";

  const { error: updateError } = await admin
    .from("payment_history")
    .update({ refunded_amount: newRefundedTotal, payment_status: newPaymentStatus })
    .eq("id", params.paymentId);
  if (updateError) throw new MembershipActionError(updateError.message);

  await admin.from("refund_history").insert({
    payment_id: params.paymentId,
    user_id: payment.user_id,
    refund_amount: params.refundAmount,
    refund_type: params.refundType,
    period_adjustment: params.periodAdjustment,
    new_access_end_at: params.newAccessEndAt ?? null,
    memo: params.memo,
    performed_by: actorId,
  });

  if (params.periodAdjustment !== "keep") {
    const profile = await getProfile(admin, payment.user_id);
    const today = todayKST();
    const newEnd = params.periodAdjustment === "immediate_end" ? today : params.newAccessEndAt;
    if (!newEnd) throw new MembershipActionError("조정할 종료일이 필요합니다");

    const newStatus: MembershipStatus = params.periodAdjustment === "immediate_end" ? "expired" : "active";
    await admin.from("profiles").update({ access_end_at: newEnd, membership_status: newStatus }).eq("id", payment.user_id);

    await logHistory(admin, {
      userId: payment.user_id,
      action: "refund_adjust",
      previousStatus: profile.membership_status,
      newStatus,
      previousEndAt: profile.access_end_at,
      newEndAt: newEnd,
      note: `환불(${params.refundType})에 따른 기간 조정: ${params.memo}`,
      performedBy: actorId,
    });
  }

  await logAudit(admin, {
    actorId,
    action: "refund_payment",
    targetTable: "payment_history",
    targetId: params.paymentId,
    before: payment,
    after: { refunded_amount: newRefundedTotal, payment_status: newPaymentStatus },
  });
}

export async function setRole(admin: AdminClient, actorId: string, targetId: string, newRole: Role): Promise<Profile> {
  const profile = await getProfile(admin, targetId);

  if (profile.role === "super_admin" && newRole !== "super_admin") {
    const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "super_admin");
    if ((count ?? 0) <= 1) {
      throw new MembershipActionError("최소 1명의 super_admin이 유지되어야 합니다");
    }
  }

  const { error } = await admin.from("profiles").update({ role: newRole }).eq("id", targetId);
  if (error) throw new MembershipActionError(error.message);

  const actionMap: Record<string, "grant_admin" | "revoke_admin" | "grant_super_admin" | "revoke_super_admin"> = {
    "user->admin": "grant_admin",
    "admin->user": "revoke_admin",
    "admin->super_admin": "grant_super_admin",
    "super_admin->admin": "revoke_super_admin",
    "user->super_admin": "grant_super_admin",
    "super_admin->user": "revoke_super_admin",
  };
  const action = actionMap[`${profile.role}->${newRole}`] ?? (newRole === "user" ? "revoke_admin" : "grant_admin");

  await admin.from("admin_history").insert({
    target_user_id: targetId,
    action,
    previous_role: profile.role,
    new_role: newRole,
    performed_by: actorId,
  });

  const updated = await getProfile(admin, targetId);
  await logAudit(admin, { actorId, action: "set_role", targetTable: "profiles", targetId, before: profile, after: updated });
  return updated;
}

export async function applyForMembership(admin: AdminClient, userId: string): Promise<Profile> {
  const profile = await getProfile(admin, userId);
  if (profile.membership_status !== null) {
    throw new MembershipActionError("이미 이용신청이 완료되었습니다");
  }

  const { error } = await admin
    .from("profiles")
    .update({ membership_status: "pending", applied_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new MembershipActionError(error.message);

  await logHistory(admin, {
    userId,
    action: "apply",
    previousStatus: null,
    newStatus: "pending",
    previousEndAt: null,
    newEndAt: null,
    note: "이용신청",
    performedBy: userId,
  });

  return getProfile(admin, userId);
}

export async function upsertMemberNote(
  admin: AdminClient,
  actorId: string,
  targetId: string,
  params: { memo1: string }
): Promise<MemberNote> {
  const memo1 = params.memo1.trim();
  if (memo1.length > 5) throw new MembershipActionError("메모1은 5자 이내로 입력해주세요");

  const { data, error } = await admin
    .from("member_notes")
    .upsert({ user_id: targetId, memo1: memo1 || null, updated_by: actorId }, { onConflict: "user_id" })
    .select()
    .single();
  if (error) throw new MembershipActionError(error.message);

  await logAudit(admin, {
    actorId,
    action: "update_member_note",
    targetTable: "member_notes",
    targetId,
    before: null,
    after: data,
  });

  return data as MemberNote;
}

export async function addMemberPaymentNote(
  admin: AdminClient,
  actorId: string,
  targetId: string,
  content: string
): Promise<MemberPaymentNote> {
  const trimmed = content.trim();
  if (!trimmed) throw new MembershipActionError("결제내역 메모를 입력해주세요");
  if (trimmed.length > 30) throw new MembershipActionError("결제내역 메모는 30자 이내로 입력해주세요");

  const { data, error } = await admin
    .from("member_payment_notes")
    .insert({ user_id: targetId, content: trimmed, created_by: actorId })
    .select()
    .single();
  if (error) throw new MembershipActionError(error.message);

  return data as MemberPaymentNote;
}

export async function setInquiryStatus(
  admin: AdminClient,
  actorId: string,
  inquiryId: string,
  status: InquiryStatus
): Promise<void> {
  const { error } = await admin.from("support_inquiries").update({ status }).eq("id", inquiryId);
  if (error) throw new MembershipActionError(error.message);

  await logAudit(admin, {
    actorId,
    action: "set_inquiry_status",
    targetTable: "support_inquiries",
    targetId: inquiryId,
    before: null,
    after: { status },
  });
}
