import { cn } from "@/lib/utils";
import { STATUS_CHIP_STYLE } from "@/lib/status-style";
import type { TaskStatus, WorkType } from "@/lib/types";

export function WorkTypeBadge({ workType, className }: { workType: WorkType; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border border-neutral-300 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600",
        className
      )}
    >
      {workType}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        STATUS_CHIP_STYLE[status],
        className
      )}
    >
      {status}
    </span>
  );
}
