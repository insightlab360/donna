import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import type { ClaudeTaskResult, RunStatus } from "./types";

const RESULT_DIR = ".maintenance";
const RESULT_FILE = "last-result.json";
const TIMEOUT_MS = 20 * 60 * 1000;

// Claude Code is only allowed to read/edit/search files in this run — no Bash, no
// network tools — so an automated pass can never do more than change source files.
const ALLOWED_TOOLS = "Read Edit Write Glob Grep";

function buildPrompt(improvementItem: string): string {
  return `당신은 DONNA 프로젝트(Next.js/TypeScript/Supabase)의 야간 자동 유지보수 작업을 수행합니다.
아래 개선항목 하나만 처리하세요. 다른 파일이나 기능은 건드리지 마세요.

개선항목:
"""
${improvementItem}
"""

규칙:
1. 범위를 이 개선항목으로 한정하고, 관련 없는 리팩터링이나 정리는 하지 마세요.
2. 다음 중 하나라도 해당하면 코드를 수정하지 말고 status를 "approval_needed"로 보고하세요:
   - Supabase 테이블/컬럼 생성·삭제·변경, RLS 정책 변경, 인덱스 변경, 데이터 일괄 update/delete 등 DB 변경이 필요함
   - 요구사항이 모호해서 안전하게 구현할 수 없음
   - 기존 기능에 큰 영향을 주는 대규모 구조 변경이 필요함
   - 새 npm 패키지 설치가 필요함
   이 경우 supabase/migrations/ 아래에 migration 파일(.sql)만 생성해도 되지만, 절대 실행하거나 직접 스키마를 바꾸지 마세요.
3. 위에 해당하지 않고 일반적인 코드 수정으로 안전하게 구현 가능하면 실제로 구현하고 status를 "implemented"로 보고하세요.
4. 안전하게 처리할 수 없다고 판단되면 status를 "skipped"로 보고하고 이유를 note에 남기세요.
5. 작업이 끝나면 반드시 아래 형식의 JSON 파일을 ${RESULT_DIR}/${RESULT_FILE} 경로에 작성하세요 (다른 어떤 출력보다 이 파일이 결과 판정에 사용됩니다):
{
  "status": "implemented" | "approval_needed" | "skipped",
  "note": "한국어로 1~2문장 요약",
  "dbChange": {
    "required": true | false,
    "migrationFile": "생성한 migration 파일 경로 (해당 시)",
    "purpose": "DB 변경 목적 (해당 시)",
    "impact": "예상 영향 (해당 시)",
    "nextSteps": "승인 후 해야 할 일 (해당 시)"
  }
}
dbChange가 필요 없으면 필드 자체를 생략해도 됩니다.`;
}

function repoRelative(cwd: string, ...segments: string[]): string {
  return path.join(cwd, ...segments);
}

function sanitizedEnv(): Record<string, string> {
  // Only pass through what Claude Code itself needs to run and authenticate.
  // App secrets (Supabase service role key, Resend key, etc.) are deliberately
  // withheld from this step; they're only needed later, for the build/test checks.
  const keep = [
    "NODE_ENV",
    "PATH",
    "HOME",
    "USERPROFILE",
    "APPDATA",
    "LOCALAPPDATA",
    "TEMP",
    "TMP",
    "ANTHROPIC_API_KEY",
    "CLAUDE_CODE_OAUTH_TOKEN",
  ];
  const env: Record<string, string> = {};
  for (const key of keep) {
    const value = process.env[key];
    if (value !== undefined) env[key] = value;
  }
  return env;
}

export function runClaudeTask(cwd: string, improvementItem: string): ClaudeTaskResult {
  const resultDir = repoRelative(cwd, RESULT_DIR);
  const resultPath = path.join(resultDir, RESULT_FILE);

  mkdirSync(resultDir, { recursive: true });
  if (existsSync(resultPath)) rmSync(resultPath);

  const prompt = buildPrompt(improvementItem);

  const run = spawnSync(
    "npx",
    ["--yes", "@anthropic-ai/claude-code", "-p", prompt, "--permission-mode", "bypassPermissions", "--allowedTools", ALLOWED_TOOLS],
    {
      cwd,
      encoding: "utf8",
      shell: process.platform === "win32",
      env: sanitizedEnv() as NodeJS.ProcessEnv,
      timeout: TIMEOUT_MS,
    }
  );

  if (run.error) {
    return { status: "skipped", note: `Claude Code 실행 실패: ${run.error.message}` };
  }
  if (run.status !== 0) {
    const tail = `${run.stdout ?? ""}\n${run.stderr ?? ""}`.trim().slice(-500);
    return { status: "skipped", note: `Claude Code가 비정상 종료됨(exit ${run.status}): ${tail}` };
  }

  if (!existsSync(resultPath)) {
    return { status: "skipped", note: "Claude Code가 결과 상태 파일을 생성하지 않았습니다." };
  }

  try {
    const raw = readFileSync(resultPath, "utf8");
    const parsed = JSON.parse(raw) as ClaudeTaskResult;
    const validStatuses: RunStatus[] = ["implemented", "approval_needed", "skipped"];
    if (!validStatuses.includes(parsed.status)) {
      return { status: "skipped", note: `알 수 없는 status 값: ${String(parsed.status)}` };
    }
    return parsed;
  } catch (err) {
    return { status: "skipped", note: `결과 파일 파싱 실패: ${err instanceof Error ? err.message : String(err)}` };
  }
}
