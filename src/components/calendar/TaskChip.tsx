"use client";

import { cn } from "@/lib/utils";
import { PRIORITY_TEXT_CLASS, STATUS_CHIP_STYLE as CHIP_STYLE } from "@/lib/status-style";
import type { Task } from "@/lib/types";

export { CHIP_STYLE };

export function TaskChip({ task, onClick }: { task: Task; onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "block max-h-[2.6em] w-full overflow-hidden break-words rounded px-0.5 py-0.5 text-left text-[10px] leading-[1.3]",
        CHIP_STYLE[task.status],
        task.priority && PRIORITY_TEXT_CLASS
      )}
      title={task.title}
    >
      {task.title}
    </button>
  );
}
