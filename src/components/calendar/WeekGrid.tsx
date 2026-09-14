"use client";

import { formatTaskWhen, getTasksOnDate, isMultiDayTask, sortForPeriod } from "@/lib/tasks-logic";
import { cn } from "@/lib/utils";
import { PRIORITY_TEXT_CLASS } from "@/lib/status-style";
import { CHIP_STYLE } from "./TaskChip";
import { computeWeekSpans } from "./weekSpans";
import type { Task } from "@/lib/types";

const WEEKDAY_HEADERS = ["월", "화", "수", "목", "금", "토", "일"];
const LANE_HEIGHT = 20;

interface WeekGridProps {
  dates: string[];
  today: string;
  tasks: Task[];
  onDayClick: (date: string) => void;
  onTaskClick: (task: Task) => void;
}

/**
 * Same 7-column grid on every screen size, including mobile — deliberately not a
 * stacked mobile layout. On a narrow screen this scrolls horizontally rather than
 * reflowing, so the week always looks like the desktop grid.
 */
export function WeekGrid({ dates, today, tasks, onDayClick, onTaskClick }: WeekGridProps) {
  const spans = computeWeekSpans(dates, tasks);
  const laneCount = spans.reduce((max, s) => Math.max(max, s.lane + 1), 0);

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50">
          {dates.map((date, i) => {
            const isToday = date === today;
            return (
              <div key={date} className={cn("px-2 py-2 text-center", isToday && "bg-black text-white")}>
                <div className="text-[11px] font-medium">{WEEKDAY_HEADERS[i]}</div>
                <div className="text-sm font-semibold">{Number(date.slice(8, 10))}</div>
              </div>
            );
          })}
        </div>
        <div className="relative grid grid-cols-7">
          {dates.map((date) => {
            const dayTasks = sortForPeriod(getTasksOnDate(tasks, date).filter((t) => !isMultiDayTask(t)));
            return (
              <div
                key={date}
                onClick={() => onDayClick(date)}
                className="min-h-[110px] cursor-pointer border-r border-neutral-100 px-1 py-1 last:border-r-0"
                style={laneCount > 0 ? { paddingTop: laneCount * LANE_HEIGHT + 6 } : undefined}
              >
                {dayTasks.length === 0 ? (
                  <p className="py-3 text-center text-[11px] text-neutral-300">-</p>
                ) : (
                  dayTasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaskClick(task);
                      }}
                      className={cn("mb-1 block w-full rounded px-1.5 py-1 text-left", CHIP_STYLE[task.status])}
                    >
                      <p className="text-[9px] opacity-70">{formatTaskWhen(task)}</p>
                      <p className={cn("text-[11px] font-medium leading-[1.3]", task.priority && PRIORITY_TEXT_CLASS)}>{task.title}</p>
                    </button>
                  ))
                )}
              </div>
            );
          })}
          {spans.map((bar) => (
            <button
              key={bar.task.id}
              onClick={(e) => {
                e.stopPropagation();
                onTaskClick(bar.task);
              }}
              className={cn(
                "absolute h-5 overflow-hidden rounded px-1.5 text-left text-[11px] leading-5",
                CHIP_STYLE[bar.task.status],
                bar.task.priority && PRIORITY_TEXT_CLASS
              )}
              style={{
                left: `calc(${(bar.startCol / 7) * 100}% + 3px)`,
                width: `calc(${((bar.endCol - bar.startCol + 1) / 7) * 100}% - 6px)`,
                top: 4 + bar.lane * LANE_HEIGHT,
              }}
              title={bar.task.title}
            >
              {bar.continuesBefore && "◂ "}
              {bar.task.title}
              {bar.continuesAfter && " ▸"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
