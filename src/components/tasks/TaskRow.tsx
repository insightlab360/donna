"use client";

import { useData } from "@/lib/data-context";
import { formatTaskWhen, isDueToday, projectDisplayName } from "@/lib/tasks-logic";
import { todayKST } from "@/lib/date";
import { StatusBadge, WorkTypeBadge } from "@/components/ui/Badge";
import { TASK_STATUSES, type Task, type TaskStatus } from "@/lib/types";

interface TaskRowProps {
  task: Task;
  onClick?: () => void;
  quickStatus?: boolean;
  showDueBadge?: boolean;
}

export function TaskRow({ task, onClick, quickStatus, showDueBadge }: TaskRowProps) {
  const { projects, updateTask, taskNotes } = useData();
  const project = projects.find((p) => p.id === task.project_id);
  const dueToday = isDueToday(task, todayKST());
  const latestNote = taskNotes
    .filter((n) => n.task_id === task.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  return (
    <div
      onClick={onClick}
      className="flex items-start justify-between gap-3 border-b border-neutral-100 py-3 last:border-b-0 cursor-pointer hover:bg-neutral-50 -mx-1 px-1 rounded-md"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span className="font-medium text-neutral-700">{formatTaskWhen(task)}</span>
          {showDueBadge && dueToday && (
            <span className="rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] font-medium text-white">오늘 마감</span>
          )}
        </div>
        <p className="mt-0.5 truncate text-sm font-medium text-black">{task.title}</p>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500">
          <WorkTypeBadge workType={task.work_type} />
          {project && <span className="truncate">{projectDisplayName(project.name)}</span>}
        </div>
        {latestNote && <p className="mt-1 truncate text-xs italic text-neutral-400">메모: {latestNote.content}</p>}
      </div>

      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        {quickStatus ? (
          <select
            value={task.status}
            onChange={(e) => updateTask(task.id, { status: e.target.value as TaskStatus })}
            className="rounded-full border border-neutral-300 bg-white px-2 py-1 text-[11px] font-medium text-neutral-700 outline-none focus:border-black"
          >
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        ) : (
          <StatusBadge status={task.status} />
        )}
      </div>
    </div>
  );
}
