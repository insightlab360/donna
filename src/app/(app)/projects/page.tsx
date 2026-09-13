"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { computeProjectStats, sortForPopup } from "@/lib/tasks-logic";
import { ProjectFormDrawer } from "@/components/projects/ProjectFormDrawer";
import { TaskFormDrawer } from "@/components/tasks/TaskFormDrawer";
import { TaskRow } from "@/components/tasks/TaskRow";
import { Button } from "@/components/ui/Button";
import { WorkTypeBadge } from "@/components/ui/Badge";
import type { Project, Task } from "@/lib/types";

export default function ProjectsPage() {
  const { projects, tasks, projectNotes, loading, error } = useData();
  const [creating, setCreating] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [addingTaskFor, setAddingTaskFor] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const items = useMemo(
    () =>
      projects.map((project) => {
        const latestNote = projectNotes
          .filter((n) => n.project_id === project.id)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
        return {
          project,
          stats: computeProjectStats(project, tasks),
          projectTasks: sortForPopup(tasks.filter((t) => t.project_id === project.id)),
          latestNote,
        };
      }),
    [projects, tasks, projectNotes]
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-black">프로젝트</h1>
        <Button variant="primary" onClick={() => setCreating(true)}>
          + 프로젝트 추가
        </Button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="py-16 text-center text-sm text-neutral-400">불러오는 중...</p>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 py-16 text-center">
          <p className="text-sm text-neutral-400">등록된 프로젝트가 없습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map(({ project, stats, projectTasks, latestNote }) => (
            <section key={project.id} className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-sm font-semibold text-black">{project.name}</h2>
                    <span className="shrink-0 text-xs font-semibold text-black">{stats.progress}%</span>
                    <WorkTypeBadge workType={project.work_type} />
                    <span className="shrink-0 text-xs text-neutral-400">{project.status}</span>
                  </div>
                  {latestNote && <p className="mt-1 truncate text-xs italic text-neutral-400">메모: {latestNote.content}</p>}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => setAddingTaskFor(project.id)}>
                    + 할 일
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditingProject(project)}>
                    수정
                  </Button>
                </div>
              </div>
              <div className="h-1 w-full bg-neutral-100">
                <div className="h-full bg-black" style={{ width: `${stats.progress}%` }} />
              </div>

              <div className="border-t border-neutral-100 px-4">
                {projectTasks.length === 0 ? (
                  <p className="py-6 text-center text-sm text-neutral-400">등록된 할 일이 없습니다.</p>
                ) : (
                  projectTasks.map((task) => (
                    <TaskRow key={task.id} task={task} quickStatus showDueBadge onClick={() => setEditingTask(task)} />
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      <ProjectFormDrawer open={creating} onOpenChange={setCreating} />
      <ProjectFormDrawer
        open={!!editingProject}
        onOpenChange={(v) => !v && setEditingProject(null)}
        project={editingProject ?? undefined}
      />
      <TaskFormDrawer
        open={!!addingTaskFor}
        onOpenChange={(v) => !v && setAddingTaskFor(null)}
        initialProjectId={addingTaskFor}
      />
      <TaskFormDrawer open={!!editingTask} onOpenChange={(v) => !v && setEditingTask(null)} task={editingTask ?? undefined} />
    </div>
  );
}
