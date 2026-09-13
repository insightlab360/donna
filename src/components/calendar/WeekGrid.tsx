"use client";

import { formatTaskWhen, getTasksOnDate, sortForPeriod } from "@/lib/tasks-logic";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/Badge";
import { workTypeAbbr } from "@/lib/calendar";
import type { Task } from "@/lib/types";

const WEEKDAY_HEADERS = ["월", "화", "수", "목", "금", "토", "일"];

interface WeekGridProps {
  dates: string[];
  today: string;
  tasks: Task[];
  onDayClick: (date: string) => void;
  onTaskClick: (task: Task) => void;
}

export function WeekGrid({ dates, today, tasks, onDayClick, onTaskClick }: WeekGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-7 sm:gap-2">
      {dates.map((date, i) => {
        const dayTasks = sortForPeriod(getTasksOnDate(tasks, date));
        const isToday = date === today;

        return (
          <div key={date} className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <div
              onClick={() => onDayClick(date)}
              className={cn(
                "flex cursor-pointer items-center justify-between border-b border-neutral-100 px-2.5 py-2",
                isToday && "bg-black text-white"
              )}
            >
              <span className="text-xs font-medium">{WEEKDAY_HEADERS[i]}</span>
              <span className="text-sm font-semibold">{Number(date.slice(8, 10))}</span>
            </div>
            <div className="min-h-[80px] p-1.5">
              {dayTasks.length === 0 ? (
                <p className="py-3 text-center text-[11px] text-neutral-300">-</p>
              ) : (
                dayTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className="mb-1 block w-full rounded-md border border-neutral-100 px-2 py-1.5 text-left hover:bg-neutral-50"
                  >
                    <p className="text-[10px] text-neutral-400">
                      {formatTaskWhen(task)} · {workTypeAbbr(task.work_type)}
                    </p>
                    <p className="truncate text-xs font-medium text-black">{task.title}</p>
                    <StatusBadge status={task.status} className="mt-1" />
                  </button>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
