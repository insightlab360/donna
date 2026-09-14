export interface SheetRow {
  /** 1-indexed row number in the Google Sheet (row 1 is the header). */
  rowNumber: number;
  date: string;
  item: string;
  target: string;
  result: string;
  note: string;
}
