import type { TaskStatus } from "./types";

/**
 * Task 진행현황을 표시하는 모든 곳(캘린더 칩/바, task 요약카드의 배지·드롭다운)이 공유하는
 * 색상 — 테두리 스타일, 취소선, 굵기 변화 없이 흰색→회색 음영(진행중만 옅은 하늘색)으로
 * 진행 단계를 나타낸다.
 */
export const STATUS_CHIP_STYLE: Record<TaskStatus, string> = {
  예정: "border border-neutral-200 bg-white text-neutral-700",
  진행중: "border border-sky-200 bg-sky-100 text-sky-900",
  완료: "border border-neutral-300 bg-neutral-300 text-neutral-700",
  보류: "border border-neutral-200 bg-neutral-200 text-neutral-600",
  드랍: "border border-neutral-50 bg-neutral-50 text-neutral-300",
};

/** 우선순위가 높은 프로젝트/Task의 제목 색상 — 형광 없는 차분한 톤. `!` 로 다른 text-* 클래스보다 항상 우선한다. */
export const PRIORITY_TEXT_CLASS = "!text-red-800";
