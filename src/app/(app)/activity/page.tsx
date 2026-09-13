"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useData } from "@/lib/data-context";
import {
  addDaysStr,
  endOfMonthStr,
  endOfWeekSun,
  formatMonthDayWeekdayKR,
  startOfMonthStr,
  startOfWeekMon,
  todayKST,
} from "@/lib/date";
import { WorkTypeBadge } from "@/components/ui/Badge";
import { projectDisplayName } from "@/lib/tasks-logic";
import type { WorkType } from "@/lib/types";

type Preset = "today" | "thisWeek" | "thisMonth" | "custom";

const PRESETS: { key: Preset; label: string }[] = [
  { key: "today", label: "오늘" },
  { key: "thisWeek", label: "이번 주" },
  { key: "thisMonth", label: "이번 달" },
  { key: "custom", label: "직접 기간 선택" },
];

function rangeForPreset(preset: Preset, today: string): [string, string] {
  switch (preset) {
    case "today":
      return [today, today];
    case "thisWeek":
      return [startOfWeekMon(today), endOfWeekSun(today)];
    case "thisMonth":
      return [startOfMonthStr(today), endOfMonthStr(today)];
    default:
      return [today, today];
  }
}

interface ActivityEntry {
  id: string;
  createdAt: string;
  content: string;
  kind: "Task" | "프로젝트";
  title: string;
  workType: WorkType;
}

export default function ActivityPage() {
  const { tasks, projects, taskNotes, projectNotes, loading } = useData();
  const today = todayKST();
  const [preset, setPreset] = useState<Preset>("thisWeek");
  const [customStart, setCustomStart] = useState(addDaysStr(today, -6));
  const [customEnd, setCustomEnd] = useState(today);

  const [rangeStart, rangeEnd] =
    preset === "custom"
      ? [customEnd < customStart ? customEnd : customStart, customEnd < customStart ? customStart : customEnd]
      : rangeForPreset(preset, today);

  const entries = useMemo(() => {
    const taskEntries: ActivityEntry[] = taskNotes.flatMap((n) => {
      const task = tasks.find((t) => t.id === n.task_id);
      if (!task) return [];
      return [{ id: n.id, createdAt: n.created_at, content: n.content, kind: "Task" as const, title: task.title, workType: task.work_type }];
    });
    const projectEntries: ActivityEntry[] = projectNotes.flatMap((n) => {
      const project = projects.find((p) => p.id === n.project_id);
      if (!project) return [];
      return [
        {
          id: n.id,
          createdAt: n.created_at,
          content: n.content,
          kind: "프로젝트" as const,
          title: projectDisplayName(project.name),
          workType: project.work_type,
        },
      ];
    });
    return [...taskEntries, ...projectEntries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [taskNotes, projectNotes, tasks, projects]);

  const filtered = useMemo(
    () => entries.filter((e) => e.createdAt.slice(0, 10) >= rangeStart && e.createdAt.slice(0, 10) <= rangeEnd),
    [entries, rangeStart, rangeEnd]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityEntry[]>();
    for (const entry of filtered) {
      const dateKey = entry.createdAt.slice(0, 10);
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(entry);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-black">활동 로그</h1>
          <p className="mt-1 text-sm text-neutral-400">Task·프로젝트에 남긴 메모를 날짜순으로 모아봅니다.</p>
        </div>
        <Link href="/tasks" className="text-xs text-neutral-400 hover:text-black">
Task로 돌아가기
        </Link>
      </div>

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

      {preset === "custom" && (
        <div className="mb-4 flex items-center gap-2">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-black"
          />
          <span className="text-sm text-neutral-400">~</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-black"
          />
        </div>
      )}

      <p className="mb-3 text-xs text-neutral-500">메모 {filtered.length}개</p>

      {loading ? (
        <p className="py-16 text-center text-sm text-neutral-400">불러오는 중...</p>
      ) : grouped.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 py-16 text-center">
          <p className="text-sm text-neutral-400">해당 기간에 기록된 메모가 없습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {grouped.map(([dateKey, dayEntries]) => (
            <div key={dateKey}>
              <p className="mb-2 text-xs font-semibold text-neutral-600">{formatMonthDayWeekdayKR(dateKey)}</p>
              <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                {dayEntries.map((entry) => (
                  <div key={entry.id} className="border-b border-neutral-100 px-4 py-3 last:border-b-0">
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                      <WorkTypeBadge workType={entry.workType} />
                      <span className="rounded border border-neutral-300 px-1.5 py-0.5 text-[11px]">{entry.kind}</span>
                      <span className="truncate font-medium text-neutral-700">{entry.title}</span>
                      <span className="ml-auto shrink-0 text-neutral-400">
                        {new Date(entry.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-black">{entry.content}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
