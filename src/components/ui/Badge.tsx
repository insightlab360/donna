import { cn } from "@/lib/utils";
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

const STATUS_STYLE: Record<TaskStatus, string> = {
  예정: "border-neutral-300 text-neutral-500",
  진행중: "border-black bg-black text-white font-semibold",
  완료: "border-neutral-300 text-neutral-400 line-through decoration-neutral-400",
  보류: "border-neutral-400 text-neutral-600 border-dashed",
  드랍: "border-neutral-200 text-neutral-300",
};

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        STATUS_STYLE[status],
        className
      )}
    >
      {status}
    </span>
  );
}
