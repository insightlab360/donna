import { describe, expect, it } from "vitest";
import { detectRiskyChange } from "./riskyDiff";

describe("detectRiskyChange", () => {
  it("는 일반 코드 변경은 안전하다고 판단한다", () => {
    const result = detectRiskyChange(["src/components/calendar/WeekGrid.tsx"], "+  console.log('hi');");
    expect(result.risky).toBe(false);
    expect(result.reasons).toEqual([]);
  });

  it("는 supabase/migrations 경로 변경을 감지한다", () => {
    const result = detectRiskyChange(["supabase/migrations/008_add_priority.sql"], "");
    expect(result.risky).toBe(true);
    expect(result.reasons.join(" ")).toContain("supabase/migrations");
  });

  it("는 schema.sql 변경을 감지한다", () => {
    const result = detectRiskyChange(["supabase/schema.sql"], "");
    expect(result.risky).toBe(true);
  });

  it("는 diff 본문 속 위험 SQL 키워드를 감지한다", () => {
    const result = detectRiskyChange(["src/app/api/foo/route.ts"], "+ALTER TABLE tasks ADD COLUMN priority int;");
    expect(result.risky).toBe(true);
  });

  it("는 DROP POLICY 같은 RLS 변경을 감지한다", () => {
    const result = detectRiskyChange([], "+DROP POLICY tasks_select ON tasks;");
    expect(result.risky).toBe(true);
  });

  it("는 여러 이유를 모두 모은다", () => {
    const result = detectRiskyChange(["supabase/migrations/009.sql"], "+DELETE FROM tasks WHERE 1=1;");
    expect(result.reasons.length).toBeGreaterThanOrEqual(2);
  });
});
