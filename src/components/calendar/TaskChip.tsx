"use client";

import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/lib/types";

/** Status shown by shade alone (no border style, strikethrough, or weight change) — white through gray as work progresses. */
export const CHIP_STYLE: Record<TaskStatus, string> = {
  예정: "border border-neutral-200 bg-white text-neutral-700",
  진행중: "border border-neutral-100 bg-neutral-100 text-neutral-700",
  완료: "border border-neutral-300 bg-neutral-300 text-neutral-700",
  보류: "border border-neutral-200 bg-neutral-200 text-neutral-600",
  드랍: "border border-neutral-50 bg-neutral-50 text-neutral-300",
};

export function TaskChip({ task, onClick }: { task: Task; onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "block max-h-[2.6em] w-full overflow-hidden break-words rounded px-0.5 py-0.5 text-left text-[10px] leading-[1.3]",
        CHIP_STYLE[task.status]
      )}
      title={task.title}
    >
      {task.title}
    </button>
  );
}
