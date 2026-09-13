import { isMultiDayTask } from "@/lib/tasks-logic";
import type { Task } from "@/lib/types";

export interface SpanBar {
  task: Task;
  startCol: number;
  endCol: number;
  lane: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
}

/** Multi-day tasks overlapping this week (7 consecutive dates), clipped to its columns and stacked into non-overlapping lanes (earliest start first). Shared by MonthGrid and WeekGrid so a task spanning several days renders once, as a bar, instead of repeating per day. */
export function computeWeekSpans(week: string[], tasks: Task[]): SpanBar[] {
  const weekStart = week[0];
  const weekEnd = week[6];

  const overlapping = tasks
    .filter(isMultiDayTask)
    .map((task) => {
      const s = task.start_date!;
      const e = task.end_date!;
      if (e < weekStart || s > weekEnd) return null;
      const clippedStart = s < weekStart ? weekStart : s;
      const clippedEnd = e > weekEnd ? weekEnd : e;
      return {
        task,
        startCol: week.indexOf(clippedStart),
        endCol: week.indexOf(clippedEnd),
        continuesBefore: s < weekStart,
        continuesAfter: e > weekEnd,
      };
    })
    .filter((v): v is { task: Task; startCol: number; endCol: number; continuesBefore: boolean; continuesAfter: boolean } => v !== null)
    .sort((a, b) => a.startCol - b.startCol || a.task.title.localeCompare(b.task.title, "ko"));

  const laneEnd: number[] = [];
  const bars: SpanBar[] = [];
  for (const item of overlapping) {
    let lane = laneEnd.findIndex((endCol) => endCol < item.startCol);
    if (lane === -1) {
      lane = laneEnd.length;
      laneEnd.push(item.endCol);
    } else {
      laneEnd[lane] = item.endCol;
    }
    bars.push({ ...item, lane });
  }
  return bars;
}
