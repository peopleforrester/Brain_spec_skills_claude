// ABOUTME: Spec CRUD operations — create, get, list, update, delete, archive
// ABOUTME: Manages spec files and metadata in .brain-spec/specs/ directory

import path from "node:path";
import type {
  ToolResponse,
  SpecMeta,
  SpecStatus,
  BrainSpecConfig,
  ArchiveMetadata,
} from "../../types.js";
import {
  readFile,
  readJsonFile,
  writeFile,
  writeJsonFile,
  fileExists,
  listFiles,
  deleteFile,
  deleteDir,
  ensureDir,
} from "../../utils/file-system.js";
import { slugify } from "../../utils/validation.js";
import { generateDefaultSpecTemplate } from "../../utils/markdown.js";

export class SpecManager {
  constructor(
    private projectRoot: string,
    private config: BrainSpecConfig,
  ) {}

  /** Create a new spec with initial content */
  async create(
    name: string,
    description: string,
    mode: string,
    _pattern?: string,
  ): Promise<ToolResponse> {
    const slug = slugify(name);
    const specsDir = path.resolve(this.projectRoot, this.config.paths.specs);
    const specPath = path.join(specsDir, `${slug}.md`);
    const metaPath = path.join(specsDir, `${slug}.meta.json`);

    if (await fileExists(specPath)) {
      return { success: false, error: `Spec "${slug}" already exists` };
    }

    const now = new Date().toISOString();
    const meta: SpecMeta = {
      specSlug: slug,
      name,
      description: description || "",
      status: mode === "interview" ? "draft" : "draft",
      createdAt: now,
      updatedAt: now,
    };

    // Generate initial content based on mode
    let content: string;
    if (mode === "blank" || mode === "interview") {
      content = generateDefaultSpecTemplate(name, description || "");
    } else {
      content = generateDefaultSpecTemplate(name, description || "");
    }

    await ensureDir(specsDir);
    await writeFile(specPath, content, this.projectRoot);
    await writeJsonFile(metaPath, meta, this.projectRoot);

    // Create tasks directory for this spec
    const tasksDir = path.resolve(this.projectRoot, this.config.paths.tasks, slug);
    await ensureDir(tasksDir);
    const tasksPath = path.join(tasksDir, "tasks.json");
    await writeJsonFile(tasksPath, { specSlug: slug, tasks: [] }, this.projectRoot);
    await ensureDir(path.join(tasksDir, "logs"));

    return {
      success: true,
      data: {
        specSlug: slug,
        specPath,
        metaPath,
        status: meta.status,
        interviewStarted: mode === "interview",
      },
    };
  }

  /** Get a spec by slug — returns content and metadata */
  async get(specSlug: string): Promise<ToolResponse> {
    const specsDir = path.resolve(this.projectRoot, this.config.paths.specs);
    const specPath = path.join(specsDir, `${specSlug}.md`);
    const metaPath = path.join(specsDir, `${specSlug}.meta.json`);

    const content = await readFile(specPath);
    if (content === null) {
      return { success: false, error: `Spec "${specSlug}" not found` };
    }

    const meta = await readJsonFile<SpecMeta>(metaPath);

    return {
      success: true,
      data: {
        specSlug,
        content,
        meta: meta || { specSlug, status: "draft" },
      },
    };
  }

  /** List all specs with optional status filter */
  async list(status?: SpecStatus): Promise<ToolResponse> {
    const specsDir = path.resolve(this.projectRoot, this.config.paths.specs);
    const files = await listFiles(specsDir);

    const specs: Array<{
      slug: string;
      name: string;
      status: SpecStatus;
      taskProgress: { total: number; completed: number };
    }> = [];

    for (const file of files) {
      if (!file.endsWith(".meta.json")) continue;

      const metaPath = path.join(specsDir, file);
      const meta = await readJsonFile<SpecMeta>(metaPath);
      if (!meta) continue;
      if (status && meta.status !== status) continue;

      // Load task progress
      const tasksPath = path.resolve(
        this.projectRoot,
        this.config.paths.tasks,
        meta.specSlug,
        "tasks.json",
      );
      const tasksFile = await readJsonFile<{ tasks: Array<{ status: string }> }>(tasksPath);
      const tasks = tasksFile?.tasks || [];
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t) => t.status === "completed").length;

      specs.push({
        slug: meta.specSlug,
        name: meta.name,
        status: meta.status,
        taskProgress: { total: totalTasks, completed: completedTasks },
      });
    }

    // Also check archive if listing archived specs
    if (status === "archived" || !status) {
      const archiveDir = path.resolve(this.projectRoot, this.config.paths.archive);
      const archiveFolders = await listFiles(archiveDir);
      for (const folder of archiveFolders) {
        const archiveMetaPath = path.join(archiveDir, folder, "archive-metadata.json");
        const archiveMeta = await readJsonFile<ArchiveMetadata>(archiveMetaPath);
        if (archiveMeta) {
          specs.push({
            slug: archiveMeta.specSlug,
            name: archiveMeta.specSlug,
            status: "archived",
            taskProgress: {
              total: archiveMeta.finalStatus.totalTasks,
              completed: archiveMeta.finalStatus.completedTasks,
            },
          });
        }
      }
    }

    return { success: true, data: { specs, count: specs.length } };
  }

  /** Update a spec's content or metadata */
  async update(
    specSlug: string,
    content?: string,
    status?: SpecStatus,
    metadata?: Record<string, unknown>,
  ): Promise<ToolResponse> {
    const specsDir = path.resolve(this.projectRoot, this.config.paths.specs);
    const specPath = path.join(specsDir, `${specSlug}.md`);
    const metaPath = path.join(specsDir, `${specSlug}.meta.json`);

    if (!(await fileExists(specPath))) {
      return { success: false, error: `Spec "${specSlug}" not found` };
    }

    if (content !== undefined) {
      await writeFile(specPath, content, this.projectRoot);
    }

    const meta = await readJsonFile<SpecMeta>(metaPath);
    if (meta) {
      if (status) meta.status = status;
      if (metadata) {
        Object.assign(meta, metadata);
      }
      meta.updatedAt = new Date().toISOString();
      await writeJsonFile(metaPath, meta, this.projectRoot);
    }

    return { success: true, data: { specSlug, updated: true } };
  }

  /** Delete a spec and its associated tasks/logs */
  async delete(specSlug: string, confirmSlug: string): Promise<ToolResponse> {
    if (specSlug !== confirmSlug) {
      return {
        success: false,
        error: `Confirmation failed: confirmSlug "${confirmSlug}" does not match specSlug "${specSlug}"`,
      };
    }

    const specsDir = path.resolve(this.projectRoot, this.config.paths.specs);
    const specPath = path.join(specsDir, `${specSlug}.md`);

    if (!(await fileExists(specPath))) {
      return { success: false, error: `Spec "${specSlug}" not found` };
    }

    // Delete spec files
    await deleteFile(path.join(this.config.paths.specs, `${specSlug}.md`), this.projectRoot);
    await deleteFile(
      path.join(this.config.paths.specs, `${specSlug}.meta.json`),
      this.projectRoot,
    );

    // Delete associated tasks directory
    await deleteDir(path.join(this.config.paths.tasks, specSlug), this.projectRoot);

    return { success: true, data: { specSlug, deleted: true } };
  }

  /** Archive a spec — move to archive directory with metadata */
  async archive(
    specSlug: string,
    reason: "completed" | "deprecated" | "superseded",
    supersededBy?: string,
    summary?: string,
  ): Promise<ToolResponse> {
    const specsDir = path.resolve(this.projectRoot, this.config.paths.specs);
    const specPath = path.join(specsDir, `${specSlug}.md`);

    if (!(await fileExists(specPath))) {
      return { success: false, error: `Spec "${specSlug}" not found` };
    }

    const meta = await readJsonFile<SpecMeta>(
      path.join(specsDir, `${specSlug}.meta.json`),
    );

    // Get task stats
    const tasksPath = path.resolve(
      this.projectRoot,
      this.config.paths.tasks,
      specSlug,
      "tasks.json",
    );
    const tasksFile = await readJsonFile<{ tasks: Array<{ status: string }> }>(tasksPath);
    const tasks = tasksFile?.tasks || [];

    // Create archive directory and metadata
    const archiveDir = path.join(this.config.paths.archive, specSlug);
    await ensureDir(path.resolve(this.projectRoot, archiveDir));

    const archiveMetadata: ArchiveMetadata = {
      specSlug,
      archivedAt: new Date().toISOString(),
      reason,
      supersededBy: supersededBy || null,
      summary: summary || "",
      finalStatus: {
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t) => t.status === "completed").length,
        specStatus: meta?.status || "completed",
      },
    };

    // Move spec files to archive
    const srcSpecDir = this.config.paths.specs;
    await writeFile(
      path.join(archiveDir, `${specSlug}.md`),
      (await readFile(specPath)) || "",
      this.projectRoot,
    );
    const metaContent = await readFile(path.join(specsDir, `${specSlug}.meta.json`));
    if (metaContent) {
      await writeFile(
        path.join(archiveDir, `${specSlug}.meta.json`),
        metaContent,
        this.projectRoot,
      );
    }

    // Move tasks
    const srcTasksDir = path.resolve(this.projectRoot, this.config.paths.tasks, specSlug);
    const destTasksDir = path.join(archiveDir, "tasks");
    await ensureDir(path.resolve(this.projectRoot, destTasksDir));
    const taskFiles = await listFiles(srcTasksDir);
    for (const tf of taskFiles) {
      if (tf === "logs") continue;
      const content = await readFile(path.join(srcTasksDir, tf));
      if (content) {
        await writeFile(path.join(destTasksDir, tf), content, this.projectRoot);
      }
    }

    // Copy logs directory
    const srcLogsDir = path.join(srcTasksDir, "logs");
    const logsFiles = await listFiles(srcLogsDir);
    if (logsFiles.length > 0) {
      const destLogsDir = path.join(archiveDir, "logs");
      await ensureDir(path.resolve(this.projectRoot, destLogsDir));
      for (const lf of logsFiles) {
        const content = await readFile(path.join(srcLogsDir, lf));
        if (content) {
          await writeFile(path.join(destLogsDir, lf), content, this.projectRoot);
        }
      }
    }

    // Write archive metadata
    await writeJsonFile(
      path.join(archiveDir, "archive-metadata.json"),
      archiveMetadata,
      this.projectRoot,
    );

    // Clean up active directories
    await deleteFile(path.join(srcSpecDir, `${specSlug}.md`), this.projectRoot);
    await deleteFile(path.join(srcSpecDir, `${specSlug}.meta.json`), this.projectRoot);
    await deleteDir(path.join(this.config.paths.tasks, specSlug), this.projectRoot);

    return {
      success: true,
      data: { specSlug, archived: true, archivePath: archiveDir },
    };
  }
}
