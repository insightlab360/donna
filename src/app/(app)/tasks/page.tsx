"use client";

import { useState } from "react";
import { PeriodQuery } from "@/components/tasks/PeriodQuery";
import { TaskFormDrawer } from "@/components/tasks/TaskFormDrawer";
import { Button } from "@/components/ui/Button";

export default function TasksPage() {
  const [creating, setCreating] = useState(false);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-black">할 일</h1>
        <Button variant="primary" onClick={() => setCreating(true)}>
          + 할 일 추가
        </Button>
      </div>

      <PeriodQuery />

      <TaskFormDrawer open={creating} onOpenChange={setCreating} />
    </div>
  );
}
