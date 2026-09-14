import path from "node:path";
import { runClaudeTask } from "./claudeTask";
import { runChecks } from "./checks";
import { selectEligibleRows } from "./eligibility";
import {
  changedFilesAgainstMain,
  commitAndPushToBranch,
  commitAndPushToMain,
  configureBotIdentity,
  fullDiffText,
  hasUncommittedChanges,
  resetToCleanMain,
} from "./git";
import { todayKST } from "./kst";
import { detectRiskyChange } from "./riskyDiff";
import { loadSheetConfigFromEnv, MaintenanceSheet } from "./sheets";
import type { SheetRow } from "./types";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_MAX_ROWS = 5;

interface CliOptions {
  dryRun: boolean;
  maxRows: number;
}

function parseArgs(argv: string[]): CliOptions {
  const dryRun = argv.includes("--dry-run");
  const maxRowsArg = argv.find((a) => a.startsWith("--max-rows="));
  const envMax = process.env.MAINTENANCE_MAX_ROWS ? Number(process.env.MAINTENANCE_MAX_ROWS) : undefined;
  const maxRows = maxRowsArg ? Number(maxRowsArg.split("=")[1]) : envMax ?? DEFAULT_MAX_ROWS;
  return { dryRun, maxRows: Number.isFinite(maxRows) && maxRows > 0 ? maxRows : DEFAULT_MAX_ROWS };
}

function shortSummary(item: string, max = 40): string {
  const trimmed = item.trim().replace(/\s+/g, " ");
  return trimmed.length > max ? `${trimmed.slice(0, max)}...` : trimmed;
}

async function processRow(sheet: MaintenanceSheet, row: SheetRow, dryRun: boolean): Promise<void> {
  console.log(`\n=== Row ${row.rowNumber}: ${shortSummary(row.item)} ===`);

  if (dryRun) {
    console.log("[dry-run] 처리 대상이지만 실제 실행/기록은 하지 않습니다.");
    return;
  }

  // Re-check right before claiming, in case a concurrent/duplicate run already handled it.
  const fresh = await sheet.readRow(row.rowNumber);
  if (fresh.result.trim() !== "") {
    console.log(`이미 다른 실행에서 처리됨(결과: ${fresh.result}) — 건너뜀`);
    return;
  }

  await sheet.writeResult(row.rowNumber, "처리중", "");

  let resultText = "실패";
  let note = "알 수 없는 오류";

  try {
    resetToCleanMain();
    configureBotIdentity();

    const claudeResult = runClaudeTask(REPO_ROOT, row.item);
    console.log(`Claude 처리 결과: status=${claudeResult.status}, note=${claudeResult.note}`);

    if (claudeResult.status === "approval_needed") {
      if (hasUncommittedChanges()) {
        const branch = `maintenance/pending/row-${row.rowNumber}-${Date.now()}`;
        commitAndPushToBranch(branch, `chore(maintenance): row ${row.rowNumber} 승인 대기 - ${shortSummary(row.item)}`);
        resultText = "승인대기";
        note = `${claudeResult.note} / 브랜치: ${branch}`;
        if (claudeResult.dbChange?.migrationFile) note += ` / migration: ${claudeResult.dbChange.migrationFile}`;
        if (claudeResult.dbChange?.nextSteps) note += ` / 다음 작업: ${claudeResult.dbChange.nextSteps}`;
      } else {
        resultText = "승인대기";
        note = claudeResult.note;
      }
    } else if (claudeResult.status === "implemented") {
      if (!hasUncommittedChanges()) {
        resultText = "실패";
        note = "Claude가 implemented로 보고했지만 실제 변경 내용이 없습니다.";
      } else {
        const changedFiles = changedFilesAgainstMain();
        const risk = detectRiskyChange(changedFiles, fullDiffText());

        if (risk.risky) {
          const branch = `maintenance/pending/row-${row.rowNumber}-${Date.now()}`;
          commitAndPushToBranch(branch, `chore(maintenance): row ${row.rowNumber} DB 관련 변경 감지 - ${shortSummary(row.item)}`);
          resultText = "승인대기";
          note = `자동 안전장치가 DB 관련 변경을 감지해 main 반영을 보류했습니다: ${risk.reasons.join("; ")} / 브랜치: ${branch}`;
        } else {
          const checks = runChecks(REPO_ROOT);
          if (checks.pass) {
            commitAndPushToMain(`fix(maintenance): row ${row.rowNumber} - ${shortSummary(row.item)}`);
            resultText = "완료";
            note = claudeResult.note;
          } else {
            resultText = "실패";
            note = `${checks.failedStep} 실패 / ${checks.summary?.slice(0, 300) ?? ""}`;
          }
        }
      }
    } else {
      resultText = "실패";
      note = claudeResult.note;
    }
  } catch (err) {
    resultText = "실패";
    note = `예외 발생: ${err instanceof Error ? err.message : String(err)}`;
  } finally {
    try {
      resetToCleanMain();
    } catch (err) {
      console.error("작업 트리 초기화 실패:", err);
    }
  }

  await sheet.writeResult(row.rowNumber, resultText, note.slice(0, 490));
  console.log(`Row ${row.rowNumber} -> 결과: ${resultText} / 비고: ${note}`);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  console.log(`DONNA 야간 유지보수 시작 (dryRun=${options.dryRun}, maxRows=${options.maxRows})`);

  const config = loadSheetConfigFromEnv();
  const sheet = new MaintenanceSheet(config);

  const today = todayKST();
  const allRows = await sheet.readRows();
  const eligible = selectEligibleRows(allRows, today, options.maxRows);

  console.log(`전체 ${allRows.length}행 중 처리 대상 ${eligible.length}행 (기준일 ${today})`);

  for (const row of eligible) {
    await processRow(sheet, row, options.dryRun);
  }

  console.log("\nDONNA 야간 유지보수 종료");
}

main().catch((err) => {
  console.error("야간 유지보수 실행 실패:", err);
  process.exit(1);
});
