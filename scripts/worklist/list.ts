import { selectEligibleRows } from "./eligibility";
import { todayKST } from "./kst";
import { loadSheetConfigFromEnv, MaintenanceSheet } from "./sheets";

/**
 * Read-only. Prints rows from the worklist Google Sheet so they can be reviewed
 * and acted on manually (in a Claude Code chat), rather than by any unattended job.
 *
 *   npx tsx scripts/worklist/list.ts            # only eligible rows (날짜<=오늘, 작업대상=YES, 결과 비어있음)
 *   npx tsx scripts/worklist/list.ts --all       # every non-empty row, regardless of eligibility
 */
async function main(): Promise<void> {
  const showAll = process.argv.includes("--all");
  const config = loadSheetConfigFromEnv();
  const sheet = new MaintenanceSheet(config);

  const rows = await sheet.readRows();
  const today = todayKST();
  const output = showAll ? rows : selectEligibleRows(rows, today, rows.length);

  if (output.length === 0) {
    console.log(showAll ? "시트에 행이 없습니다." : `처리 대상 행이 없습니다 (기준일 ${today}).`);
    return;
  }

  for (const row of output) {
    console.log(`행 ${row.rowNumber} | 날짜: ${row.date} | 작업대상: ${row.target} | 결과: ${row.result || "(비어있음)"}`);
    console.log(`  개선항목: ${row.item}`);
    if (row.note) console.log(`  비고: ${row.note}`);
  }
}

main().catch((err) => {
  console.error("시트 조회 실패:", err instanceof Error ? err.message : err);
  process.exit(1);
});
