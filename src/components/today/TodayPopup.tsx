"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { formatMonthDayWeekdayKR, todayKST } from "@/lib/date";
import { getOverdueTasks, getTasksOnDate, sortForPopup } from "@/lib/tasks-logic";
import { TaskRow } from "@/components/tasks/TaskRow";
import { TaskFormDrawer } from "@/components/tasks/TaskFormDrawer";
import { Button } from "@/components/ui/Button";
import type { Task } from "@/lib/types";

export function TodayPopup({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { tasks, loading } = useData();
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const today = todayKST();
  const todayTasks = useMemo(() => sortForPopup(getTasksOnDate(tasks, today)), [tasks, today]);
  const overdueTasks = useMemo(() => getOverdueTasks(tasks, today), [tasks, today]);

  if (!loading && todayTasks.length === 0 && overdueTasks.length === 0) {
    return null;
  }

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Content
            className="fixed z-50 inset-x-0 bottom-0 w-full max-h-[85vh] flex flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl outline-none
              sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-h-[80vh] sm:rounded-2xl"
          >
            <div className="shrink-0 border-b border-neutral-200 px-5 py-4">
              <Dialog.Title className="text-lg font-semibold text-black">오늘의 Task</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-neutral-500">
                {formatMonthDayWeekdayKR(today)} · 오늘의 Task {todayTasks.length}개
              </Dialog.Description>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3">
              {overdueTasks.length > 0 && (
                <div className="mb-4">
                  <p className="mb-1 text-xs font-semibold text-red-600">기한이 지난 Task {overdueTasks.length}개</p>
                  <div className="rounded-md border border-red-100 bg-red-50/50 px-2">
                    {overdueTasks.map((task) => (
                      <TaskRow key={task.id} task={task} quickStatus onClick={() => setEditingTask(task)} />
                    ))}
                  </div>
                </div>
              )}

              {todayTasks.length === 0 ? (
                <p className="py-8 text-center text-sm text-neutral-400">오늘 예정된 Task가 없습니다.</p>
              ) : (
                <div>
                  {todayTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      quickStatus
                      showDueBadge
                      onClick={() => setEditingTask(task)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-neutral-200 px-5 py-3 flex justify-end">
              <Dialog.Close asChild>
                <Button variant="primary">닫기</Button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <TaskFormDrawer open={!!editingTask} onOpenChange={(v) => !v && setEditingTask(null)} task={editingTask ?? undefined} />
    </>
  );
}
