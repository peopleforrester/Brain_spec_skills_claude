// ABOUTME: Safe file system utilities for reading and writing within .brain-spec/
// ABOUTME: Enforces security boundary — only writes to .brain-spec/ and CLAUDE.md

import { promises as fs } from "node:fs";
import path from "node:path";

const ALLOWED_WRITE_DIR = ".brain-spec";
const ALLOWED_WRITE_FILE = "CLAUDE.md";

/** Check if a path is within the allowed write boundary */
export function isWriteAllowed(filePath: string, projectRoot: string): boolean {
  const resolved = path.resolve(projectRoot, filePath);
  const brainSpecDir = path.resolve(projectRoot, ALLOWED_WRITE_DIR);
  const claudeMdPath = path.resolve(projectRoot, ALLOWED_WRITE_FILE);

  return resolved.startsWith(brainSpecDir + path.sep) || resolved === claudeMdPath;
}

/** Read a file safely. Returns null if file does not exist. */
export async function readFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

/** Read and parse a JSON file. Returns null if file does not exist or is invalid. */
export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  const content = await readFile(filePath);
  if (content === null) return null;
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/** Write a file safely, enforcing the write boundary. Creates directories as needed. */
export async function writeFile(
  filePath: string,
  content: string,
  projectRoot: string,
): Promise<void> {
  if (!isWriteAllowed(filePath, projectRoot)) {
    throw new Error(
      `Write denied: ${filePath} is outside the allowed boundary (.brain-spec/ or CLAUDE.md)`,
    );
  }
  const resolved = path.resolve(projectRoot, filePath);
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, content, "utf-8");
}

/** Write a JSON file safely. */
export async function writeJsonFile(
  filePath: string,
  data: unknown,
  projectRoot: string,
): Promise<void> {
  await writeFile(filePath, JSON.stringify(data, null, 2) + "\n", projectRoot);
}

/** Check if a file exists */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/** Check if a directory exists */
export async function dirExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/** Create a directory recursively */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/** List files in a directory. Returns empty array if directory doesn't exist. */
export async function listFiles(dirPath: string): Promise<string[]> {
  try {
    return await fs.readdir(dirPath);
  } catch {
    return [];
  }
}

/** Delete a file. Silently succeeds if file doesn't exist. */
export async function deleteFile(
  filePath: string,
  projectRoot: string,
): Promise<void> {
  if (!isWriteAllowed(filePath, projectRoot)) {
    throw new Error(
      `Delete denied: ${filePath} is outside the allowed boundary (.brain-spec/ or CLAUDE.md)`,
    );
  }
  const resolved = path.resolve(projectRoot, filePath);
  try {
    await fs.unlink(resolved);
  } catch {
    // File already doesn't exist — that's fine
  }
}

/** Delete a directory recursively. Enforces write boundary. */
export async function deleteDir(
  dirPath: string,
  projectRoot: string,
): Promise<void> {
  const resolved = path.resolve(projectRoot, dirPath);
  const brainSpecDir = path.resolve(projectRoot, ALLOWED_WRITE_DIR);

  if (!resolved.startsWith(brainSpecDir + path.sep)) {
    throw new Error(
      `Delete denied: ${dirPath} is outside the allowed boundary (.brain-spec/)`,
    );
  }
  try {
    await fs.rm(resolved, { recursive: true, force: true });
  } catch {
    // Directory already doesn't exist
  }
}

/** Copy a directory recursively within allowed boundaries */
export async function copyDir(
  srcDir: string,
  destDir: string,
  projectRoot: string,
): Promise<void> {
  const resolvedDest = path.resolve(projectRoot, destDir);
  const brainSpecDir = path.resolve(projectRoot, ALLOWED_WRITE_DIR);

  if (!resolvedDest.startsWith(brainSpecDir + path.sep)) {
    throw new Error(
      `Copy denied: destination ${destDir} is outside the allowed boundary (.brain-spec/)`,
    );
  }
  await fs.cp(srcDir, resolvedDest, { recursive: true });
}

/** Move a directory within .brain-spec/ (for archiving) */
export async function moveDir(
  srcDir: string,
  destDir: string,
  projectRoot: string,
): Promise<void> {
  await copyDir(srcDir, destDir, projectRoot);
  await deleteDir(srcDir, projectRoot);
}
