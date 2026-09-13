"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { useTodayPopup } from "@/components/today/TodayPopupProvider";
import { endOfWeekSun, startOfWeekMon, todayKST, addDaysStr } from "@/lib/date";
import {
  computeProjectStats,
  getOverdueTasks,
  getTasksOnDate,
  isDueInRange,
  isTaskOpen,
  projectDisplayName,
  sortForPeriod,
  sortForPopup,
  sortProjectsForDisplay,
} from "@/lib/tasks-logic";
import { TaskRow } from "@/components/tasks/TaskRow";
import { TaskFormDrawer } from "@/components/tasks/TaskFormDrawer";
import { UndeterminedSection } from "@/components/tasks/UndeterminedSection";
import { Button } from "@/components/ui/Button";
import { WorkTypeFilterBar, matchesWorkTypeFilter, type WorkTypeFilterValue } from "@/components/ui/WorkTypeFilterBar";

export default function DashboardPage() {
  const { tasks: allTasks, projects: allProjects, loading } = useData();
  const { openPopup } = useTodayPopup();
  const [creating, setCreating] = useState(false);
  const [workTypeFilter, setWorkTypeFilter] = useState<WorkTypeFilterValue>("all");

  const today = todayKST();

  const tasks = useMemo(
    () => allTasks.filter((t) => matchesWorkTypeFilter(t.work_type, workTypeFilter)),
    [allTasks, workTypeFilter]
  );
  const projects = useMemo(
    () => allProjects.filter((p) => matchesWorkTypeFilter(p.work_type, workTypeFilter)),
    [allProjects, workTypeFilter]
  );

  const todayTasks = useMemo(() => sortForPopup(getTasksOnDate(tasks, today)), [tasks, today]);
  const overdueTasks = useMemo(() => getOverdueTasks(tasks, today), [tasks, today]);
  const weekTasks = useMemo(() => {
    const start = startOfWeekMon(today);
    const end = endOfWeekSun(today);
    return sortForPeriod(tasks.filter((t) => isTaskOpen(t) && isDueInRange(t, start, end)));
  }, [tasks, today]);
  const upcomingTasks = useMemo(() => {
    const from = addDaysStr(today, 1);
    const to = addDaysStr(today, 3);
    return sortForPeriod(tasks.filter((t) => isTaskOpen(t) && isDueInRange(t, from, to)));
  }, [tasks, today]);
  const inProgressProjects = useMemo(
    () =>
      sortProjectsForDisplay(projects.filter((p) => p.status === "진행중")).map((p) => ({
        project: p,
        stats: computeProjectStats(p, tasks),
      })),
    [projects, tasks]
  );
  const incompleteTasks = useMemo(() => sortForPeriod(tasks.filter(isTaskOpen)), [tasks]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-black">오늘</h1>
          {!loading && todayTasks.length === 0 && (
            <p className="mt-1 text-sm text-neutral-400">오늘 예정된 Task가 없습니다.</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/activity">
            <Button variant="secondary">활동 로그</Button>
          </Link>
          <Button variant="secondary" onClick={openPopup} disabled={todayTasks.length === 0}>
            오늘의 Task 보기
          </Button>
          <Button variant="primary" onClick={() => setCreating(true)}>
            + Task 추가
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <WorkTypeFilterBar value={workTypeFilter} onChange={setWorkTypeFilter} />
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-neutral-400">불러오는 중...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="오늘의 Task" count={todayTasks.length}>
            <TaskList tasks={todayTasks.slice(0, 6)} emptyText="오늘 Task가 없습니다." showDueBadge />
          </Card>

          <Card title="이번 주 Task" count={weekTasks.length} href="/tasks">
            <TaskList tasks={weekTasks.slice(0, 6)} emptyText="이번 주 Task가 없습니다." showDueBadge />
          </Card>

          <Card title="마감 임박 Task" count={upcomingTasks.length} subtitle="3일 이내">
            <TaskList tasks={upcomingTasks.slice(0, 6)} emptyText="마감 임박 Task가 없습니다." showDueBadge />
          </Card>

          <Card title="기한 지난 Task" count={overdueTasks.length}>
            <TaskList tasks={overdueTasks.slice(0, 6)} emptyText="기한이 지난 Task가 없습니다." />
          </Card>

          <Card title="진행 중 프로젝트" count={inProgressProjects.length} href="/projects" className="lg:col-span-2">
            {inProgressProjects.length === 0 ? (
              <EmptyRow text="진행 중인 프로젝트가 없습니다." />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {inProgressProjects.map(({ project, stats }) => (
                  <div key={project.id} className="rounded-md border border-neutral-100 p-3">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-medium text-black">{projectDisplayName(project.name)}</p>
                      <span className="text-xs font-medium text-neutral-500">{stats.progress}%</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                      <div className="h-full rounded-full bg-black" style={{ width: `${stats.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="완료되지 않은 Task" count={incompleteTasks.length} href="/tasks" className="lg:col-span-2">
            <TaskList tasks={incompleteTasks.slice(0, 10)} emptyText="완료하지 않은 Task가 없습니다." showDueBadge />
          </Card>

          <div className="lg:col-span-2">
            <UndeterminedSection workType={workTypeFilter} />
          </div>
        </div>
      )}

      <TaskFormDrawer open={creating} onOpenChange={setCreating} />
    </div>
  );
}

function Card({
  title,
  count,
  subtitle,
  href,
  className,
  children,
}: {
  title: string;
  count: number;
  subtitle?: string;
  href?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-lg border border-neutral-200 bg-white p-4 ${className ?? ""}`}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-black">
          {title} <span className="font-normal text-neutral-400">{count}</span>
        </h3>
        <div className="flex items-center gap-2">
          {subtitle && <span className="text-xs text-neutral-400">{subtitle}</span>}
          {href && (
            <Link href={href} className="text-xs text-neutral-400 hover:text-black">
              전체보기
            </Link>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function TaskList({
  tasks,
  emptyText,
  showDueBadge,
}: {
  tasks: ReturnType<typeof sortForPeriod>;
  emptyText: string;
  showDueBadge?: boolean;
}) {
  const [editing, setEditing] = useState<(typeof tasks)[number] | null>(null);

  if (tasks.length === 0) return <EmptyRow text={emptyText} />;

  return (
    <div>
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} quickStatus showDueBadge={showDueBadge} onClick={() => setEditing(task)} />
      ))}
      <TaskFormDrawer open={!!editing} onOpenChange={(v) => !v && setEditing(null)} task={editing ?? undefined} />
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="py-4 text-center text-sm text-neutral-400">{text}</p>;
}
