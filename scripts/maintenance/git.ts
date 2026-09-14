import { execFileSync } from "node:child_process";

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

/** Discards any local changes and brings the working tree back to a clean origin/main. */
export function resetToCleanMain(): void {
  git(["fetch", "origin", "main"]);
  git(["reset", "--hard", "origin/main"]);
  git(["clean", "-fd"]);
}

export function hasUncommittedChanges(): boolean {
  return git(["status", "--porcelain"]).length > 0;
}

export function changedFilesAgainstMain(): string[] {
  const tracked = git(["diff", "--name-only", "origin/main"]);
  const untracked = git(["ls-files", "--others", "--exclude-standard"]);
  const files = [...tracked.split("\n"), ...untracked.split("\n")].map((f) => f.trim()).filter(Boolean);
  return Array.from(new Set(files));
}

export function fullDiffText(): string {
  const tracked = git(["diff", "origin/main"]);
  return tracked;
}

export function configureBotIdentity(): void {
  git(["config", "user.name", "donna-maintenance-bot"]);
  git(["config", "user.email", "crys0107@gmail.com"]);
}

const COMMIT_TRAILER = "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>";

export function commitAndPushToMain(message: string): void {
  git(["add", "-A"]);
  git(["commit", "-m", `${message}\n\n${COMMIT_TRAILER}`]);
  git(["push", "origin", "HEAD:main"]);
}

export function commitAndPushToBranch(branchName: string, message: string): void {
  git(["add", "-A"]);
  git(["checkout", "-b", branchName]);
  git(["commit", "-m", `${message}\n\n${COMMIT_TRAILER}`]);
  git(["push", "origin", `HEAD:${branchName}`, "--force"]);
  // Caller resets back to a clean origin/main afterwards (see resetToCleanMain) —
  // no need to switch back here, and no local "main" branch is guaranteed to exist.
}
