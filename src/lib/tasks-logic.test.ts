import { describe, expect, it } from "vitest";
import { isDateInYearQuarter, projectMatchesYearQuarter, quarterOfDate, taskMatchesYearQuarter } from "./tasks-logic";
import type { Project, Task } from "./types";

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    user_id: "u1",
    work_type: "회사",
    title: "테스트 Task",
    project_id: null,
    date_mode: "date",
    start_date: "2026-09-14",
    start_time: null,
    end_date: null,
    end_time: null,
    due_date: "2026-09-14",
    status: "예정",
    priority: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    user_id: "u1",
    name: "테스트 프로젝트",
    work_type: "회사",
    start_date: null,
    end_date: null,
    status: "예정",
    priority: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("quarterOfDate", () => {
  it("는 월을 분기로 변환한다", () => {
    expect(quarterOfDate("2026-01-15")).toBe(1);
    expect(quarterOfDate("2026-03-31")).toBe(1);
    expect(quarterOfDate("2026-04-01")).toBe(2);
    expect(quarterOfDate("2026-06-30")).toBe(2);
    expect(quarterOfDate("2026-07-01")).toBe(3);
    expect(quarterOfDate("2026-09-30")).toBe(3);
    expect(quarterOfDate("2026-10-01")).toBe(4);
    expect(quarterOfDate("2026-12-31")).toBe(4);
  });
});

describe("isDateInYearQuarter", () => {
  it("는 연도만 맞으면 quarter가 all일 때 매치한다", () => {
    expect(isDateInYearQuarter("2026-09-14", 2026, "all")).toBe(true);
    expect(isDateInYearQuarter("2025-09-14", 2026, "all")).toBe(false);
  });

  it("는 연도와 분기가 모두 맞아야 매치한다", () => {
    expect(isDateInYearQuarter("2026-09-14", 2026, 3)).toBe(true);
    expect(isDateInYearQuarter("2026-09-14", 2026, 4)).toBe(false);
    expect(isDateInYearQuarter("2026-09-14", 2025, 3)).toBe(false);
  });
});

describe("taskMatchesYearQuarter", () => {
  it("는 due_date가 없으면 false", () => {
    expect(taskMatchesYearQuarter(task({ due_date: null }), 2026, "all")).toBe(false);
  });

  it("는 due_date 기준으로 판단한다", () => {
    expect(taskMatchesYearQuarter(task({ due_date: "2026-09-14" }), 2026, 3)).toBe(true);
    expect(taskMatchesYearQuarter(task({ due_date: "2026-09-14" }), 2026, 1)).toBe(false);
  });
});

describe("projectMatchesYearQuarter", () => {
  it("는 프로젝트 자체에 날짜가 있으면 그 날짜로 판단하고 Task는 무시한다", () => {
    const p = project({ start_date: "2026-02-01" });
    const tasksInQ3 = [task({ due_date: "2026-09-14" })];
    expect(projectMatchesYearQuarter(p, tasksInQ3, 2026, 1)).toBe(true);
    expect(projectMatchesYearQuarter(p, tasksInQ3, 2026, 3)).toBe(false);
  });

  it("는 프로젝트에 날짜가 없으면 Task 날짜를 따른다 (하나라도 매치하면 true)", () => {
    const p = project({ start_date: null, end_date: null });
    const tasks = [task({ due_date: "2026-02-01" }), task({ due_date: "2026-09-14" })];
    expect(projectMatchesYearQuarter(p, tasks, 2026, 1)).toBe(true);
    expect(projectMatchesYearQuarter(p, tasks, 2026, 3)).toBe(true);
    expect(projectMatchesYearQuarter(p, tasks, 2026, 4)).toBe(false);
  });

  it("는 프로젝트에 날짜도 없고 Task도 없으면 false", () => {
    const p = project({ start_date: null, end_date: null });
    expect(projectMatchesYearQuarter(p, [], 2026, "all")).toBe(false);
  });
});
