"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useData } from "@/lib/data-context";
import { getMonthGridDates, getWeekDates } from "@/lib/calendar";
import { addDaysStr, addMonthsStr, formatMonthDayKR, startOfMonthStr, todayKST } from "@/lib/date";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { TaskFormDrawer } from "@/components/tasks/TaskFormDrawer";
import { MonthGrid } from "./MonthGrid";
import { WeekGrid } from "./WeekGrid";
import type { Task } from "@/lib/types";

type ViewMode = "month" | "week";

export function CalendarView() {
  // `tasks` (the full shared task list) is used only to notice when a mutation
  // happened elsewhere and the visible range should be refetched — the grid itself
  // renders from `rangeTasks`, which is scoped to just the dates on screen.
  const { tasks, fetchTasksInRange } = useData();
  const [mode, setMode] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState(todayKST());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [addingDate, setAddingDate] = useState<string | null>(null);
  const [rangeTasks, setRangeTasks] = useState<Task[]>([]);

  const today = todayKST();
  const dates = useMemo(() => (mode === "month" ? getMonthGridDates(anchor) : getWeekDates(anchor)), [mode, anchor]);
  const rangeStart = dates[0];
  const rangeEnd = dates[dates.length - 1];
  const anchorMonthDate = mode === "month" ? startOfMonthStr(anchor) : anchor;
  const [year, monthNum] = anchorMonthDate.split("-");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await fetchTasksInRange(rangeStart, rangeEnd);
        if (!cancelled) setRangeTasks(result);
      } catch {
        if (!cancelled) setRangeTasks([]);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [rangeStart, rangeEnd, fetchTasksInRange, tasks]);

  function goPrev() {
    setAnchor(mode === "month" ? addMonthsStr(anchor, -1) : addDaysStr(anchor, -7));
  }
  function goNext() {
    setAnchor(mode === "month" ? addMonthsStr(anchor, 1) : addDaysStr(anchor, 7));
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button onClick={goPrev} className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100">
            <ChevronLeft size={18} />
          </button>
          <h2 className="min-w-[120px] text-base font-semibold text-black">
            {mode === "month"
              ? `${Number(year)}년 ${Number(monthNum)}월`
              : `${formatMonthDayKR(dates[0])} – ${formatMonthDayKR(dates[6])}`}
          </h2>
          <button onClick={goNext} className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100">
            <ChevronRight size={18} />
          </button>
          <Button size="sm" variant="secondary" onClick={() => setAnchor(today)}>
            오늘
          </Button>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setMode("month")}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium",
              mode === "month" ? "border-black bg-black text-white" : "border-neutral-300 text-neutral-600 hover:bg-neutral-50"
            )}
          >
            월간
          </button>
          <button
            onClick={() => setMode("week")}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium",
              mode === "week" ? "border-black bg-black text-white" : "border-neutral-300 text-neutral-600 hover:bg-neutral-50"
            )}
          >
            주간
          </button>
        </div>
      </div>

      {mode === "month" ? (
        <MonthGrid
          dates={dates}
          today={today}
          tasks={rangeTasks}
          anchorMonth={anchorMonthDate}
          onDayClick={setAddingDate}
          onTaskClick={setEditingTask}
          onOverflowClick={(date) => {
            setAnchor(date);
            setMode("week");
          }}
        />
      ) : (
        <WeekGrid dates={dates} today={today} tasks={rangeTasks} onDayClick={setAddingDate} onTaskClick={setEditingTask} />
      )}

      <TaskFormDrawer open={!!editingTask} onOpenChange={(v) => !v && setEditingTask(null)} task={editingTask ?? undefined} />
      <TaskFormDrawer open={!!addingDate} onOpenChange={(v) => !v && setAddingDate(null)} initialDate={addingDate ?? undefined} />
    </div>
  );
}
