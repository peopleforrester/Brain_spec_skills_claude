// ABOUTME: Integration test for the full spec workflow lifecycle
// ABOUTME: Tests create spec → add tasks → update status → log implementation → archive

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { SpecManager } from "../../src/modules/spec-workflow/spec-manager.js";
import { TaskManager } from "../../src/modules/spec-workflow/task-manager.js";
import { SteeringManager } from "../../src/modules/spec-workflow/steering-manager.js";
import type { BrainSpecConfig } from "../../src/types.js";

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
  dashboard: { enabled: false, port: 5100, pollIntervalMs: 3000 },
  git: { enabled: false, autoEnrichLogs: false },
  defaults: {
    specTemplate: "standard",
    claudeMdTemplate: "minimal",
    maxTasksPerSpec: 20,
    autoLogImplementations: true,
    staleThresholdDays: 7,
  },
};

describe("Full Workflow Integration", () => {
  let tmpDir: string;
  let specManager: SpecManager;
  let taskManager: TaskManager;
  let steeringManager: SteeringManager;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `brain-spec-integ-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(tmpDir, { recursive: true });

    // Create .brain-spec directory structure
    const dirs = Object.values(config.paths).filter((p) => p.startsWith(".brain-spec/"));
    for (const dir of dirs) {
      await fs.mkdir(path.join(tmpDir, dir), { recursive: true });
    }

    specManager = new SpecManager(tmpDir, config);
    taskManager = new TaskManager(tmpDir, config);
    steeringManager = new SteeringManager(tmpDir, config);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("should complete the full lifecycle: create → tasks → log → archive", async () => {
    // Step 1: Create steering documents
    const steerResult = await steeringManager.manage("set", "product", "# Product\n\nA test product.");
    expect(steerResult.success).toBe(true);

    // Step 2: Create a spec
    const createResult = await specManager.create("user-auth", "User authentication system", "blank");
    expect(createResult.success).toBe(true);
    expect(createResult.data?.specSlug).toBe("user-auth");

    // Step 3: Verify spec is listable
    const listResult = await specManager.list();
    expect(listResult.success).toBe(true);
    expect(listResult.data?.specs).toHaveLength(1);
    expect(listResult.data?.specs[0].slug).toBe("user-auth");

    // Step 4: Update spec status to active
    const updateResult = await specManager.update("user-auth", undefined, "active");
    expect(updateResult.success).toBe(true);

    // Step 5: Add tasks
    const task1 = await taskManager.create("user-auth", "Set up auth middleware");
    expect(task1.success).toBe(true);
    expect(task1.data?.task.id).toBe("1");

    const task2 = await taskManager.create("user-auth", "Implement login endpoint");
    expect(task2.success).toBe(true);
    expect(task2.data?.task.id).toBe("2");

    // Step 6: Add a subtask
    const subtask = await taskManager.create("user-auth", "Add JWT validation", undefined, "1");
    expect(subtask.success).toBe(true);
    expect(subtask.data?.task.id).toBe("1.1");

    // Step 7: List tasks
    const taskList = await taskManager.list("user-auth");
    expect(taskList.success).toBe(true);
    expect(taskList.data?.tasks).toHaveLength(3);
    expect(taskList.data?.summary.total).toBe(3);
    expect(taskList.data?.summary.pending).toBe(3);

    // Step 8: Update task status
    await taskManager.update("user-auth", "1", "in-progress");
    const progressCheck = await taskManager.progress("user-auth");
    expect(progressCheck.data?.inProgressTasks).toBe(1);

    // Step 9: Log implementation for task 1
    const logResult = await taskManager.log(
      "user-auth",
      "1",
      "Implemented auth middleware with JWT validation",
      ["src/middleware/auth.ts"],
      ["src/middleware/auth.ts"],
      45,
      0,
      {
        functions: [
          {
            name: "authMiddleware",
            purpose: "Validates JWT tokens on protected routes",
            signature: "(req: Request, res: Response, next: NextFunction) => void",
            exported: true,
            module: "src/middleware/auth.ts",
          },
        ],
      },
      "Used jose library for JWT validation",
    );
    expect(logResult.success).toBe(true);

    // Verify task is now completed
    const afterLog = await taskManager.list("user-auth", "completed");
    expect(afterLog.data?.tasks).toHaveLength(1);
    expect(afterLog.data?.tasks[0].id).toBe("1");

    // Step 10: Complete remaining tasks
    await taskManager.log("user-auth", "1.1", "Added JWT validation", [], ["src/utils/jwt.ts"]);
    await taskManager.log("user-auth", "2", "Implemented login", [], ["src/routes/login.ts"]);

    // Step 11: Check overall progress
    const finalProgress = await taskManager.progress("user-auth");
    expect(finalProgress.data?.completionPercentage).toBe(100);

    // Step 12: Archive the spec
    const archiveResult = await specManager.archive(
      "user-auth",
      "completed",
      undefined,
      "JWT-based auth with middleware and login endpoint",
    );
    expect(archiveResult.success).toBe(true);

    // Verify spec is no longer in active list
    const postArchiveList = await specManager.list("active");
    expect(postArchiveList.data?.specs).toHaveLength(0);

    // Verify archive metadata exists
    const archiveMetaPath = path.join(
      tmpDir,
      ".brain-spec/archive/user-auth/archive-metadata.json",
    );
    const archiveMeta = JSON.parse(await fs.readFile(archiveMetaPath, "utf-8"));
    expect(archiveMeta.reason).toBe("completed");
    expect(archiveMeta.finalStatus.completedTasks).toBe(3);
  });

  it("should handle multiple concurrent specs independently", async () => {
    // Create two specs
    await specManager.create("spec-a", "First feature", "blank");
    await specManager.create("spec-b", "Second feature", "blank");

    // Add tasks to each
    await taskManager.create("spec-a", "Task A1");
    await taskManager.create("spec-a", "Task A2");
    await taskManager.create("spec-b", "Task B1");

    // Update independently
    await taskManager.update("spec-a", "1", "completed");

    // Verify independence
    const progressA = await taskManager.progress("spec-a");
    const progressB = await taskManager.progress("spec-b");

    expect(progressA.data?.completedTasks).toBe(1);
    expect(progressA.data?.totalTasks).toBe(2);
    expect(progressB.data?.completedTasks).toBe(0);
    expect(progressB.data?.totalTasks).toBe(1);

    // Overall progress
    const overall = await taskManager.progress();
    expect(overall.data?.overall.totalTasks).toBe(3);
    expect(overall.data?.overall.completedTasks).toBe(1);
  });

  it("should integrate steering docs with spec creation context", async () => {
    // Create all steering docs
    await steeringManager.manage("set", "product", "# Product\n\nBuilding an e-commerce platform.");
    await steeringManager.manage("set", "tech", "# Tech\n\nNode.js + TypeScript + PostgreSQL.");
    await steeringManager.manage("set", "structure", "# Structure\n\nsrc/ for source, tests/ for tests.");

    // Verify combined context
    const combined = await steeringManager.getAllSteeringContent();
    expect(combined).toContain("e-commerce platform");
    expect(combined).toContain("PostgreSQL");
    expect(combined).toContain("src/ for source");

    // Verify listing
    const listResult = await steeringManager.manage("list");
    expect(listResult.data?.steeringDocuments.product).toBe(true);
    expect(listResult.data?.steeringDocuments.tech).toBe(true);
    expect(listResult.data?.steeringDocuments.structure).toBe(true);
  });
});
