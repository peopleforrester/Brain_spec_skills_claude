// ABOUTME: Unit tests for SpecManager — spec CRUD operations (create, get, list, update, delete, archive)
// ABOUTME: Uses real temp directories with .brain-spec/ structure; no filesystem mocks

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { SpecManager } from "../../src/modules/spec-workflow/spec-manager.js";
import type { BrainSpecConfig, SpecMeta, TasksFile } from "../../src/types.js";

const config: BrainSpecConfig = {
  version: "1.0.0",
  paths: {
    specs: ".brain-spec/specs",
    tasks: ".brain-spec/tasks",
    steering: ".brain-spec/steering",
    agents: ".brain-spec/agents",
    skills: ".brain-spec/skills",
    hooks: ".brain-spec/hooks",
    rules: ".brain-spec/rules",
    patterns: ".brain-spec/patterns",
    archive: ".brain-spec/archive",
    analytics: ".brain-spec/analytics",
    claudeMd: "CLAUDE.md",
  },
  dashboard: { enabled: true, port: 5100, pollIntervalMs: 3000 },
  git: { enabled: false, autoEnrichLogs: false },
  defaults: {
    specTemplate: "standard",
    claudeMdTemplate: "minimal",
    maxTasksPerSpec: 20,
    autoLogImplementations: true,
    staleThresholdDays: 7,
  },
};

let tmpDir: string;
let manager: SpecManager;

/** Helper to read a JSON file from the temp directory */
async function readJson<T>(relativePath: string): Promise<T> {
  const content = await fs.readFile(path.join(tmpDir, relativePath), "utf-8");
  return JSON.parse(content) as T;
}

/** Helper to check if a file exists in the temp directory */
async function exists(relativePath: string): Promise<boolean> {
  try {
    await fs.access(path.join(tmpDir, relativePath));
    return true;
  } catch {
    return false;
  }
}

describe("SpecManager", () => {
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "brain-spec-test-"));
    // Create the full .brain-spec directory structure
    await fs.mkdir(path.join(tmpDir, ".brain-spec", "specs"), { recursive: true });
    await fs.mkdir(path.join(tmpDir, ".brain-spec", "tasks"), { recursive: true });
    await fs.mkdir(path.join(tmpDir, ".brain-spec", "steering"), { recursive: true });
    await fs.mkdir(path.join(tmpDir, ".brain-spec", "archive"), { recursive: true });
    await fs.mkdir(path.join(tmpDir, ".brain-spec", "analytics"), { recursive: true });
    manager = new SpecManager(tmpDir, config);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe("create", () => {
    it("should create .md, .meta.json, tasks directory, and tasks.json", async () => {
      const result = await manager.create("User Auth", "Handle user authentication", "blank");

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.specSlug).toBe("user-auth");
      expect(result.data!.status).toBe("draft");
      expect(result.data!.interviewStarted).toBe(false);

      // Verify .md file was created with correct content
      const mdContent = await fs.readFile(
        path.join(tmpDir, ".brain-spec", "specs", "user-auth.md"),
        "utf-8",
      );
      expect(mdContent).toContain("# Spec: User Auth");
      expect(mdContent).toContain("Handle user authentication");

      // Verify .meta.json was created with correct structure
      const meta = await readJson<SpecMeta>(".brain-spec/specs/user-auth.meta.json");
      expect(meta.specSlug).toBe("user-auth");
      expect(meta.name).toBe("User Auth");
      expect(meta.description).toBe("Handle user authentication");
      expect(meta.status).toBe("draft");
      expect(meta.createdAt).toBeTruthy();
      expect(meta.updatedAt).toBeTruthy();

      // Verify tasks directory and tasks.json were created
      const tasksFile = await readJson<TasksFile>(".brain-spec/tasks/user-auth/tasks.json");
      expect(tasksFile.specSlug).toBe("user-auth");
      expect(tasksFile.tasks).toEqual([]);

      // Verify logs directory was created
      expect(await exists(".brain-spec/tasks/user-auth/logs")).toBe(true);
    });

    it("should return interviewStarted true for interview mode", async () => {
      const result = await manager.create("API Design", "Design REST API", "interview");

      expect(result.success).toBe(true);
      expect(result.data!.interviewStarted).toBe(true);
      expect(result.data!.status).toBe("draft");
    });

    it("should return error for duplicate spec name", async () => {
      await manager.create("Duplicate Spec", "First creation", "blank");
      const result = await manager.create("Duplicate Spec", "Second creation", "blank");

      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists");
      expect(result.error).toContain("duplicate-spec");
    });

    it("should slugify the name correctly", async () => {
      const result = await manager.create("My Complex Feature!!!", "A feature", "blank");

      expect(result.success).toBe(true);
      expect(result.data!.specSlug).toBe("my-complex-feature");
    });
  });

  describe("get", () => {
    it("should return content and metadata for an existing spec", async () => {
      await manager.create("Read Test", "Testing get operation", "blank");
      const result = await manager.get("read-test");

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.specSlug).toBe("read-test");
      expect(result.data!.content).toContain("# Spec: Read Test");
      expect(result.data!.meta).toBeDefined();
      expect(result.data!.meta.specSlug).toBe("read-test");
      expect(result.data!.meta.status).toBe("draft");
    });

    it("should return error for nonexistent slug", async () => {
      const result = await manager.get("nonexistent-spec");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
      expect(result.error).toContain("nonexistent-spec");
    });
  });

  describe("list", () => {
    beforeEach(async () => {
      await manager.create("Spec Alpha", "First spec", "blank");
      await manager.create("Spec Beta", "Second spec", "blank");
      await manager.create("Spec Gamma", "Third spec", "blank");
      // Manually update Spec Beta to "active" status
      await manager.update("spec-beta", undefined, "active");
    });

    it("should return all specs when no status filter is given", async () => {
      const result = await manager.list();

      expect(result.success).toBe(true);
      expect(result.data!.specs.length).toBe(3);
      expect(result.data!.count).toBe(3);

      const slugs = result.data!.specs.map((s: { slug: string }) => s.slug);
      expect(slugs).toContain("spec-alpha");
      expect(slugs).toContain("spec-beta");
      expect(slugs).toContain("spec-gamma");
    });

    it("should filter specs by status", async () => {
      const draftResult = await manager.list("draft");
      expect(draftResult.success).toBe(true);
      expect(draftResult.data!.specs.length).toBe(2);

      const activeResult = await manager.list("active");
      expect(activeResult.success).toBe(true);
      expect(activeResult.data!.specs.length).toBe(1);
      expect(activeResult.data!.specs[0].slug).toBe("spec-beta");
    });

    it("should include task progress information", async () => {
      const result = await manager.list();
      const specAlpha = result.data!.specs.find(
        (s: { slug: string }) => s.slug === "spec-alpha",
      );
      expect(specAlpha).toBeDefined();
      expect(specAlpha!.taskProgress).toEqual({ total: 0, completed: 0 });
    });

    it("should return empty list for unmatched status filter", async () => {
      const result = await manager.list("completed");
      expect(result.success).toBe(true);
      expect(result.data!.specs.length).toBe(0);
      expect(result.data!.count).toBe(0);
    });
  });

  describe("update", () => {
    beforeEach(async () => {
      await manager.create("Update Test", "Testing update", "blank");
    });

    it("should update spec content", async () => {
      const newContent = "# Updated Content\n\nThis spec has been updated.";
      const result = await manager.update("update-test", newContent);

      expect(result.success).toBe(true);
      expect(result.data!.specSlug).toBe("update-test");
      expect(result.data!.updated).toBe(true);

      // Verify the content was actually written
      const getResult = await manager.get("update-test");
      expect(getResult.data!.content).toBe(newContent);
    });

    it("should update spec status", async () => {
      const result = await manager.update("update-test", undefined, "active");

      expect(result.success).toBe(true);

      const getResult = await manager.get("update-test");
      expect(getResult.data!.meta.status).toBe("active");
    });

    it("should update metadata fields", async () => {
      const result = await manager.update("update-test", undefined, undefined, {
        customField: "custom-value",
      });

      expect(result.success).toBe(true);

      const meta = await readJson<SpecMeta & { customField: string }>(
        ".brain-spec/specs/update-test.meta.json",
      );
      expect(meta.customField).toBe("custom-value");
    });

    it("should update the updatedAt timestamp", async () => {
      const beforeMeta = await readJson<SpecMeta>(".brain-spec/specs/update-test.meta.json");
      const beforeTime = beforeMeta.updatedAt;

      // Small delay to ensure timestamp differs
      await new Promise((resolve) => setTimeout(resolve, 10));

      await manager.update("update-test", undefined, "active");

      const afterMeta = await readJson<SpecMeta>(".brain-spec/specs/update-test.meta.json");
      expect(afterMeta.updatedAt).not.toBe(beforeTime);
    });

    it("should return error for nonexistent spec", async () => {
      const result = await manager.update("ghost-spec", "new content");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("delete", () => {
    beforeEach(async () => {
      await manager.create("Delete Target", "Will be deleted", "blank");
    });

    it("should require confirmSlug to match specSlug", async () => {
      const result = await manager.delete("delete-target", "wrong-slug");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Confirmation failed");
      expect(result.error).toContain("wrong-slug");

      // Verify spec still exists
      const getResult = await manager.get("delete-target");
      expect(getResult.success).toBe(true);
    });

    it("should delete spec files and tasks directory when confirmed", async () => {
      const result = await manager.delete("delete-target", "delete-target");

      expect(result.success).toBe(true);
      expect(result.data!.specSlug).toBe("delete-target");
      expect(result.data!.deleted).toBe(true);

      // Verify all files are removed
      expect(await exists(".brain-spec/specs/delete-target.md")).toBe(false);
      expect(await exists(".brain-spec/specs/delete-target.meta.json")).toBe(false);
      expect(await exists(".brain-spec/tasks/delete-target")).toBe(false);
    });

    it("should return error when deleting nonexistent spec", async () => {
      const result = await manager.delete("no-such-spec", "no-such-spec");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("archive", () => {
    beforeEach(async () => {
      await manager.create("Archive Target", "Will be archived", "blank");
    });

    it("should move spec files to archive directory", async () => {
      const result = await manager.archive("archive-target", "completed", undefined, "Done!");

      expect(result.success).toBe(true);
      expect(result.data!.specSlug).toBe("archive-target");
      expect(result.data!.archived).toBe(true);
      expect(result.data!.archivePath).toContain("archive-target");

      // Verify archive directory was created with files
      expect(
        await exists(".brain-spec/archive/archive-target/archive-target.md"),
      ).toBe(true);
      expect(
        await exists(".brain-spec/archive/archive-target/archive-target.meta.json"),
      ).toBe(true);
    });

    it("should create archive-metadata.json with correct fields", async () => {
      await manager.archive("archive-target", "superseded", "new-spec", "Replaced by new-spec");

      const archiveMeta = await readJson<{
        specSlug: string;
        archivedAt: string;
        reason: string;
        supersededBy: string | null;
        summary: string;
        finalStatus: { totalTasks: number; completedTasks: number; specStatus: string };
      }>(".brain-spec/archive/archive-target/archive-metadata.json");

      expect(archiveMeta.specSlug).toBe("archive-target");
      expect(archiveMeta.reason).toBe("superseded");
      expect(archiveMeta.supersededBy).toBe("new-spec");
      expect(archiveMeta.summary).toBe("Replaced by new-spec");
      expect(archiveMeta.archivedAt).toBeTruthy();
      expect(archiveMeta.finalStatus).toBeDefined();
      expect(archiveMeta.finalStatus.totalTasks).toBe(0);
      expect(archiveMeta.finalStatus.completedTasks).toBe(0);
      expect(archiveMeta.finalStatus.specStatus).toBe("draft");
    });

    it("should remove active spec files after archiving", async () => {
      await manager.archive("archive-target", "completed");

      // Active spec files should be gone
      expect(await exists(".brain-spec/specs/archive-target.md")).toBe(false);
      expect(await exists(".brain-spec/specs/archive-target.meta.json")).toBe(false);
      expect(await exists(".brain-spec/tasks/archive-target")).toBe(false);
    });

    it("should copy tasks to the archive directory", async () => {
      await manager.archive("archive-target", "deprecated");

      expect(
        await exists(".brain-spec/archive/archive-target/tasks/tasks.json"),
      ).toBe(true);
    });

    it("should return error for nonexistent spec", async () => {
      const result = await manager.archive("no-such-spec", "completed");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should include archived specs in list results", async () => {
      await manager.archive("archive-target", "completed", undefined, "All done");

      // List with "archived" filter should include the archived spec
      const result = await manager.list("archived");
      expect(result.success).toBe(true);
      expect(result.data!.specs.length).toBe(1);
      expect(result.data!.specs[0].slug).toBe("archive-target");
      expect(result.data!.specs[0].status).toBe("archived");
    });
  });
});
