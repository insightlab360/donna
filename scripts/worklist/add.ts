import { todayKST } from "./kst";
import { loadSheetConfigFromEnv, MaintenanceSheet } from "./sheets";

/**
 * Appends a new row (오늘 날짜, 작업대상 YES) for something requested outside the
 * sheet itself, so the sheet stays the single record of every improvement item.
 *
 *   npx tsx scripts/worklist/add.ts "<개선항목>"
 */
async function main(): Promise<void> {
  const item = process.argv.slice(2).join(" ").trim();
  if (!item) {
    console.error('사용법: npx tsx scripts/worklist/add.ts "<개선항목>"');
    process.exit(1);
  }

  const config = loadSheetConfigFromEnv();
  const sheet = new MaintenanceSheet(config);
  await sheet.appendRow(todayKST(), item, "YES");
  console.log(`추가됨: ${item}`);
}

main().catch((err) => {
  console.error("시트 기록 실패:", err instanceof Error ? err.message : err);
  process.exit(1);
});
