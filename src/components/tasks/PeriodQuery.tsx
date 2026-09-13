"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import {
  addDaysStr,
  endOfMonthStr,
  endOfWeekSun,
  formatMonthDayKR,
  startOfMonthStr,
  startOfWeekMon,
  todayKST,
} from "@/lib/date";
import { formatTaskWhen, isDueInRange, projectDisplayName, sortForPeriod } from "@/lib/tasks-logic";
import { WorkTypeBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { WorkTypeFilterBar, matchesWorkTypeFilter, type WorkTypeFilterValue } from "@/components/ui/WorkTypeFilterBar";
import { TaskFormDrawer } from "./TaskFormDrawer";
import { TASK_STATUSES, type Task, type TaskStatus } from "@/lib/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Preset = "today" | "tomorrow" | "thisWeek" | "nextWeek" | "thisMonth" | "thisYear" | "year" | "custom";

const PRESETS: { key: Preset; label: string }[] = [
  { key: "today", label: "오늘" },
  { key: "tomorrow", label: "내일" },
  { key: "thisWeek", label: "이번 주" },
  { key: "nextWeek", label: "다음 주" },
  { key: "thisMonth", label: "이번 달" },
  { key: "thisYear", label: "올해" },
  { key: "year", label: "연도별" },
  { key: "custom", label: "직접 기간 선택" },
];

function rangeForPreset(preset: Preset, today: string, year: number): [string, string] {
  switch (preset) {
    case "today":
      return [today, today];
    case "tomorrow": {
      const t = addDaysStr(today, 1);
      return [t, t];
    }
    case "thisWeek":
      return [startOfWeekMon(today), endOfWeekSun(today)];
    case "nextWeek":
      return [addDaysStr(startOfWeekMon(today), 7), addDaysStr(endOfWeekSun(today), 7)];
    case "thisMonth":
      return [startOfMonthStr(today), endOfMonthStr(today)];
    case "thisYear":
      return [`${today.slice(0, 4)}-01-01`, `${today.slice(0, 4)}-12-31`];
    case "year":
      return [`${year}-01-01`, `${year}-12-31`];
    default:
      return [today, today];
  }
}

export function PeriodQuery() {
  const { tasks, projects, loading, updateTask } = useData();
  const today = todayKST();
  const [preset, setPreset] = useState<Preset>("thisWeek");
  const [customStart, setCustomStart] = useState(today);
  const [customEnd, setCustomEnd] = useState(today);
  const [year, setYear] = useState(() => Number(today.slice(0, 4)));
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [workTypeFilter, setWorkTypeFilter] = useState<WorkTypeFilterValue>("all");

  const [rangeStart, rangeEnd] = preset === "custom" ? [customStart, customEnd] : rangeForPreset(preset, today, year);

  // Full work management: every status shows here (완료/드랍 포함), not just what's left to do.
  const results = useMemo(() => {
    return sortForPeriod(
      tasks.filter((t) => isDueInRange(t, rangeStart, rangeEnd) && matchesWorkTypeFilter(t.work_type, workTypeFilter))
    );
  }, [tasks, rangeStart, rangeEnd, workTypeFilter]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPreset(p.key)}
            className={
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
              (preset === p.key ? "border-black bg-black text-white" : "border-neutral-300 text-neutral-600 hover:bg-neutral-50")
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mb-3">
        <WorkTypeFilterBar value={workTypeFilter} onChange={setWorkTypeFilter} />
      </div>

      {preset === "year" && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <button onClick={() => setYear((y) => y - 1)} className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100">
            <ChevronLeft size={18} />
          </button>
          <span className="min-w-[70px] text-center text-sm font-semibold text-black">{year}년</span>
          <button onClick={() => setYear((y) => y + 1)} className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100">
            <ChevronRight size={18} />
          </button>
          <Button size="sm" variant="secondary" onClick={() => setYear(Number(today.slice(0, 4)))}>
            올해
          </Button>
        </div>
      )}

      {preset === "custom" && (
        <div className="mb-4 flex items-center gap-2">
          <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-black" />
          <span className="text-sm text-neutral-400">~</span>
          <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-black" />
        </div>
      )}

      <p className="mb-2 text-xs text-neutral-500">
        {formatMonthDayKR(rangeStart)} – {formatMonthDayKR(rangeEnd)} · {results.length}개
      </p>

      {loading ? (
        <p className="py-12 text-center text-sm text-neutral-400">불러오는 중...</p>
      ) : results.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 py-12 text-center">
          <p className="text-sm text-neutral-400">해당 기간에 조회된 Task가 없습니다.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          {results.map((task) => {
            const project = projects.find((p) => p.id === task.project_id);
            return (
              <div
                key={task.id}
                onClick={() => setEditingTask(task)}
                className="flex w-full cursor-pointer items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3 text-left last:border-b-0 hover:bg-neutral-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <span className="font-medium text-neutral-700">{formatTaskWhen(task)}</span>
                    <WorkTypeBadge workType={task.work_type} />
                    {project && <span className="truncate">{projectDisplayName(project.name)}</span>}
                  </div>
                  <p
                    className={
                      "mt-0.5 truncate text-sm font-medium " +
                      (task.status === "완료" || task.status === "드랍" ? "text-neutral-400 line-through" : "text-black")
                    }
                  >
                    {task.title}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
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
                  <span className="text-[11px] text-neutral-400">마감 {formatMonthDayKR(task.due_date!)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TaskFormDrawer open={!!editingTask} onOpenChange={(v) => !v && setEditingTask(null)} task={editingTask ?? undefined} />
    </div>
  );
}
