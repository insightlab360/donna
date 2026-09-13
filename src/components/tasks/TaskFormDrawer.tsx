"use client";

import { Drawer } from "@/components/ui/Drawer";
import { TaskForm } from "./TaskForm";
import type { Task } from "@/lib/types";

interface TaskFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task;
  initialDate?: string;
  initialProjectId?: string | null;
}

export function TaskFormDrawer({ open, onOpenChange, task, initialDate, initialProjectId }: TaskFormDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={task ? "Task 수정" : "Task 추가"}>
      {open && (
        <TaskForm
          key={task?.id ?? "new"}
          task={task}
          initialDate={initialDate}
          initialProjectId={initialProjectId}
          onDone={() => onOpenChange(false)}
        />
      )}
    </Drawer>
  );
}
