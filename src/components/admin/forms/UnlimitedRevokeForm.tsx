"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { MEMBERSHIP_CONFIG } from "@/lib/membership/config";

interface UnlimitedRevokeFormProps {
  busy: boolean;
  onCancel: () => void;
  onSubmit: (payload: { months?: number; access_end_at?: string }) => void;
}

export function UnlimitedRevokeForm({ busy, onCancel, onSubmit }: UnlimitedRevokeFormProps) {
  const [mode, setMode] = useState<"months" | "date">("months");
  const [months, setMonths] = useState(1);
  const [endDate, setEndDate] = useState("");

  const canSubmit = mode === "months" ? months >= MEMBERSHIP_CONFIG.minMonths : !!endDate;

  return (
    <div className="rounded-md border border-neutral-200 p-3">
      <p className="mb-2 text-xs font-semibold text-neutral-600">무제한 해제 — 새 이용기간 필요</p>
      <div className="flex flex-col gap-3">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setMode("months")}
            className={"flex-1 rounded-md border px-2 py-1.5 text-xs " + (mode === "months" ? "border-black bg-black text-white" : "border-neutral-300 text-neutral-600")}
          >
            개월 수로 설정
          </button>
          <button
            type="button"
            onClick={() => setMode("date")}
            className={"flex-1 rounded-md border px-2 py-1.5 text-xs " + (mode === "date" ? "border-black bg-black text-white" : "border-neutral-300 text-neutral-600")}
          >
            종료일 직접 입력
          </button>
        </div>
        {mode === "months" ? (
          <label className="block">
            <span className="mb-1 block text-[11px] text-neutral-500">오늘부터 개월 수</span>
            <input
              type="number"
              min={MEMBERSHIP_CONFIG.minMonths}
              max={MEMBERSHIP_CONFIG.maxMonths}
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-black"
            />
          </label>
        ) : (
          <label className="block">
            <span className="mb-1 block text-[11px] text-neutral-500">종료일</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-black" />
          </label>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={onCancel} disabled={busy}>
            취소
          </Button>
          <Button
            type="button"
            size="sm"
            variant="primary"
            disabled={busy || !canSubmit}
            onClick={() => onSubmit(mode === "months" ? { months } : { access_end_at: endDate })}
          >
            해제
          </Button>
        </div>
      </div>
    </div>
  );
}
