// ABOUTME: Read-only git integration utilities for commit enrichment and project detection
// ABOUTME: Never modifies the repository — only reads log, branch, diff stats, and rev-parse

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { GitReference } from "../types.js";

const execFileAsync = promisify(execFile);

/** Execute a git command and return stdout. Returns null on failure. */
async function gitExec(args: string[], cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd,
      timeout: 5000,
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

/** Check if the given directory is inside a git work tree */
export async function isGitRepo(cwd: string): Promise<boolean> {
  const result = await gitExec(["rev-parse", "--is-inside-work-tree"], cwd);
  return result === "true";
}

/** Find the git repository root directory */
export async function getGitRoot(cwd: string): Promise<string | null> {
  return gitExec(["rev-parse", "--show-toplevel"], cwd);
}

/** Get the current branch name */
export async function getCurrentBranch(cwd: string): Promise<string | null> {
  return gitExec(["branch", "--show-current"], cwd);
}

/** Get the HEAD commit SHA */
export async function getHeadCommit(cwd: string): Promise<string | null> {
  return gitExec(["rev-parse", "HEAD"], cwd);
}

/** Get the HEAD commit timestamp in ISO format */
export async function getHeadTimestamp(cwd: string): Promise<string | null> {
  return gitExec(["log", "-1", "--format=%cI"], cwd);
}

/** Get diff stats for the last commit (lines added/removed) */
export async function getDiffStats(
  cwd: string,
): Promise<{ added: number; removed: number } | null> {
  const result = await gitExec(["diff", "--stat", "--numstat", "HEAD~1", "HEAD"], cwd);
  if (!result) return null;

  let added = 0;
  let removed = 0;

  for (const line of result.split("\n")) {
    const match = line.match(/^(\d+)\s+(\d+)\s+/);
    if (match) {
      added += parseInt(match[1], 10);
      removed += parseInt(match[2], 10);
    }
  }

  return { added, removed };
}

/** Get a full git reference for the current HEAD */
export async function getGitReference(cwd: string): Promise<GitReference | null> {
  const [commitSha, branch, timestamp] = await Promise.all([
    getHeadCommit(cwd),
    getCurrentBranch(cwd),
    getHeadTimestamp(cwd),
  ]);

  if (!commitSha || !branch || !timestamp) return null;

  return { commitSha, branch, timestamp };
}
