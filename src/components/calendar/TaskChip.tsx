"use client";

import { workTypeAbbr } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/lib/types";

const CHIP_STYLE: Record<TaskStatus, string> = {
  예정: "border border-neutral-300 bg-white text-neutral-700",
  진행중: "bg-black text-white font-medium",
  완료: "bg-neutral-100 text-neutral-400 line-through",
  보류: "border border-dashed border-neutral-400 bg-white text-neutral-600",
  드랍: "bg-neutral-50 text-neutral-300",
};

export function TaskChip({ task, onClick }: { task: Task; onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn("w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] leading-tight", CHIP_STYLE[task.status])}
      title={task.title}
    >
      <span className="opacity-60">{workTypeAbbr(task.work_type)}</span> {task.title}
    </button>
  );
}
