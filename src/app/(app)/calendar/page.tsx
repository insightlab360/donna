"use client";

import { useState } from "react";
import { CalendarView } from "@/components/calendar/CalendarView";
import { TaskFormDrawer } from "@/components/tasks/TaskFormDrawer";
import { UndeterminedSection } from "@/components/tasks/UndeterminedSection";
import { Button } from "@/components/ui/Button";

export default function CalendarPage() {
  const [creating, setCreating] = useState(false);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-black">캘린더</h1>
        <Button variant="primary" onClick={() => setCreating(true)}>
          + Task 추가
        </Button>
      </div>

      <CalendarView />

      <div className="mt-4">
        <UndeterminedSection />
      </div>

      <TaskFormDrawer open={creating} onOpenChange={setCreating} />
    </div>
  );
}
