import { readFileSync } from "node:fs";
import { JWT } from "google-auth-library";
import type { SheetRow } from "./types";

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

// 날짜 | 개선항목 | 작업대상 | 결과 | 비고
const COLUMN_RANGE = "A:E";
const FIRST_DATA_ROW = 2;

export interface SheetConfig {
  spreadsheetId: string;
  sheetName: string;
}

// Google Sheets' date serial epoch (day 0 = 1899-12-30, matching Sheets/Excel's convention).
const SHEETS_EPOCH_UTC_MS = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 86400000;

/**
 * A 날짜 cell typed as e.g. "9/14" is stored by Sheets as a real date (with the
 * correct year filled in automatically), but only shows up as a bare serial number
 * unless read with valueRenderOption=UNFORMATTED_VALUE — its *display* format (which
 * may omit the year) is irrelevant here, only the underlying value matters.
 */
function serialToIsoDate(serial: number): string {
  const ms = SHEETS_EPOCH_UTC_MS + Math.round(serial) * MS_PER_DAY;
  return new Date(ms).toISOString().slice(0, 10);
}

function cellToText(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function cellToDateText(value: unknown): string {
  if (typeof value === "number") return serialToIsoDate(value);
  return cellToText(value);
}

export function loadSheetConfigFromEnv(): SheetConfig {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const sheetName = process.env.GOOGLE_SHEET_NAME;
  if (!spreadsheetId) throw new Error("GOOGLE_SHEET_ID 환경변수가 설정되지 않았습니다.");
  if (!sheetName) throw new Error("GOOGLE_SHEET_NAME 환경변수가 설정되지 않았습니다.");
  return { spreadsheetId, sheetName };
}

function readServiceAccountJson(): string {
  const filePath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;
  if (filePath) {
    try {
      return readFileSync(filePath, "utf8");
    } catch (err) {
      throw new Error(`GOOGLE_SERVICE_ACCOUNT_KEY_FILE(${filePath})을 읽을 수 없습니다: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (rawKey) return rawKey;

  throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY_FILE 또는 GOOGLE_SERVICE_ACCOUNT_KEY 환경변수가 설정되지 않았습니다.");
}

function createAuthClient(): JWT {
  const rawKey = readServiceAccountJson();

  let credentials: { client_email: string; private_key: string };
  try {
    credentials = JSON.parse(rawKey);
  } catch {
    throw new Error("서비스 계정 키가 올바른 JSON이 아닙니다.");
  }

  return new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export class MaintenanceSheet {
  private auth: JWT;
  private config: SheetConfig;

  constructor(config: SheetConfig, auth: JWT = createAuthClient()) {
    this.config = config;
    this.auth = auth;
  }

  private rangeFor(a1Range: string): string {
    return `'${this.config.sheetName}'!${a1Range}`;
  }

  async readRows(): Promise<SheetRow[]> {
    const range = encodeURIComponent(this.rangeFor(COLUMN_RANGE));
    const url = `${SHEETS_API}/${this.config.spreadsheetId}/values/${range}?valueRenderOption=UNFORMATTED_VALUE`;
    const res = await this.auth.request<{ values?: unknown[][] }>({ url, method: "GET" });
    const values = res.data.values ?? [];

    const rows: SheetRow[] = [];
    for (let i = FIRST_DATA_ROW - 1; i < values.length; i++) {
      const [dateCell, itemCell, targetCell, resultCell, noteCell] = values[i] ?? [];
      const date = cellToDateText(dateCell);
      const item = cellToText(itemCell);
      const target = cellToText(targetCell);
      const result = cellToText(resultCell);
      const note = cellToText(noteCell);
      if (!date && !item && !target && !result && !note) continue;
      rows.push({ rowNumber: i + 1, date, item, target, result, note });
    }
    return rows;
  }

  /** Re-reads a single row fresh, used right before claiming it to avoid a stale-read race. */
  async readRow(rowNumber: number): Promise<SheetRow> {
    const range = encodeURIComponent(this.rangeFor(`A${rowNumber}:E${rowNumber}`));
    const url = `${SHEETS_API}/${this.config.spreadsheetId}/values/${range}?valueRenderOption=UNFORMATTED_VALUE`;
    const res = await this.auth.request<{ values?: unknown[][] }>({ url, method: "GET" });
    const [dateCell, itemCell, targetCell, resultCell, noteCell] = res.data.values?.[0] ?? [];
    return {
      rowNumber,
      date: cellToDateText(dateCell),
      item: cellToText(itemCell),
      target: cellToText(targetCell),
      result: cellToText(resultCell),
      note: cellToText(noteCell),
    };
  }

  async writeResult(rowNumber: number, result: string, note: string): Promise<void> {
    const range = encodeURIComponent(this.rangeFor(`D${rowNumber}:E${rowNumber}`));
    const url = `${SHEETS_API}/${this.config.spreadsheetId}/values/${range}?valueInputOption=RAW`;
    await this.auth.request({
      url,
      method: "PUT",
      data: { values: [[result, note]] },
    });
  }
}
