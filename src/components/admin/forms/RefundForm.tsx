"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatKRW } from "@/lib/membership/config";
import type { PaymentRecord } from "@/lib/types";

interface RefundFormProps {
  payment: PaymentRecord;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (payload: {
    refundAmount: number;
    refundType: "full" | "partial";
    periodAdjustment: "keep" | "adjust" | "immediate_end";
    newAccessEndAt?: string;
    memo: string;
  }) => void;
}

export function RefundForm({ payment, busy, onCancel, onSubmit }: RefundFormProps) {
  const remaining = (payment.paid_amount ?? 0) - payment.refunded_amount;
  const [refundType, setRefundType] = useState<"full" | "partial">("full");
  const [amount, setAmount] = useState(remaining);
  const [periodAdjustment, setPeriodAdjustment] = useState<"keep" | "adjust" | "immediate_end">("keep");
  const [newEndDate, setNewEndDate] = useState("");
  const [memo, setMemo] = useState("");

  const effectiveAmount = refundType === "full" ? remaining : amount;
  const canSubmit = effectiveAmount > 0 && effectiveAmount <= remaining && memo.trim() && (periodAdjustment !== "adjust" || !!newEndDate);

  return (
    <div className="rounded-md border border-neutral-200 p-3">
      <p className="mb-2 text-xs font-semibold text-neutral-600">환불/취소 · 결제금액 {formatKRW(payment.paid_amount ?? 0)} (환불 가능 {formatKRW(remaining)})</p>
      <div className="flex flex-col gap-3">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setRefundType("full")}
            className={"flex-1 rounded-md border px-2 py-1.5 text-xs " + (refundType === "full" ? "border-black bg-black text-white" : "border-neutral-300 text-neutral-600")}
          >
            전액환불
          </button>
          <button
            type="button"
            onClick={() => setRefundType("partial")}
            className={"flex-1 rounded-md border px-2 py-1.5 text-xs " + (refundType === "partial" ? "border-black bg-black text-white" : "border-neutral-300 text-neutral-600")}
          >
            부분환불
          </button>
        </div>
        {refundType === "partial" && (
          <label className="block">
            <span className="mb-1 block text-[11px] text-neutral-500">환불금액</span>
            <input type="number" value={amount} max={remaining} onChange={(e) => setAmount(Number(e.target.value))} className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-black" />
          </label>
        )}

        <label className="block">
          <span className="mb-1 block text-[11px] text-neutral-500">이용기간 처리</span>
          <select value={periodAdjustment} onChange={(e) => setPeriodAdjustment(e.target.value as typeof periodAdjustment)} className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-black">
            <option value="keep">환불만, 기간 유지</option>
            <option value="adjust">환불 + 기간 조정</option>
            <option value="immediate_end">환불 + 즉시 이용종료</option>
          </select>
        </label>

        {periodAdjustment === "adjust" && (
          <label className="block">
            <span className="mb-1 block text-[11px] text-neutral-500">새 종료일</span>
            <input type="date" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-black" />
          </label>
        )}

        <label className="block">
          <span className="mb-1 block text-[11px] text-neutral-500">관리자 메모 (필수)</span>
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} className="w-full resize-none rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-black" />
        </label>

        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={onCancel} disabled={busy}>
            취소
          </Button>
          <Button
            type="button"
            size="sm"
            variant="danger"
            disabled={busy || !canSubmit}
            onClick={() =>
              onSubmit({
                refundAmount: effectiveAmount,
                refundType,
                periodAdjustment,
                newAccessEndAt: periodAdjustment === "adjust" ? newEndDate : undefined,
                memo,
              })
            }
          >
            환불 처리
          </Button>
        </div>
      </div>
    </div>
  );
}
