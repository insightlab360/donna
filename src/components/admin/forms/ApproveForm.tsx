"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { MEMBERSHIP_CONFIG, calculatePrice, formatKRW } from "@/lib/membership/config";
import { todayKST } from "@/lib/date";

interface ApproveFormProps {
  trialUsed: boolean;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (payload: {
    type: "trial" | "paid";
    months?: number;
    payment?: {
      payment_method: string;
      bank_name?: string;
      depositor_name?: string;
      paid_at: string;
      paid_amount: number;
      payment_confirmed: boolean;
      memo?: string;
    };
  }) => void;
}

export function ApproveForm({ trialUsed, busy, onCancel, onSubmit }: ApproveFormProps) {
  const [type, setType] = useState<"trial" | "paid">(trialUsed ? "paid" : "trial");
  const [months, setMonths] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("계좌이체");
  const [bankName, setBankName] = useState("");
  const [depositorName, setDepositorName] = useState("");
  const [paidAt, setPaidAt] = useState(todayKST());
  const [paidAmount, setPaidAmount] = useState(calculatePrice(1));
  const [confirmed, setConfirmed] = useState(false);
  const [memo, setMemo] = useState("");

  const expected = calculatePrice(months);
  const amountMismatch = type === "paid" && paidAmount !== expected;
  const canSubmit =
    type === "trial" ||
    (paymentMethod.trim() && paidAt && paidAmount > 0 && confirmed && (!amountMismatch || memo.trim()));

  return (
    <div className="rounded-md border border-neutral-200 p-3">
      <p className="mb-2 text-xs font-semibold text-neutral-600">승인</p>
      <div className="flex flex-col gap-3">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setType("trial")}
            disabled={trialUsed}
            className={
              "flex-1 rounded-md border px-2 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40 " +
              (type === "trial" ? "border-black bg-black text-white" : "border-neutral-300 text-neutral-600")
            }
          >
            무료체험 ({MEMBERSHIP_CONFIG.trialDays}일)
          </button>
          <button
            type="button"
            onClick={() => setType("paid")}
            className={
              "flex-1 rounded-md border px-2 py-1.5 text-xs " +
              (type === "paid" ? "border-black bg-black text-white" : "border-neutral-300 text-neutral-600")
            }
          >
            유료
          </button>
        </div>
        {trialUsed && type === "trial" && <p className="text-xs text-red-600">이미 무료체험을 사용한 회원입니다.</p>}

        {type === "paid" && (
          <>
            <label className="block">
              <span className="mb-1 block text-[11px] text-neutral-500">이용기간(개월)</span>
              <input
                type="number"
                min={MEMBERSHIP_CONFIG.minMonths}
                max={MEMBERSHIP_CONFIG.maxMonths}
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
                className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-black"
              />
              <span className="mt-1 block text-[11px] text-neutral-400">예상금액 {formatKRW(expected)}</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-[11px] text-neutral-500">결제수단</span>
                <input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-black" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] text-neutral-500">은행</span>
                <input value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-black" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] text-neutral-500">입금자</span>
                <input value={depositorName} onChange={(e) => setDepositorName(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-black" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] text-neutral-500">입금일시</span>
                <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-black" />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-[11px] text-neutral-500">입금금액</span>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
                className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-black"
              />
            </label>
            {amountMismatch && <p className="text-xs text-amber-600">예상금액과 실제금액이 다릅니다. 관리자 메모를 입력해주세요.</p>}
            <label className="block">
              <span className="mb-1 block text-[11px] text-neutral-500">관리자 메모{amountMismatch ? " (필수)" : " (선택)"}</span>
              <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} className="w-full resize-none rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-black" />
            </label>
            <label className="flex items-center gap-2 text-xs text-neutral-700">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
              결제 확인 완료
            </label>
          </>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={onCancel} disabled={busy}>
            취소
          </Button>
          <Button
            type="button"
            size="sm"
            variant="primary"
            disabled={busy || !canSubmit || (type === "trial" && trialUsed)}
            onClick={() =>
              onSubmit(
                type === "trial"
                  ? { type: "trial" }
                  : {
                      type: "paid",
                      months,
                      payment: {
                        payment_method: paymentMethod,
                        bank_name: bankName || undefined,
                        depositor_name: depositorName || undefined,
                        paid_at: paidAt,
                        paid_amount: paidAmount,
                        payment_confirmed: confirmed,
                        memo: memo || undefined,
                      },
                    }
              )
            }
          >
            승인
          </Button>
        </div>
      </div>
    </div>
  );
}
