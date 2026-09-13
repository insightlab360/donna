"use client";

import { formatMonthDayKR } from "@/lib/date";
import { formatKRW } from "@/lib/membership/config";
import { paymentStatusLabel, roleLabel, statusLabel, usageTypeLabel } from "@/lib/membership/labels";
import { effectiveStatus, remainingLabel } from "@/lib/membership/period";
import { useMemberActions } from "@/lib/useMemberActions";
import type { PaymentRecord, Profile } from "@/lib/types";

interface MemberCardProps {
  profile: Profile;
  latestPayment: PaymentRecord | undefined;
  memo1: string;
  onOpenDetail: () => void;
  onChanged: () => void;
}

const fieldInputClass =
  "w-full rounded-md border border-neutral-300 px-2 py-1 text-xs outline-none focus:border-black disabled:opacity-40";

/** Mobile-width equivalent of MemberRow — a 1080px-wide table can't reflow, so this stacks the same fields/actions as a card instead. */
export function MemberCard({ profile, latestPayment, memo1, onOpenDetail, onChanged }: MemberCardProps) {
  const { busy, post } = useMemberActions(onChanged);
  const status = effectiveStatus(profile);

  function handleMemo1Blur(e: React.FocusEvent<HTMLInputElement>) {
    const value = e.target.value.trim().slice(0, 5);
    if (value === (memo1 ?? "")) return;
    post(`/api/admin/members/${profile.id}/notes`, { memo1: value });
  }

  function handleEndDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (!value) return;
    post(`/api/admin/members/${profile.id}/change-period`, { access_end_at: value });
  }

  function handleToggleSuspend(e: React.MouseEvent) {
    e.stopPropagation();
    const suspending = status === "active";
    if (!window.confirm(suspending ? "이 회원의 이용을 중지할까요?" : "이 회원의 이용을 재개할까요?")) return;
    post(`/api/admin/members/${profile.id}/${suspending ? "suspend" : "resume"}`);
  }

  return (
    <div onClick={onOpenDetail} className="border-b border-neutral-100 px-4 py-3 last:border-b-0 active:bg-neutral-50">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-black">{profile.name ?? "-"}</p>
          <p className="truncate text-xs text-neutral-500">{profile.email}</p>
        </div>
        <span className="shrink-0 rounded border border-neutral-300 px-1.5 py-0.5 text-[10px] text-neutral-500">
          {roleLabel(profile.role)}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <Field label="상태">
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <span className="text-neutral-700">{statusLabel(status)}</span>
            {(status === "active" || status === "suspended") && (
              <button
                onClick={handleToggleSuspend}
                disabled={busy}
                className="shrink-0 rounded border border-neutral-300 px-1.5 py-0.5 text-[10px] text-neutral-500 disabled:opacity-40"
              >
                {status === "active" ? "중지" : "재개"}
              </button>
            )}
          </div>
        </Field>
        <Field label="이용유형">
          <span className="text-neutral-700">{usageTypeLabel(profile, latestPayment)}</span>
        </Field>
        <Field label="시작일">
          <span className="text-neutral-700">{profile.access_start_at ? formatMonthDayKR(profile.access_start_at) : "-"}</span>
        </Field>
        <Field label="남은기간">
          <span className="text-neutral-700">{remainingLabel(profile)}</span>
        </Field>
        <Field label="종료일">
          {profile.unlimited ? (
            <span className="text-neutral-700">-</span>
          ) : status === "active" ? (
            <input
              type="date"
              key={profile.access_end_at ?? "none"}
              defaultValue={profile.access_end_at ?? ""}
              onChange={handleEndDateChange}
              onClick={(e) => e.stopPropagation()}
              disabled={busy}
              className={fieldInputClass}
            />
          ) : (
            <span className="text-neutral-700">{profile.access_end_at ? formatMonthDayKR(profile.access_end_at) : "-"}</span>
          )}
        </Field>
        <Field label="결제상태">
          <span className="text-neutral-700">{latestPayment ? paymentStatusLabel(latestPayment.payment_status) : "-"}</span>
        </Field>
        <Field label="최근결제금액">
          <span className="text-neutral-700">{latestPayment?.paid_amount != null ? formatKRW(latestPayment.paid_amount) : "-"}</span>
        </Field>
        <Field label="메모1">
          <input
            key={memo1}
            defaultValue={memo1}
            maxLength={5}
            onBlur={handleMemo1Blur}
            onClick={(e) => e.stopPropagation()}
            disabled={busy}
            placeholder="-"
            className={fieldInputClass}
          />
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] text-neutral-400">{label}</p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
