// ABOUTME: Task tracking and progress management for specs
// ABOUTME: Handles task CRUD, status updates, implementation logging, and progress aggregation

import path from "node:path";
import type {
  ToolResponse,
  Task,
  TasksFile,
  TaskStatus,
  BrainSpecConfig,
  ImplementationLog,
  Artifacts,
  ProgressSummary,
} from "../../types.js";
import { readJsonFile, writeJsonFile, writeFile, listFiles } from "../../utils/file-system.js";
import { generateTaskId } from "../../utils/id-generator.js";
import { generateLogMarkdown } from "../../utils/markdown.js";
import { getGitReference } from "../../utils/git.js";

export class TaskManager {
  constructor(
    private projectRoot: string,
    private config: BrainSpecConfig,
  ) {}

  private getTasksPath(specSlug: string): string {
    return path.resolve(this.projectRoot, this.config.paths.tasks, specSlug, "tasks.json");
  }

  /** Load tasks for a spec */
  private async loadTasks(specSlug: string): Promise<TasksFile | null> {
    return readJsonFile<TasksFile>(this.getTasksPath(specSlug));
  }

  /** Save tasks for a spec */
  private async saveTasks(specSlug: string, tasksFile: TasksFile): Promise<void> {
    const relativePath = path.join(this.config.paths.tasks, specSlug, "tasks.json");
    await writeJsonFile(relativePath, tasksFile, this.projectRoot);
  }

  /** Create a new task for a spec */
  async create(
    specSlug: string,
    title: string,
    description?: string,
    parentTaskId?: string,
    acceptanceCriteria?: string[],
    requirements?: string[],
    leverage?: string,
    files?: string[],
    prompt?: string,
  ): Promise<ToolResponse> {
    const tasksFile = await this.loadTasks(specSlug);
    if (!tasksFile) {
      return { success: false, error: `No tasks file found for spec "${specSlug}"` };
    }

    const taskId = generateTaskId(tasksFile.tasks, parentTaskId || null);
    const now = new Date().toISOString();

    const task: Task = {
      id: taskId,
      title,
      description: description || "",
      status: "pending",
      parentTaskId: parentTaskId || null,
      acceptanceCriteria: acceptanceCriteria || [],
      requirements: requirements || [],
      leverage: leverage || "",
      files: files || [],
      prompt: prompt || "",
      progress: 0,
      notes: "",
      createdAt: now,
      updatedAt: now,
    };

    tasksFile.tasks.push(task);
    await this.saveTasks(specSlug, tasksFile);

    return { success: true, data: { task } };
  }

  /** Update a task's status, progress, or notes */
  async update(
    specSlug: string,
    taskId: string,
    status?: TaskStatus,
    progress?: number,
    notes?: string,
  ): Promise<ToolResponse> {
    const tasksFile = await this.loadTasks(specSlug);
    if (!tasksFile) {
      return { success: false, error: `No tasks file found for spec "${specSlug}"` };
    }

    const task = tasksFile.tasks.find((t) => t.id === taskId);
    if (!task) {
      return { success: false, error: `Task "${taskId}" not found in spec "${specSlug}"` };
    }

    if (status !== undefined) task.status = status;
    if (progress !== undefined) task.progress = progress;
    if (notes !== undefined) task.notes = notes;
    task.updatedAt = new Date().toISOString();

    await this.saveTasks(specSlug, tasksFile);

    return { success: true, data: { task } };
  }

  /** List tasks for a spec with optional filtering */
  async list(
    specSlug: string,
    status?: TaskStatus,
    includeSubtasks: boolean = true,
  ): Promise<ToolResponse> {
    const tasksFile = await this.loadTasks(specSlug);
    if (!tasksFile) {
      return { success: false, error: `No tasks file found for spec "${specSlug}"` };
    }

    let tasks = tasksFile.tasks;

    if (status) {
      tasks = tasks.filter((t) => t.status === status);
    }

    if (!includeSubtasks) {
      tasks = tasks.filter((t) => t.parentTaskId === null);
    }

    const total = tasksFile.tasks.length;
    const completed = tasksFile.tasks.filter((t) => t.status === "completed").length;
    const inProgress = tasksFile.tasks.filter((t) => t.status === "in-progress").length;
    const pending = tasksFile.tasks.filter((t) => t.status === "pending").length;

    return {
      success: true,
      data: {
        specSlug,
        tasks,
        summary: {
          total,
          completed,
          inProgress,
          pending,
          completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        },
      },
    };
  }

  /** Log implementation details for a completed task */
  async log(
    specSlug: string,
    taskId: string,
    summary: string,
    filesChanged?: string[],
    filesCreated?: string[],
    linesAdded?: number,
    linesRemoved?: number,
    artifacts?: Artifacts,
    notes?: string,
  ): Promise<ToolResponse> {
    const tasksFile = await this.loadTasks(specSlug);
    if (!tasksFile) {
      return { success: false, error: `No tasks file found for spec "${specSlug}"` };
    }

    const task = tasksFile.tasks.find((t) => t.id === taskId);
    if (!task) {
      return { success: false, error: `Task "${taskId}" not found in spec "${specSlug}"` };
    }

    // Auto-enrich with git data if enabled
    let gitRef = undefined;
    if (this.config.git.enabled && this.config.git.autoEnrichLogs) {
      gitRef = (await getGitReference(this.projectRoot)) || undefined;
    }

    const logEntry: ImplementationLog = {
      taskId,
      summary,
      gitRef,
      filesModified: filesChanged || [],
      filesCreated: filesCreated || [],
      linesAdded: linesAdded || 0,
      linesRemoved: linesRemoved || 0,
      artifacts: artifacts || {},
      notes: notes || "",
      loggedAt: new Date().toISOString(),
    };

    // Write log file
    const logMarkdown = generateLogMarkdown(logEntry);
    const logFileName = `${taskId}.log.md`;
    const logRelativePath = path.join(
      this.config.paths.tasks,
      specSlug,
      "logs",
      logFileName,
    );
    await writeFile(logRelativePath, logMarkdown, this.projectRoot);

    // Mark task as completed
    task.status = "completed";
    task.progress = 100;
    task.updatedAt = new Date().toISOString();
    await this.saveTasks(specSlug, tasksFile);

    return {
      success: true,
      data: {
        taskId,
        logPath: logRelativePath,
        gitRef: gitRef || null,
      },
    };
  }

  /** Get aggregated progress across one or all specs */
  async progress(specSlug?: string): Promise<ToolResponse> {
    if (specSlug) {
      const tasksFile = await this.loadTasks(specSlug);
      if (!tasksFile) {
        return { success: false, error: `No tasks file found for spec "${specSlug}"` };
      }

      const summary = this.computeProgress(specSlug, tasksFile.tasks);
      return { success: true, data: summary };
    }

    // Aggregate across all specs
    const tasksDir = path.resolve(this.projectRoot, this.config.paths.tasks);
    const specDirs = await listFiles(tasksDir);
    const summaries: ProgressSummary[] = [];
    let totalAll = 0;
    let completedAll = 0;
    let inProgressAll = 0;
    let pendingAll = 0;

    for (const dir of specDirs) {
      const tasksFile = await readJsonFile<TasksFile>(
        path.join(tasksDir, dir, "tasks.json"),
      );
      if (!tasksFile) continue;

      const summary = this.computeProgress(dir, tasksFile.tasks);
      summaries.push(summary);
      totalAll += summary.totalTasks;
      completedAll += summary.completedTasks;
      inProgressAll += summary.inProgressTasks;
      pendingAll += summary.pendingTasks;
    }

    return {
      success: true,
      data: {
        overall: {
          totalTasks: totalAll,
          completedTasks: completedAll,
          inProgressTasks: inProgressAll,
          pendingTasks: pendingAll,
          completionPercentage:
            totalAll > 0 ? Math.round((completedAll / totalAll) * 100) : 0,
        },
        specs: summaries,
      },
    };
  }

  private computeProgress(specSlug: string, tasks: Task[]): ProgressSummary {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const inProgress = tasks.filter((t) => t.status === "in-progress").length;
    const pending = tasks.filter((t) => t.status === "pending").length;

    return {
      specSlug,
      totalTasks: total,
      completedTasks: completed,
      inProgressTasks: inProgress,
      pendingTasks: pending,
      completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }
}
