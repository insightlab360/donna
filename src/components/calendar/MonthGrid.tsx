"use client";

import { useMemo } from "react";
import { getTasksOnDate, isMultiDayTask, sortForPeriod } from "@/lib/tasks-logic";
import { cn } from "@/lib/utils";
import { PRIORITY_TEXT_CLASS } from "@/lib/status-style";
import { CHIP_STYLE, TaskChip } from "./TaskChip";
import { computeWeekSpans } from "./weekSpans";
import type { Task } from "@/lib/types";

const WEEKDAY_HEADERS = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_CHIPS = 3;
const LANE_HEIGHT = 18;
const LANES_TOP_OFFSET = 24;

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
  const weeks = useMemo(() => {
    const out: string[][] = [];
    for (let i = 0; i < dates.length; i += 7) out.push(dates.slice(i, i + 7));
    return out;
  }, [dates]);

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50">
        {WEEKDAY_HEADERS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-[11px] font-medium text-neutral-500">
            {d}
          </div>
        ))}
      </div>
      {weeks.map((week) => {
        const spans = computeWeekSpans(week, tasks);
        const laneCount = spans.reduce((max, s) => Math.max(max, s.lane + 1), 0);

        return (
          <div key={week[0]} className="relative grid grid-cols-7">
            {week.map((date) => {
              const dayTasks = sortForPeriod(getTasksOnDate(tasks, date).filter((t) => !isMultiDayTask(t)));
              const inMonth = date.slice(0, 7) === currentMonth;
              const isToday = date === today;
              const visible = dayTasks.slice(0, MAX_CHIPS);
              const overflow = dayTasks.length - visible.length;

              return (
                <div
                  key={date}
                  onClick={() => onDayClick(date)}
                  className={cn(
                    "min-h-[132px] cursor-pointer border-b border-r border-neutral-100 px-0.5 py-1 last:border-r-0",
                    !inMonth && "bg-neutral-50/60"
                  )}
                >
                  <span
                    className={cn(
                      "mb-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                      isToday ? "bg-black font-semibold text-white" : inMonth ? "text-neutral-700" : "text-neutral-300"
                    )}
                  >
                    {Number(date.slice(8, 10))}
                  </span>
                  <div className="flex flex-col gap-0.5" style={laneCount > 0 ? { marginTop: laneCount * LANE_HEIGHT } : undefined}>
                    {visible.map((task) => (
                      <TaskChip key={task.id} task={task} onClick={() => onTaskClick(task)} />
                    ))}
                    {overflow > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOverflowClick(date);
                        }}
                        className="px-0.5 text-left text-[10px] text-neutral-400 hover:text-black"
                      >
                        +{overflow}개
                      </button>
                    )}
                  </div>
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
                  "absolute h-4 overflow-hidden rounded px-1 text-left text-[10px] leading-4",
                  CHIP_STYLE[bar.task.status],
                  bar.task.priority && PRIORITY_TEXT_CLASS
                )}
                style={{
                  left: `calc(${(bar.startCol / 7) * 100}% + 2px)`,
                  width: `calc(${((bar.endCol - bar.startCol + 1) / 7) * 100}% - 4px)`,
                  top: LANES_TOP_OFFSET + bar.lane * LANE_HEIGHT,
                }}
                title={bar.task.title}
              >
                {bar.continuesBefore && "◂ "}
                {bar.task.title}
                {bar.continuesAfter && " ▸"}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
