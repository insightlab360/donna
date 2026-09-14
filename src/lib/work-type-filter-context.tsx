"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { WorkTypeFilterValue } from "@/components/ui/WorkTypeFilterBar";

interface WorkTypeFilterContextValue {
  workTypeFilter: WorkTypeFilterValue;
  setWorkTypeFilter: (value: WorkTypeFilterValue) => void;
}

const WorkTypeFilterContext = createContext<WorkTypeFilterContextValue | null>(null);

/**
 * 업무종류(전체/회사/개인프로젝트/개인) 선택을 오늘/캘린더/Task 페이지가 공유하도록 하는 상위 레벨 상태.
 * 페이지별 로컬 상태가 아니라 AppShell 아래에서 공유되므로, 페이지를 이동해도 선택이 유지된다.
 */
export function WorkTypeFilterProvider({ children }: { children: ReactNode }) {
  const [workTypeFilter, setWorkTypeFilter] = useState<WorkTypeFilterValue>("all");

  return <WorkTypeFilterContext.Provider value={{ workTypeFilter, setWorkTypeFilter }}>{children}</WorkTypeFilterContext.Provider>;
}

export function useWorkTypeFilter(): WorkTypeFilterContextValue {
  const ctx = useContext(WorkTypeFilterContext);
  if (!ctx) throw new Error("useWorkTypeFilter는 WorkTypeFilterProvider 안에서만 사용할 수 있습니다.");
  return ctx;
}
