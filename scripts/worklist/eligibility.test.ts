import { describe, expect, it } from "vitest";
import { isEligibleRow, selectEligibleRows } from "./eligibility";
import type { SheetRow } from "./types";

function row(overrides: Partial<SheetRow> = {}): SheetRow {
  return { rowNumber: 2, date: "2026-09-14", item: "테스트 항목", target: "YES", result: "", note: "", ...overrides };
}

describe("isEligibleRow", () => {
  const today = "2026-09-14";

  it("는 날짜/작업대상/결과 조건을 모두 만족하면 true", () => {
    expect(isEligibleRow(row(), today)).toBe(true);
  });

  it("는 작업대상 대소문자를 구분하지 않는다", () => {
    expect(isEligibleRow(row({ target: "yes" }), today)).toBe(true);
    expect(isEligibleRow(row({ target: "Yes" }), today)).toBe(true);
  });

  it("는 미래 날짜 행은 제외한다", () => {
    expect(isEligibleRow(row({ date: "2026-09-15" }), today)).toBe(false);
  });

  it("는 과거 날짜 행은 포함한다", () => {
    expect(isEligibleRow(row({ date: "2026-09-01" }), today)).toBe(true);
  });

  it("는 작업대상이 YES가 아니면 제외한다", () => {
    expect(isEligibleRow(row({ target: "NO" }), today)).toBe(false);
    expect(isEligibleRow(row({ target: "" }), today)).toBe(false);
  });

  it("는 결과가 이미 채워져 있으면 제외한다 (완료/실패/승인대기 공통)", () => {
    expect(isEligibleRow(row({ result: "완료" }), today)).toBe(false);
    expect(isEligibleRow(row({ result: "실패" }), today)).toBe(false);
    expect(isEligibleRow(row({ result: "승인대기" }), today)).toBe(false);
    expect(isEligibleRow(row({ result: "처리중" }), today)).toBe(false);
  });

  it("는 날짜가 비어 있으면 제외한다", () => {
    expect(isEligibleRow(row({ date: "" }), today)).toBe(false);
  });
});

describe("selectEligibleRows", () => {
  it("는 순서를 유지하며 maxRows로 잘라낸다", () => {
    const rows = [row({ rowNumber: 2 }), row({ rowNumber: 3 }), row({ rowNumber: 4 })];
    const selected = selectEligibleRows(rows, "2026-09-14", 2);
    expect(selected.map((r) => r.rowNumber)).toEqual([2, 3]);
  });

  it("는 대상이 아닌 행은 건너뛴다", () => {
    const rows = [row({ rowNumber: 2, target: "NO" }), row({ rowNumber: 3 })];
    const selected = selectEligibleRows(rows, "2026-09-14", 5);
    expect(selected.map((r) => r.rowNumber)).toEqual([3]);
  });
});
