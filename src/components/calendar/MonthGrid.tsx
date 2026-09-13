"use client";

import { getTasksOnDate, sortForPeriod } from "@/lib/tasks-logic";
import { cn } from "@/lib/utils";
import { TaskChip } from "./TaskChip";
import type { Task } from "@/lib/types";

const WEEKDAY_HEADERS = ["월", "화", "수", "목", "금", "토", "일"];
const MAX_CHIPS = 3;

interface MonthGridProps {
  dates: string[];
  today: string;
  tasks: Task[];
  anchorMonth: string;
  onDayClick: (date: string) => void;
  onTaskClick: (task: Task) => void;
  onOverflowClick: (date: string) => void;
}

export function MonthGrid({ dates, today, tasks, anchorMonth, onDayClick, onTaskClick, onOverflowClick }: MonthGridProps) {
  const currentMonth = anchorMonth.slice(0, 7);

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50">
        {WEEKDAY_HEADERS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-[11px] font-medium text-neutral-500">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dates.map((date) => {
          const dayTasks = sortForPeriod(getTasksOnDate(tasks, date));
          const inMonth = date.slice(0, 7) === currentMonth;
          const isToday = date === today;
          const visible = dayTasks.slice(0, MAX_CHIPS);
          const overflow = dayTasks.length - visible.length;

          return (
            <div
              key={date}
              onClick={() => onDayClick(date)}
              className={cn(
                "min-h-[92px] cursor-pointer border-b border-r border-neutral-100 p-1.5 last:border-r-0",
                !inMonth && "bg-neutral-50/60"
              )}
            >
              <span
                className={cn(
                  "mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                  isToday ? "bg-black font-semibold text-white" : inMonth ? "text-neutral-700" : "text-neutral-300"
                )}
              >
                {Number(date.slice(8, 10))}
              </span>
              <div className="flex flex-col gap-0.5">
                {visible.map((task) => (
                  <TaskChip key={task.id} task={task} onClick={() => onTaskClick(task)} />
                ))}
                {overflow > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOverflowClick(date);
                    }}
                    className="px-1.5 text-left text-[10px] text-neutral-400 hover:text-black"
                  >
                    +{overflow}개
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
