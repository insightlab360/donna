"use client";

import { formatMonthDayKR } from "@/lib/date";
import { formatKRW } from "@/lib/membership/config";
import { paymentStatusLabel, roleLabel, statusLabel, usageTypeLabel } from "@/lib/membership/labels";
import { effectiveStatus, remainingLabel } from "@/lib/membership/period";
import { useMemberActions } from "@/lib/useMemberActions";
import type { PaymentRecord, Profile } from "@/lib/types";

interface MemberRowProps {
  profile: Profile;
  latestPayment: PaymentRecord | undefined;
  memo1: string;
  onOpenDetail: () => void;
  onChanged: () => void;
}

const inlineFieldClass =
  "rounded border border-transparent px-1 py-0.5 text-xs outline-none hover:border-neutral-300 focus:border-black disabled:opacity-40";

export function MemberRow({ profile, latestPayment, memo1, onOpenDetail, onChanged }: MemberRowProps) {
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
    <tr onClick={onOpenDetail} className="cursor-pointer border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50">
      <td className="px-3 py-2.5 font-medium text-black">{profile.name ?? "-"}</td>
      <td className="px-3 py-2.5 text-neutral-600">{profile.email}</td>
      <td className="px-3 py-2.5 text-neutral-600">{roleLabel(profile.role)}</td>
      <td className="px-3 py-2.5 text-neutral-600">
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <span>{statusLabel(status)}</span>
          {(status === "active" || status === "suspended") && (
            <button
              onClick={handleToggleSuspend}
              disabled={busy}
              className="shrink-0 rounded border border-neutral-300 px-1.5 py-0.5 text-[10px] text-neutral-500 hover:bg-neutral-100 disabled:opacity-40"
            >
              {status === "active" ? "중지" : "재개"}
            </button>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5 text-neutral-600">{usageTypeLabel(profile, latestPayment)}</td>
      <td className="px-3 py-2.5 text-neutral-600">{profile.access_start_at ? formatMonthDayKR(profile.access_start_at) : "-"}</td>
      <td className="px-3 py-2.5 text-neutral-600" onClick={(e) => e.stopPropagation()}>
        {profile.unlimited ? (
          "-"
        ) : status === "active" ? (
          <input
            type="date"
            key={profile.access_end_at ?? "none"}
            defaultValue={profile.access_end_at ?? ""}
            onChange={handleEndDateChange}
            disabled={busy}
            className={`${inlineFieldClass} w-[120px]`}
          />
        ) : profile.access_end_at ? (
          formatMonthDayKR(profile.access_end_at)
        ) : (
          "-"
        )}
      </td>
      <td className="px-3 py-2.5 text-neutral-600">{remainingLabel(profile)}</td>
      <td className="px-3 py-2.5 text-neutral-600">{latestPayment ? paymentStatusLabel(latestPayment.payment_status) : "-"}</td>
      <td className="px-3 py-2.5 text-neutral-600">{latestPayment?.paid_amount != null ? formatKRW(latestPayment.paid_amount) : "-"}</td>
      <td className="px-3 py-2.5 text-neutral-600" onClick={(e) => e.stopPropagation()}>
        <input
          key={memo1}
          defaultValue={memo1}
          maxLength={5}
          onBlur={handleMemo1Blur}
          disabled={busy}
          placeholder="-"
          className={`${inlineFieldClass} w-[64px]`}
        />
      </td>
    </tr>
  );
}
