import { compareDateStr } from "./kst";
import type { SheetRow } from "./types";

/**
 * A row is eligible for automatic processing when:
 * 1. 날짜 <= 실행일(KST)
 * 2. 작업대상 = YES (대소문자 무관)
 * 3. 결과가 비어 있음 (완료/실패/승인대기 등 이미 처리된 행은 제외)
 */
export function isEligibleRow(row: SheetRow, todayKst: string): boolean {
  const date = row.date.trim();
  const target = row.target.trim().toLowerCase();
  const result = row.result.trim();

  if (!date) return false;
  if (compareDateStr(date, todayKst) > 0) return false;
  if (target !== "yes") return false;
  if (result !== "") return false;
  return true;
}

export function selectEligibleRows(rows: SheetRow[], todayKst: string, maxRows: number): SheetRow[] {
  return rows.filter((row) => isEligibleRow(row, todayKst)).slice(0, Math.max(0, maxRows));
}
