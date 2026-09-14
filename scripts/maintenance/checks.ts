import { spawnSync } from "node:child_process";

export interface CheckResult {
  pass: boolean;
  /** Name of the first failing step, e.g. "lint" / "typecheck" / "build" / "test". */
  failedStep?: string;
  /** Tail of the failing step's output, trimmed for a Sheet cell. */
  summary?: string;
}

const STEPS: Array<{ name: string; command: string; args: string[] }> = [
  { name: "lint", command: "npm", args: ["run", "lint"] },
  { name: "typecheck", command: "npm", args: ["run", "typecheck"] },
  { name: "test", command: "npm", args: ["test"] },
  { name: "build", command: "npm", args: ["run", "build"] },
];

const SUMMARY_MAX_LEN = 400;

function tailOutput(output: string): string {
  const lines = output.trim().split("\n");
  const tail = lines.slice(-15).join("\n");
  return tail.length > SUMMARY_MAX_LEN ? tail.slice(-SUMMARY_MAX_LEN) : tail;
}

/** Runs lint / typecheck / test / build in order, stopping at the first failure. */
export function runChecks(cwd: string): CheckResult {
  for (const step of STEPS) {
    const result = spawnSync(step.command, step.args, {
      cwd,
      encoding: "utf8",
      shell: process.platform === "win32",
      env: process.env,
    });

    if (result.status !== 0) {
      const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
      return { pass: false, failedStep: step.name, summary: tailOutput(output) };
    }
  }
  return { pass: true };
}
