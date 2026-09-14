"use client";

import { useState } from "react";
import { CalendarView } from "@/components/calendar/CalendarView";
import { TaskFormDrawer } from "@/components/tasks/TaskFormDrawer";
import { UndeterminedSection } from "@/components/tasks/UndeterminedSection";
import { Button } from "@/components/ui/Button";
import { WorkTypeFilterBar } from "@/components/ui/WorkTypeFilterBar";
import { useWorkTypeFilter } from "@/lib/work-type-filter-context";

export default function CalendarPage() {
  const [creating, setCreating] = useState(false);
  const { workTypeFilter, setWorkTypeFilter } = useWorkTypeFilter();

  return (
    <div className="w-full px-1 py-4 sm:px-4 sm:py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-black">캘린더</h1>
        <Button variant="primary" onClick={() => setCreating(true)}>
          + Task 추가
        </Button>
      </div>

      <div className="mb-4">
        <WorkTypeFilterBar value={workTypeFilter} onChange={setWorkTypeFilter} />
      </div>

      <CalendarView workType={workTypeFilter} />

      <div className="mt-4">
        <UndeterminedSection workType={workTypeFilter} />
      </div>

      <TaskFormDrawer open={creating} onOpenChange={setCreating} />
    </div>
  );
}
