// ABOUTME: Unit tests for file-system utility functions
// ABOUTME: Tests security boundary enforcement, read/write ops, and directory management using real temp dirs

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

import {
  isWriteAllowed,
  readFile,
  readJsonFile,
  writeFile,
  writeJsonFile,
  fileExists,
  dirExists,
  ensureDir,
  listFiles,
  deleteFile,
  deleteDir,
  copyDir,
  moveDir,
} from "../../src/utils/file-system.js";

/** Create a unique temp directory for each test */
function createTempDir(): string {
  const id = crypto.randomBytes(8).toString("hex");
  return path.join(os.tmpdir(), `brain-spec-test-${id}`);
}

describe("file-system utilities", () => {
  let projectRoot: string;
  let brainSpecDir: string;

  beforeEach(async () => {
    projectRoot = createTempDir();
    brainSpecDir = path.join(projectRoot, ".brain-spec");
    await fs.mkdir(brainSpecDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(projectRoot, { recursive: true, force: true });
  });

  // ---------------------------------------------------------------
  // isWriteAllowed
  // ---------------------------------------------------------------
  describe("isWriteAllowed", () => {
    it("should allow paths inside .brain-spec/", () => {
      const filePath = path.join(projectRoot, ".brain-spec", "specs", "my-spec.md");
      expect(isWriteAllowed(filePath, projectRoot)).toBe(true);
    });

    it("should allow paths deeply nested inside .brain-spec/", () => {
      const filePath = path.join(projectRoot, ".brain-spec", "specs", "auth", "tasks.json");
      expect(isWriteAllowed(filePath, projectRoot)).toBe(true);
    });

    it("should allow CLAUDE.md at the project root", () => {
      const filePath = path.join(projectRoot, "CLAUDE.md");
      expect(isWriteAllowed(filePath, projectRoot)).toBe(true);
    });

    it("should deny paths outside .brain-spec/ and not CLAUDE.md", () => {
      const filePath = path.join(projectRoot, "src", "index.ts");
      expect(isWriteAllowed(filePath, projectRoot)).toBe(false);
    });

    it("should deny writes to root-level files that are not CLAUDE.md", () => {
      const filePath = path.join(projectRoot, "package.json");
      expect(isWriteAllowed(filePath, projectRoot)).toBe(false);
    });

    it("should deny paths that try directory traversal", () => {
      const filePath = path.join(projectRoot, ".brain-spec", "..", "evil.txt");
      expect(isWriteAllowed(filePath, projectRoot)).toBe(false);
    });

    it("should deny .brain-spec directory path itself (without trailing separator)", () => {
      // The resolved path equals brainSpecDir exactly, which does NOT start with
      // brainSpecDir + path.sep, so it should be denied.
      const filePath = path.join(projectRoot, ".brain-spec");
      expect(isWriteAllowed(filePath, projectRoot)).toBe(false);
    });

    it("should deny a file named .brain-spec-extra at project root", () => {
      const filePath = path.join(projectRoot, ".brain-spec-extra");
      expect(isWriteAllowed(filePath, projectRoot)).toBe(false);
    });

    it("should handle relative paths by resolving them", () => {
      // Relative path ".brain-spec/foo.md" resolved against projectRoot
      const result = isWriteAllowed(".brain-spec/foo.md", projectRoot);
      expect(result).toBe(true);
    });

    it("should deny relative paths outside boundary", () => {
      const result = isWriteAllowed("src/main.ts", projectRoot);
      expect(result).toBe(false);
    });
  });

  // ---------------------------------------------------------------
  // readFile
  // ---------------------------------------------------------------
  describe("readFile", () => {
    it("should read an existing file and return its content", async () => {
      const filePath = path.join(projectRoot, "test-read.txt");
      await fs.writeFile(filePath, "hello world", "utf-8");

      const content = await readFile(filePath);
      expect(content).toBe("hello world");
    });

    it("should return null for a non-existent file", async () => {
      const filePath = path.join(projectRoot, "does-not-exist.txt");
      const content = await readFile(filePath);
      expect(content).toBeNull();
    });

    it("should read an empty file and return empty string", async () => {
      const filePath = path.join(projectRoot, "empty.txt");
      await fs.writeFile(filePath, "", "utf-8");

      const content = await readFile(filePath);
      expect(content).toBe("");
    });

    it("should read files with unicode content", async () => {
      const filePath = path.join(projectRoot, "unicode.txt");
      const unicodeContent = "Hello, World! Cafe\u0301 \u2014 \u00e9\u00e8\u00ea\u00eb";
      await fs.writeFile(filePath, unicodeContent, "utf-8");

      const content = await readFile(filePath);
      expect(content).toBe(unicodeContent);
    });
  });

  // ---------------------------------------------------------------
  // readJsonFile
  // ---------------------------------------------------------------
  describe("readJsonFile", () => {
    it("should read and parse a valid JSON file", async () => {
      const filePath = path.join(projectRoot, "data.json");
      const data = { name: "test", version: 1 };
      await fs.writeFile(filePath, JSON.stringify(data), "utf-8");

      const result = await readJsonFile<{ name: string; version: number }>(filePath);
      expect(result).toEqual(data);
    });

    it("should return null for a non-existent JSON file", async () => {
      const filePath = path.join(projectRoot, "missing.json");
      const result = await readJsonFile(filePath);
      expect(result).toBeNull();
    });

    it("should return null for invalid JSON content", async () => {
      const filePath = path.join(projectRoot, "bad.json");
      await fs.writeFile(filePath, "this is not json {{{", "utf-8");

      const result = await readJsonFile(filePath);
      expect(result).toBeNull();
    });

    it("should handle JSON arrays", async () => {
      const filePath = path.join(projectRoot, "array.json");
      const data = [1, 2, 3];
      await fs.writeFile(filePath, JSON.stringify(data), "utf-8");

      const result = await readJsonFile<number[]>(filePath);
      expect(result).toEqual([1, 2, 3]);
    });
  });

  // ---------------------------------------------------------------
  // writeFile (boundary enforcement)
  // ---------------------------------------------------------------
  describe("writeFile", () => {
    it("should write a file inside .brain-spec/", async () => {
      const filePath = path.join(projectRoot, ".brain-spec", "test.md");
      await writeFile(filePath, "# Test", projectRoot);

      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toBe("# Test");
    });

    it("should create intermediate directories when writing", async () => {
      const filePath = path.join(projectRoot, ".brain-spec", "specs", "auth", "spec.md");
      await writeFile(filePath, "auth spec", projectRoot);

      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toBe("auth spec");
    });

    it("should allow writing to CLAUDE.md at project root", async () => {
      const filePath = path.join(projectRoot, "CLAUDE.md");
      await writeFile(filePath, "# Project Rules", projectRoot);

      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toBe("# Project Rules");
    });

    it("should throw when writing outside .brain-spec/ boundary", async () => {
      const filePath = path.join(projectRoot, "src", "hack.ts");
      await expect(writeFile(filePath, "bad content", projectRoot)).rejects.toThrow(
        /Write denied/,
      );
    });

    it("should throw when writing to a root-level file that is not CLAUDE.md", async () => {
      const filePath = path.join(projectRoot, "README.md");
      await expect(writeFile(filePath, "bad", projectRoot)).rejects.toThrow(/Write denied/);
    });

    it("should throw for directory traversal attempts", async () => {
      const filePath = path.join(projectRoot, ".brain-spec", "..", "escape.txt");
      await expect(writeFile(filePath, "escape", projectRoot)).rejects.toThrow(/Write denied/);
    });
  });

  // ---------------------------------------------------------------
  // writeJsonFile (boundary enforcement)
  // ---------------------------------------------------------------
  describe("writeJsonFile", () => {
    it("should write a JSON file inside .brain-spec/", async () => {
      const filePath = path.join(projectRoot, ".brain-spec", "config.json");
      const data = { version: "1.0", enabled: true };
      await writeJsonFile(filePath, data, projectRoot);

      const raw = await fs.readFile(filePath, "utf-8");
      expect(JSON.parse(raw)).toEqual(data);
    });

    it("should format JSON with 2-space indentation and trailing newline", async () => {
      const filePath = path.join(projectRoot, ".brain-spec", "format.json");
      const data = { a: 1 };
      await writeJsonFile(filePath, data, projectRoot);

      const raw = await fs.readFile(filePath, "utf-8");
      expect(raw).toBe(JSON.stringify(data, null, 2) + "\n");
    });

    it("should throw when writing JSON outside boundary", async () => {
      const filePath = path.join(projectRoot, "data.json");
      await expect(writeJsonFile(filePath, { x: 1 }, projectRoot)).rejects.toThrow(/Write denied/);
    });
  });

  // ---------------------------------------------------------------
  // ensureDir
  // ---------------------------------------------------------------
  describe("ensureDir", () => {
    it("should create a new directory", async () => {
      const dir = path.join(projectRoot, "new-dir");
      await ensureDir(dir);

      const stat = await fs.stat(dir);
      expect(stat.isDirectory()).toBe(true);
    });

    it("should create nested directories recursively", async () => {
      const dir = path.join(projectRoot, "a", "b", "c");
      await ensureDir(dir);

      const stat = await fs.stat(dir);
      expect(stat.isDirectory()).toBe(true);
    });

    it("should not throw if directory already exists", async () => {
      const dir = path.join(projectRoot, "existing");
      await fs.mkdir(dir, { recursive: true });

      await expect(ensureDir(dir)).resolves.toBeUndefined();
    });
  });

  // ---------------------------------------------------------------
  // fileExists
  // ---------------------------------------------------------------
  describe("fileExists", () => {
    it("should return true for an existing file", async () => {
      const filePath = path.join(projectRoot, "exists.txt");
      await fs.writeFile(filePath, "content", "utf-8");

      expect(await fileExists(filePath)).toBe(true);
    });

    it("should return false for a non-existent file", async () => {
      const filePath = path.join(projectRoot, "ghost.txt");
      expect(await fileExists(filePath)).toBe(false);
    });

    it("should return true for a directory (access check only)", async () => {
      // fileExists uses fs.access which succeeds for directories too
      expect(await fileExists(projectRoot)).toBe(true);
    });
  });

  // ---------------------------------------------------------------
  // dirExists
  // ---------------------------------------------------------------
  describe("dirExists", () => {
    it("should return true for an existing directory", async () => {
      expect(await dirExists(brainSpecDir)).toBe(true);
    });

    it("should return false for a non-existent directory", async () => {
      const dir = path.join(projectRoot, "no-such-dir");
      expect(await dirExists(dir)).toBe(false);
    });

    it("should return false when path is a file, not a directory", async () => {
      const filePath = path.join(projectRoot, "a-file.txt");
      await fs.writeFile(filePath, "content", "utf-8");

      expect(await dirExists(filePath)).toBe(false);
    });
  });

  // ---------------------------------------------------------------
  // listFiles
  // ---------------------------------------------------------------
  describe("listFiles", () => {
    it("should list files in a directory", async () => {
      await fs.writeFile(path.join(brainSpecDir, "a.txt"), "a", "utf-8");
      await fs.writeFile(path.join(brainSpecDir, "b.txt"), "b", "utf-8");

      const files = await listFiles(brainSpecDir);
      expect(files).toContain("a.txt");
      expect(files).toContain("b.txt");
      expect(files).toHaveLength(2);
    });

    it("should return empty array for non-existent directory", async () => {
      const dir = path.join(projectRoot, "nope");
      const files = await listFiles(dir);
      expect(files).toEqual([]);
    });

    it("should return empty array for empty directory", async () => {
      const dir = path.join(projectRoot, "empty-dir");
      await fs.mkdir(dir, { recursive: true });

      const files = await listFiles(dir);
      expect(files).toEqual([]);
    });

    it("should include subdirectory names", async () => {
      await fs.mkdir(path.join(brainSpecDir, "subdir"), { recursive: true });
      await fs.writeFile(path.join(brainSpecDir, "file.txt"), "x", "utf-8");

      const files = await listFiles(brainSpecDir);
      expect(files).toContain("subdir");
      expect(files).toContain("file.txt");
    });
  });

  // ---------------------------------------------------------------
  // deleteFile
  // ---------------------------------------------------------------
  describe("deleteFile", () => {
    it("should delete a file inside .brain-spec/", async () => {
      const filePath = path.join(projectRoot, ".brain-spec", "to-delete.txt");
      await fs.writeFile(filePath, "bye", "utf-8");

      await deleteFile(filePath, projectRoot);
      const exists = await fileExists(filePath);
      expect(exists).toBe(false);
    });

    it("should silently succeed when file does not exist", async () => {
      const filePath = path.join(projectRoot, ".brain-spec", "nonexistent.txt");
      await expect(deleteFile(filePath, projectRoot)).resolves.toBeUndefined();
    });

    it("should throw when deleting file outside boundary", async () => {
      const filePath = path.join(projectRoot, "src", "main.ts");
      await expect(deleteFile(filePath, projectRoot)).rejects.toThrow(/Delete denied/);
    });

    it("should allow deleting CLAUDE.md", async () => {
      const filePath = path.join(projectRoot, "CLAUDE.md");
      await fs.writeFile(filePath, "# Rules", "utf-8");

      await deleteFile(filePath, projectRoot);
      const exists = await fileExists(filePath);
      expect(exists).toBe(false);
    });
  });

  // ---------------------------------------------------------------
  // deleteDir
  // ---------------------------------------------------------------
  describe("deleteDir", () => {
    it("should delete a directory inside .brain-spec/", async () => {
      const dir = path.join(projectRoot, ".brain-spec", "specs", "old-spec");
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, "data.json"), "{}", "utf-8");

      await deleteDir(path.join(projectRoot, ".brain-spec", "specs", "old-spec"), projectRoot);
      const exists = await dirExists(dir);
      expect(exists).toBe(false);
    });

    it("should silently succeed when directory does not exist", async () => {
      const dir = path.join(projectRoot, ".brain-spec", "missing");
      await expect(deleteDir(dir, projectRoot)).resolves.toBeUndefined();
    });

    it("should throw when deleting directory outside .brain-spec/", async () => {
      const dir = path.join(projectRoot, "src");
      await expect(deleteDir(dir, projectRoot)).rejects.toThrow(/Delete denied/);
    });

    it("should throw when deleting .brain-spec/ root itself", async () => {
      // .brain-spec resolves to brainSpecDir, which does NOT start with brainSpecDir + sep
      await expect(
        deleteDir(path.join(projectRoot, ".brain-spec"), projectRoot),
      ).rejects.toThrow(/Delete denied/);
    });
  });

  // ---------------------------------------------------------------
  // copyDir
  // ---------------------------------------------------------------
  describe("copyDir", () => {
    it("should copy directory within .brain-spec/", async () => {
      const srcDir = path.join(brainSpecDir, "src-copy");
      const destDir = path.join(projectRoot, ".brain-spec", "dest-copy");
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(path.join(srcDir, "file.txt"), "content", "utf-8");

      await copyDir(srcDir, destDir, projectRoot);

      const content = await fs.readFile(path.join(destDir, "file.txt"), "utf-8");
      expect(content).toBe("content");
    });

    it("should throw when destination is outside .brain-spec/", async () => {
      const srcDir = path.join(brainSpecDir, "src-copy");
      const destDir = path.join(projectRoot, "outside-dest");
      await fs.mkdir(srcDir, { recursive: true });

      await expect(copyDir(srcDir, destDir, projectRoot)).rejects.toThrow(/Copy denied/);
    });
  });

  // ---------------------------------------------------------------
  // moveDir
  // ---------------------------------------------------------------
  describe("moveDir", () => {
    it("should move directory within .brain-spec/", async () => {
      const srcDir = path.join(projectRoot, ".brain-spec", "move-src");
      const destDir = path.join(projectRoot, ".brain-spec", "move-dest");
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(path.join(srcDir, "data.txt"), "moved", "utf-8");

      await moveDir(srcDir, destDir, projectRoot);

      // Source should no longer exist
      expect(await dirExists(srcDir)).toBe(false);
      // Destination should have the file
      const content = await fs.readFile(path.join(destDir, "data.txt"), "utf-8");
      expect(content).toBe("moved");
    });
  });
});
