"use client";

import type { WorkType } from "@/lib/types";

export type WorkTypeFilterValue = WorkType | "all";

const OPTIONS: { key: WorkTypeFilterValue; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "회사", label: "회사" },
  { key: "개인프로젝트", label: "개인프로젝트" },
  { key: "개인", label: "개인" },
];

/** True if `workType` should show under the given filter — "all" always matches. */
export function matchesWorkTypeFilter(workType: WorkType, filter: WorkTypeFilterValue): boolean {
  return filter === "all" || workType === filter;
}

/** 전체/회사/개인프로젝트/개인 toggle — shared by 오늘, 캘린더, and Task so "업무 종류별 보기" behaves identically everywhere. */
export function WorkTypeFilterBar({ value, onChange }: { value: WorkTypeFilterValue; onChange: (value: WorkTypeFilterValue) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
            (value === o.key ? "border-black bg-black text-white" : "border-neutral-300 text-neutral-600 hover:bg-neutral-50")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
