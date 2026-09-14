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

export function loadSheetConfigFromEnv(): SheetConfig {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const sheetName = process.env.GOOGLE_SHEET_NAME;
  if (!spreadsheetId) throw new Error("GOOGLE_SHEET_ID 환경변수가 설정되지 않았습니다.");
  if (!sheetName) throw new Error("GOOGLE_SHEET_NAME 환경변수가 설정되지 않았습니다.");
  return { spreadsheetId, sheetName };
}

function createAuthClient(): JWT {
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!rawKey) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY 환경변수가 설정되지 않았습니다.");

  let credentials: { client_email: string; private_key: string };
  try {
    credentials = JSON.parse(rawKey);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY가 올바른 JSON이 아닙니다.");
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
    const url = `${SHEETS_API}/${this.config.spreadsheetId}/values/${range}`;
    const res = await this.auth.request<{ values?: string[][] }>({ url, method: "GET" });
    const values = res.data.values ?? [];

    const rows: SheetRow[] = [];
    for (let i = FIRST_DATA_ROW - 1; i < values.length; i++) {
      const [date = "", item = "", target = "", result = "", note = ""] = values[i];
      if (!date && !item && !target && !result && !note) continue;
      rows.push({ rowNumber: i + 1, date, item, target, result, note });
    }
    return rows;
  }

  /** Re-reads a single row fresh, used right before claiming it to avoid a stale-read race. */
  async readRow(rowNumber: number): Promise<SheetRow> {
    const range = encodeURIComponent(this.rangeFor(`A${rowNumber}:E${rowNumber}`));
    const url = `${SHEETS_API}/${this.config.spreadsheetId}/values/${range}`;
    const res = await this.auth.request<{ values?: string[][] }>({ url, method: "GET" });
    const [date = "", item = "", target = "", result = "", note = ""] = res.data.values?.[0] ?? [];
    return { rowNumber, date, item, target, result, note };
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
