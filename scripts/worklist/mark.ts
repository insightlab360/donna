import { loadSheetConfigFromEnv, MaintenanceSheet } from "./sheets";

const VALID_RESULTS = ["완료", "실패", "승인대기"];

/**
 * Writes 결과/비고 back to one row after it's been handled (by a human, in a chat).
 *
 *   npx tsx scripts/worklist/mark.ts <행번호> <완료|실패|승인대기> "<비고>"
 */
async function main(): Promise<void> {
  const [rowArg, result, note = ""] = process.argv.slice(2);
  const rowNumber = Number(rowArg);

  if (!rowNumber || !Number.isInteger(rowNumber) || rowNumber < 2) {
    console.error('사용법: npx tsx scripts/worklist/mark.ts <행번호> <완료|실패|승인대기> "<비고>"');
    process.exit(1);
  }
  if (!VALID_RESULTS.includes(result)) {
    console.error(`결과 값은 ${VALID_RESULTS.join(" / ")} 중 하나여야 합니다.`);
    process.exit(1);
  }

  const config = loadSheetConfigFromEnv();
  const sheet = new MaintenanceSheet(config);
  await sheet.writeResult(rowNumber, result, note);
  console.log(`행 ${rowNumber} -> 결과: ${result}${note ? ` / 비고: ${note}` : ""}`);
}

main().catch((err) => {
  console.error("시트 기록 실패:", err instanceof Error ? err.message : err);
  process.exit(1);
});
