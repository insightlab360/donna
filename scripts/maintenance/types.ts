export interface SheetRow {
  /** 1-indexed row number in the Google Sheet (row 1 is the header). */
  rowNumber: number;
  date: string;
  item: string;
  target: string;
  result: string;
  note: string;
}

export type RunStatus = "implemented" | "approval_needed" | "skipped";

export interface DbChangeInfo {
  required: boolean;
  migrationFile?: string;
  purpose?: string;
  impact?: string;
  nextSteps?: string;
}

/** Written by the Claude Code CLI run into `.maintenance/last-result.json`. */
export interface ClaudeTaskResult {
  status: RunStatus;
  note: string;
  dbChange?: DbChangeInfo;
}

export type RowOutcome =
  | { kind: "completed" }
  | { kind: "approval_pending"; note: string }
  | { kind: "failed"; note: string };
