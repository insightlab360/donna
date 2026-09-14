/**
 * Defense-in-depth safety net: even if Claude self-reports "implemented", never let a
 * change touching the DB surface reach `main` automatically. This scans the actual
 * git diff independently of whatever Claude said about itself.
 */

const RISKY_PATH_PATTERNS: RegExp[] = [/^supabase\/migrations\//, /^supabase\/schema\.sql$/];

const RISKY_CONTENT_PATTERNS: RegExp[] = [
  /\bALTER\s+TABLE\b/i,
  /\bDROP\s+(TABLE|COLUMN|INDEX|POLICY)\b/i,
  /\bCREATE\s+TABLE\b/i,
  /\bCREATE\s+(UNIQUE\s+)?INDEX\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bTRUNCATE\b/i,
  /\bROW\s+LEVEL\s+SECURITY\b/i,
  /\bCREATE\s+POLICY\b/i,
  /\bALTER\s+POLICY\b/i,
  /\bDROP\s+POLICY\b/i,
];

export interface RiskyDiffResult {
  risky: boolean;
  reasons: string[];
}

export function detectRiskyChange(changedFiles: string[], diffText: string): RiskyDiffResult {
  const reasons: string[] = [];

  for (const file of changedFiles) {
    if (RISKY_PATH_PATTERNS.some((re) => re.test(file))) {
      reasons.push(`DB 관련 경로 변경: ${file}`);
    }
  }

  for (const pattern of RISKY_CONTENT_PATTERNS) {
    if (pattern.test(diffText)) {
      reasons.push(`위험 키워드 감지: ${pattern.source}`);
    }
  }

  return { risky: reasons.length > 0, reasons };
}
