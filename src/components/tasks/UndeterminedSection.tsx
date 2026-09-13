"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { getUndeterminedTasks, projectDisplayName, sortProjectsForDisplay } from "@/lib/tasks-logic";
import { TaskRow } from "@/components/tasks/TaskRow";
import { TaskFormDrawer } from "@/components/tasks/TaskFormDrawer";
import { ProjectFormDrawer } from "@/components/projects/ProjectFormDrawer";
import { WorkTypeBadge } from "@/components/ui/Badge";
import { matchesWorkTypeFilter, type WorkTypeFilterValue } from "@/components/ui/WorkTypeFilterBar";
import type { Task } from "@/lib/types";

export function UndeterminedSection({ workType = "all" }: { workType?: WorkTypeFilterValue }) {
  const { tasks, projects } = useData();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  const undeterminedTasks = getUndeterminedTasks(tasks).filter((t) => matchesWorkTypeFilter(t.work_type, workType));
  const undeterminedProjects = sortProjectsForDisplay(
    projects.filter(
      (p) => p.end_date === null && p.status !== "완료" && p.status !== "드랍" && matchesWorkTypeFilter(p.work_type, workType)
    )
  );
  const editingProject = projects.find((p) => p.id === editingProjectId) ?? null;

  if (undeterminedTasks.length === 0 && undeterminedProjects.length === 0) return null;

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-black">
        기한 미정 <span className="font-normal text-neutral-400">{undeterminedTasks.length + undeterminedProjects.length}</span>
      </h3>

      {undeterminedTasks.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-medium text-neutral-500">Task {undeterminedTasks.length}개</p>
          <div>
            {undeterminedTasks.map((task) => (
              <TaskRow key={task.id} task={task} quickStatus onClick={() => setEditingTask(task)} />
            ))}
          </div>
        </div>
      )}

      {undeterminedProjects.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-neutral-500">프로젝트 {undeterminedProjects.length}개</p>
          <div className="flex flex-col gap-1.5">
            {undeterminedProjects.map((project) => (
              <button
                key={project.id}
                onClick={() => setEditingProjectId(project.id)}
                className="flex items-center justify-between rounded-md border border-neutral-100 px-3 py-2 text-left text-sm hover:bg-neutral-50"
              >
                <span className="truncate font-medium text-black">{projectDisplayName(project.name)}</span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <WorkTypeBadge workType={project.work_type} />
                  <span className="text-xs text-neutral-400">{project.status}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <TaskFormDrawer open={!!editingTask} onOpenChange={(v) => !v && setEditingTask(null)} task={editingTask ?? undefined} />
      <ProjectFormDrawer
        open={!!editingProject}
        onOpenChange={(v) => !v && setEditingProjectId(null)}
        project={editingProject ?? undefined}
      />
    </section>
  );
}
