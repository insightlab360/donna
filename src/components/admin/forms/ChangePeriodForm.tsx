"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface ChangePeriodFormProps {
  currentStart: string | null;
  currentEnd: string | null;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (payload: { access_start_at?: string; access_end_at: string; note?: string }) => void;
}

export function ChangePeriodForm({ currentStart, currentEnd, busy, onCancel, onSubmit }: ChangePeriodFormProps) {
  const [startDate, setStartDate] = useState(currentStart ?? "");
  const [endDate, setEndDate] = useState(currentEnd ?? "");
  const [note, setNote] = useState("");

  const canSubmit = !!endDate && (!startDate || startDate <= endDate);

  return (
    <div className="rounded-md border border-neutral-200 p-3">
      <p className="mb-2 text-xs font-semibold text-neutral-600">기간변경</p>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[11px] text-neutral-500">시작일</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-black" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-neutral-500">종료일</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-black" />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-[11px] text-neutral-500">메모(선택)</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full resize-none rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-black" />
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={onCancel} disabled={busy}>
            취소
          </Button>
          <Button
            type="button"
            size="sm"
            variant="primary"
            disabled={busy || !canSubmit}
            onClick={() => onSubmit({ access_start_at: startDate || undefined, access_end_at: endDate, note: note || undefined })}
          >
            변경
          </Button>
        </div>
      </div>
    </div>
  );
}
