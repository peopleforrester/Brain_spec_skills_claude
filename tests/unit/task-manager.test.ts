// ABOUTME: Unit tests for TaskManager — task CRUD, subtask creation, logging, and progress aggregation
// ABOUTME: Uses real temp directories with .brain-spec/ structure; mocks git utilities only

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { TaskManager } from "../../src/modules/spec-workflow/task-manager.js";
import type { BrainSpecConfig, TasksFile, Task } from "../../src/types.js";

// Mock git utilities so we can test git-enrichment paths without a real repo
vi.mock("../../src/utils/git.js", () => ({
  getGitReference: vi.fn().mockResolvedValue({
    commitSha: "abc123def456",
    branch: "staging",
    timestamp: "2025-01-15T10:30:00Z",
  }),
}));

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
let manager: TaskManager;

/** Helper to seed a spec's tasks directory with an initial tasks.json */
async function seedTasksDir(specSlug: string, tasks: Task[] = []): Promise<void> {
  const tasksDir = path.join(tmpDir, ".brain-spec", "tasks", specSlug);
  await fs.mkdir(tasksDir, { recursive: true });
  await fs.mkdir(path.join(tasksDir, "logs"), { recursive: true });
  const tasksFile: TasksFile = { specSlug, tasks };
  await fs.writeFile(path.join(tasksDir, "tasks.json"), JSON.stringify(tasksFile, null, 2));
}

/** Helper to read a JSON file from the temp directory */
async function readJson<T>(relativePath: string): Promise<T> {
  const content = await fs.readFile(path.join(tmpDir, relativePath), "utf-8");
  return JSON.parse(content) as T;
}

/** Helper to check if a file exists in the temp directory */
async function fileExists(relativePath: string): Promise<boolean> {
  try {
    await fs.access(path.join(tmpDir, relativePath));
    return true;
  } catch {
    return false;
  }
}

/** Helper to create a minimal Task object */
function makeTask(overrides: Partial<Task> & { id: string; title: string }): Task {
  return {
    description: "",
    status: "pending",
    parentTaskId: null,
    acceptanceCriteria: [],
    requirements: [],
    leverage: "",
    files: [],
    prompt: "",
    progress: 0,
    notes: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("TaskManager", () => {
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "brain-spec-task-test-"));
    await fs.mkdir(path.join(tmpDir, ".brain-spec", "tasks"), { recursive: true });
    await fs.mkdir(path.join(tmpDir, ".brain-spec", "specs"), { recursive: true });
    manager = new TaskManager(tmpDir, config);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe("create", () => {
    it("should add a task with auto-generated ID", async () => {
      await seedTasksDir("my-spec");
      const result = await manager.create("my-spec", "Implement login");

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      const task: Task = result.data!.task;
      expect(task.id).toBe("1");
      expect(task.title).toBe("Implement login");
      expect(task.status).toBe("pending");
      expect(task.progress).toBe(0);
      expect(task.parentTaskId).toBeNull();
      expect(task.createdAt).toBeTruthy();
      expect(task.updatedAt).toBeTruthy();
    });

    it("should auto-increment task IDs", async () => {
      await seedTasksDir("my-spec");

      await manager.create("my-spec", "First task");
      await manager.create("my-spec", "Second task");
      const result = await manager.create("my-spec", "Third task");

      expect(result.data!.task.id).toBe("3");

      // Verify all three tasks are persisted
      const tasksFile = await readJson<TasksFile>(".brain-spec/tasks/my-spec/tasks.json");
      expect(tasksFile.tasks.length).toBe(3);
    });

    it("should store optional fields when provided", async () => {
      await seedTasksDir("my-spec");

      const result = await manager.create(
        "my-spec",
        "Complex task",
        "A detailed description",
        undefined,
        ["User can log in", "Error messages displayed"],
        ["Node.js 20+", "PostgreSQL"],
        "Reuse existing auth middleware",
        ["src/auth.ts", "src/middleware.ts"],
        "Implement the login endpoint using JWT",
      );

      expect(result.success).toBe(true);
      const task: Task = result.data!.task;
      expect(task.description).toBe("A detailed description");
      expect(task.acceptanceCriteria).toEqual(["User can log in", "Error messages displayed"]);
      expect(task.requirements).toEqual(["Node.js 20+", "PostgreSQL"]);
      expect(task.leverage).toBe("Reuse existing auth middleware");
      expect(task.files).toEqual(["src/auth.ts", "src/middleware.ts"]);
      expect(task.prompt).toBe("Implement the login endpoint using JWT");
    });

    it("should return error when spec tasks file does not exist", async () => {
      const result = await manager.create("nonexistent", "A task");

      expect(result.success).toBe(false);
      expect(result.error).toContain("No tasks file found");
      expect(result.error).toContain("nonexistent");
    });
  });

  describe("create subtask", () => {
    it("should generate correct hierarchical ID (e.g., '1.1')", async () => {
      await seedTasksDir("my-spec", [makeTask({ id: "1", title: "Parent task" })]);

      const result = await manager.create("my-spec", "Child task", undefined, "1");

      expect(result.success).toBe(true);
      expect(result.data!.task.id).toBe("1.1");
      expect(result.data!.task.parentTaskId).toBe("1");
    });

    it("should auto-increment subtask IDs among siblings", async () => {
      await seedTasksDir("my-spec", [
        makeTask({ id: "1", title: "Parent" }),
        makeTask({ id: "1.1", title: "First child", parentTaskId: "1" }),
      ]);

      const result = await manager.create("my-spec", "Second child", undefined, "1");

      expect(result.success).toBe(true);
      expect(result.data!.task.id).toBe("1.2");
    });

    it("should handle deeply nested subtask IDs", async () => {
      await seedTasksDir("my-spec", [
        makeTask({ id: "1", title: "Top" }),
        makeTask({ id: "1.1", title: "Mid", parentTaskId: "1" }),
      ]);

      const result = await manager.create("my-spec", "Deep child", undefined, "1.1");

      expect(result.success).toBe(true);
      expect(result.data!.task.id).toBe("1.1.1");
    });
  });

  describe("update", () => {
    beforeEach(async () => {
      await seedTasksDir("my-spec", [
        makeTask({ id: "1", title: "Task to update" }),
      ]);
    });

    it("should change task status", async () => {
      const result = await manager.update("my-spec", "1", "in-progress");

      expect(result.success).toBe(true);
      expect(result.data!.task.status).toBe("in-progress");

      // Verify persisted
      const tasksFile = await readJson<TasksFile>(".brain-spec/tasks/my-spec/tasks.json");
      expect(tasksFile.tasks[0].status).toBe("in-progress");
    });

    it("should change task progress", async () => {
      const result = await manager.update("my-spec", "1", undefined, 50);

      expect(result.success).toBe(true);
      expect(result.data!.task.progress).toBe(50);
    });

    it("should change task notes", async () => {
      const result = await manager.update("my-spec", "1", undefined, undefined, "Work in progress");

      expect(result.success).toBe(true);
      expect(result.data!.task.notes).toBe("Work in progress");
    });

    it("should update multiple fields at once", async () => {
      const result = await manager.update("my-spec", "1", "completed", 100, "All done");

      expect(result.success).toBe(true);
      const task: Task = result.data!.task;
      expect(task.status).toBe("completed");
      expect(task.progress).toBe(100);
      expect(task.notes).toBe("All done");
    });

    it("should update the updatedAt timestamp", async () => {
      const beforeTasks = await readJson<TasksFile>(".brain-spec/tasks/my-spec/tasks.json");
      const beforeTime = beforeTasks.tasks[0].updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));
      await manager.update("my-spec", "1", "in-progress");

      const afterTasks = await readJson<TasksFile>(".brain-spec/tasks/my-spec/tasks.json");
      expect(afterTasks.tasks[0].updatedAt).not.toBe(beforeTime);
    });

    it("should return error for nonexistent task", async () => {
      const result = await manager.update("my-spec", "999", "completed");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
      expect(result.error).toContain("999");
    });

    it("should return error for nonexistent spec", async () => {
      const result = await manager.update("ghost-spec", "1", "completed");

      expect(result.success).toBe(false);
      expect(result.error).toContain("No tasks file found");
    });
  });

  describe("list", () => {
    beforeEach(async () => {
      await seedTasksDir("my-spec", [
        makeTask({ id: "1", title: "Pending task", status: "pending" }),
        makeTask({ id: "2", title: "Active task", status: "in-progress" }),
        makeTask({ id: "3", title: "Done task", status: "completed" }),
        makeTask({ id: "2.1", title: "Subtask A", status: "pending", parentTaskId: "2" }),
        makeTask({ id: "2.2", title: "Subtask B", status: "completed", parentTaskId: "2" }),
      ]);
    });

    it("should return all tasks by default", async () => {
      const result = await manager.list("my-spec");

      expect(result.success).toBe(true);
      expect(result.data!.tasks.length).toBe(5);
      expect(result.data!.specSlug).toBe("my-spec");
    });

    it("should include summary statistics", async () => {
      const result = await manager.list("my-spec");
      const summary = result.data!.summary;

      expect(summary.total).toBe(5);
      expect(summary.pending).toBe(2);
      expect(summary.inProgress).toBe(1);
      expect(summary.completed).toBe(2);
      expect(summary.completionPercentage).toBe(40); // 2/5 = 40%
    });

    it("should filter by status", async () => {
      const pendingResult = await manager.list("my-spec", "pending");
      expect(pendingResult.data!.tasks.length).toBe(2);

      const completedResult = await manager.list("my-spec", "completed");
      expect(completedResult.data!.tasks.length).toBe(2);

      const inProgressResult = await manager.list("my-spec", "in-progress");
      expect(inProgressResult.data!.tasks.length).toBe(1);
    });

    it("should respect includeSubtasks=false flag", async () => {
      const result = await manager.list("my-spec", undefined, false);

      expect(result.data!.tasks.length).toBe(3);
      const ids = result.data!.tasks.map((t: Task) => t.id);
      expect(ids).toEqual(["1", "2", "3"]);
    });

    it("should combine status filter with includeSubtasks=false", async () => {
      const result = await manager.list("my-spec", "pending", false);

      expect(result.data!.tasks.length).toBe(1);
      expect(result.data!.tasks[0].id).toBe("1");
    });

    it("should still show full summary even when filtering", async () => {
      const result = await manager.list("my-spec", "pending");

      // Summary should reflect all tasks, not just filtered ones
      expect(result.data!.summary.total).toBe(5);
    });

    it("should return error for nonexistent spec", async () => {
      const result = await manager.list("no-such-spec");

      expect(result.success).toBe(false);
      expect(result.error).toContain("No tasks file found");
    });
  });

  describe("log", () => {
    beforeEach(async () => {
      await seedTasksDir("my-spec", [
        makeTask({ id: "1", title: "Task to log" }),
      ]);
    });

    it("should create a log markdown file", async () => {
      const result = await manager.log(
        "my-spec",
        "1",
        "Implemented the login endpoint",
        ["src/auth.ts"],
        ["src/auth.test.ts"],
        50,
        10,
      );

      expect(result.success).toBe(true);
      expect(result.data!.taskId).toBe("1");
      expect(result.data!.logPath).toContain("1.log.md");

      // Verify log file was written
      expect(await fileExists(".brain-spec/tasks/my-spec/logs/1.log.md")).toBe(true);

      const logContent = await fs.readFile(
        path.join(tmpDir, ".brain-spec", "tasks", "my-spec", "logs", "1.log.md"),
        "utf-8",
      );
      expect(logContent).toContain("# Implementation Log");
      expect(logContent).toContain("Implemented the login endpoint");
      expect(logContent).toContain("src/auth.ts");
      expect(logContent).toContain("src/auth.test.ts");
      expect(logContent).toContain("Lines Added: 50");
      expect(logContent).toContain("Lines Removed: 10");
    });

    it("should mark the task as completed with 100% progress", async () => {
      await manager.log("my-spec", "1", "Done");

      const tasksFile = await readJson<TasksFile>(".brain-spec/tasks/my-spec/tasks.json");
      const task = tasksFile.tasks.find((t) => t.id === "1")!;
      expect(task.status).toBe("completed");
      expect(task.progress).toBe(100);
    });

    it("should not include git ref when git is disabled", async () => {
      const result = await manager.log("my-spec", "1", "No git");

      expect(result.success).toBe(true);
      expect(result.data!.gitRef).toBeNull();
    });

    it("should auto-enrich with git data when git is enabled", async () => {
      // Create a manager with git enabled
      const gitConfig: BrainSpecConfig = {
        ...config,
        git: { enabled: true, autoEnrichLogs: true },
      };
      const gitManager = new TaskManager(tmpDir, gitConfig);

      const result = await gitManager.log("my-spec", "1", "With git enrichment");

      expect(result.success).toBe(true);
      expect(result.data!.gitRef).toBeDefined();
      expect(result.data!.gitRef.commitSha).toBe("abc123def456");
      expect(result.data!.gitRef.branch).toBe("staging");
    });

    it("should return error for nonexistent task", async () => {
      const result = await manager.log("my-spec", "999", "Ghost task");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
      expect(result.error).toContain("999");
    });

    it("should return error for nonexistent spec", async () => {
      const result = await manager.log("no-spec", "1", "Ghost spec");

      expect(result.success).toBe(false);
      expect(result.error).toContain("No tasks file found");
    });
  });

  describe("progress", () => {
    it("should compute correct percentages for a single spec", async () => {
      await seedTasksDir("my-spec", [
        makeTask({ id: "1", title: "Done", status: "completed" }),
        makeTask({ id: "2", title: "Doing", status: "in-progress" }),
        makeTask({ id: "3", title: "Todo", status: "pending" }),
        makeTask({ id: "4", title: "Also done", status: "completed" }),
      ]);

      const result = await manager.progress("my-spec");

      expect(result.success).toBe(true);
      expect(result.data!.totalTasks).toBe(4);
      expect(result.data!.completedTasks).toBe(2);
      expect(result.data!.inProgressTasks).toBe(1);
      expect(result.data!.pendingTasks).toBe(1);
      expect(result.data!.completionPercentage).toBe(50);
    });

    it("should return 0% when no tasks exist", async () => {
      await seedTasksDir("empty-spec");

      const result = await manager.progress("empty-spec");

      expect(result.success).toBe(true);
      expect(result.data!.totalTasks).toBe(0);
      expect(result.data!.completionPercentage).toBe(0);
    });

    it("should return 100% when all tasks are completed", async () => {
      await seedTasksDir("done-spec", [
        makeTask({ id: "1", title: "Done 1", status: "completed" }),
        makeTask({ id: "2", title: "Done 2", status: "completed" }),
      ]);

      const result = await manager.progress("done-spec");

      expect(result.success).toBe(true);
      expect(result.data!.completionPercentage).toBe(100);
    });

    it("should aggregate progress across all specs when no specSlug is given", async () => {
      await seedTasksDir("spec-a", [
        makeTask({ id: "1", title: "A1", status: "completed" }),
        makeTask({ id: "2", title: "A2", status: "pending" }),
      ]);
      await seedTasksDir("spec-b", [
        makeTask({ id: "1", title: "B1", status: "completed" }),
        makeTask({ id: "2", title: "B2", status: "completed" }),
        makeTask({ id: "3", title: "B3", status: "in-progress" }),
      ]);

      const result = await manager.progress();

      expect(result.success).toBe(true);
      expect(result.data!.overall).toBeDefined();
      expect(result.data!.overall.totalTasks).toBe(5);
      expect(result.data!.overall.completedTasks).toBe(3);
      expect(result.data!.overall.inProgressTasks).toBe(1);
      expect(result.data!.overall.pendingTasks).toBe(1);
      expect(result.data!.overall.completionPercentage).toBe(60);

      expect(result.data!.specs).toBeDefined();
      expect(result.data!.specs.length).toBe(2);
    });

    it("should return error for nonexistent spec", async () => {
      const result = await manager.progress("no-such-spec");

      expect(result.success).toBe(false);
      expect(result.error).toContain("No tasks file found");
    });
  });
});
