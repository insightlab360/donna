"use client";

import { useEffect, useState } from "react";
import { formatMonthDayKR } from "@/lib/date";
import { MEMBERSHIP_CONFIG, formatKRW } from "@/lib/membership/config";
import { effectiveStatus, remainingLabel } from "@/lib/membership/period";
import { statusLabel } from "@/lib/membership/labels";
import type { MyPaymentRecord, Profile } from "@/lib/types";

export function MyMembershipCard({ profile }: { profile: Profile }) {
  const [payments, setPayments] = useState<MyPaymentRecord[] | null>(null);

  useEffect(() => {
    fetch("/api/me/payment-history")
      .then((res) => res.json())
      .then((data) => setPayments(data.payments ?? []))
      .catch(() => setPayments([]));
  }, []);

  const status = effectiveStatus(profile);
  const latest = payments?.[0];
  const usageType = profile.unlimited ? "무제한" : latest?.is_trial ? "무료체험" : latest ? "유료" : "-";
  const totalPaid = payments?.reduce((sum, p) => sum + (p.paid_amount ?? 0) - (p.refunded_amount ?? 0), 0) ?? 0;

  return (
    <section className="mb-4 rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-black">내 이용정보</h2>
      <dl className="grid grid-cols-2 gap-y-2 text-sm">
        <Row label="이용상태" value={statusLabel(status)} />
        <Row label="이용유형" value={usageType} />
        <Row label="시작일" value={profile.access_start_at ? formatMonthDayKR(profile.access_start_at) : "-"} />
        <Row label="종료일" value={profile.unlimited ? "-" : profile.access_end_at ? formatMonthDayKR(profile.access_end_at) : "-"} />
        <Row label="남은기간" value={remainingLabel(profile)} />
        {!profile.unlimited && <Row label="이용개월" value={latest?.months ? `${latest.months}개월` : "-"} />}
        <Row label="월 이용료" value={formatKRW(MEMBERSHIP_CONFIG.monthlyPrice)} />
        <Row label="총 이용료" value={payments ? formatKRW(totalPaid) : "-"} />
        <Row label="최근 결제일" value={latest?.paid_at ? formatMonthDayKR(latest.paid_at.slice(0, 10)) : "-"} />
        <Row label="최근 결제금액" value={latest?.paid_amount != null ? formatKRW(latest.paid_amount) : "-"} />
        <Row label="무료체험 사용여부" value={profile.trial_used ? "사용함" : "사용 안 함"} />
      </dl>

      {payments && payments.length > 0 && (
        <div className="mt-4 border-t border-neutral-100 pt-3">
          <p className="mb-2 text-xs font-semibold text-neutral-600">내 결제이력</p>
          <div className="flex flex-col gap-1.5">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-xs text-neutral-500">
                <span>{p.is_trial ? "무료체험" : p.months ? `${p.months}개월 결제` : "결제"}</span>
                <span>{p.paid_amount != null ? formatKRW(p.paid_amount) : "-"}</span>
                <span>{p.paid_at ? formatMonthDayKR(p.paid_at.slice(0, 10)) : formatMonthDayKR(p.created_at.slice(0, 10))}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-neutral-500">{label}</dt>
      <dd className="text-right font-medium text-black">{value}</dd>
    </>
  );
}
