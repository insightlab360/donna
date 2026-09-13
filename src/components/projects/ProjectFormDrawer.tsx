"use client";

import { Drawer } from "@/components/ui/Drawer";
import { ProjectForm } from "./ProjectForm";
import type { Project } from "@/lib/types";

interface ProjectFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
}

export function ProjectFormDrawer({ open, onOpenChange, project }: ProjectFormDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={project ? "프로젝트 수정" : "프로젝트 추가"}>
      {open && <ProjectForm key={project?.id ?? "new"} project={project} onDone={() => onOpenChange(false)} />}
    </Drawer>
  );
}
