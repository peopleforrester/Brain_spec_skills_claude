// ABOUTME: Registers all spec workflow tools with the MCP server
// ABOUTME: Wires SpecManager, TaskManager, and SteeringManager to tool definitions

import type { BrainSpecServer } from "../../server.js";
import type { BrainSpecConfig } from "../../types.js";
import {
  BrainInitSchema,
  BrainSpecCreateSchema,
  BrainSpecGetSchema,
  BrainSpecListSchema,
  BrainSpecUpdateSchema,
  BrainSpecDeleteSchema,
  BrainSpecArchiveSchema,
  BrainSteeringManageSchema,
  BrainTaskCreateSchema,
  BrainTaskUpdateSchema,
  BrainTaskListSchema,
  BrainTaskLogSchema,
  BrainProgressSchema,
} from "../../types.js";
import { validateInput } from "../../utils/validation.js";
import { SpecManager } from "./spec-manager.js";
import { TaskManager } from "./task-manager.js";
import { SteeringManager } from "./steering-manager.js";

export function registerSpecWorkflowTools(
  server: BrainSpecServer,
  projectRoot: string,
  config: BrainSpecConfig,
): void {
  const specManager = new SpecManager(projectRoot, config);
  const taskManager = new TaskManager(projectRoot, config);
  const steeringManager = new SteeringManager(projectRoot, config);

  // --- brain_init ---
  server.registerTool({
    name: "brain_init",
    description:
      "Initialize Brain Spec in a project directory. Creates .brain-spec/ structure and optionally generates CLAUDE.md.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: { type: "string", description: "Project path (auto-detected if omitted)" },
        template: { type: "string", description: "CLAUDE.md template name" },
        stack: { type: "string", description: "Tech stack override" },
      },
    },
    handler: async (args) => {
      const v = validateInput(BrainInitSchema, args);
      if (!v.valid) return v.response;
      // Workspace is auto-initialized on server start, so this just returns success
      return {
        success: true,
        data: {
          projectRoot,
          workspaceDir: ".brain-spec/",
          message: "Brain Spec workspace initialized successfully",
        },
      };
    },
  });

  // --- brain_spec_create ---
  server.registerTool({
    name: "brain_spec_create",
    description:
      "Create a new spec. Can be blank, from a template, from a spec pattern, or trigger interview mode.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Spec name" },
        description: { type: "string", description: "Brief description" },
        mode: {
          type: "string",
          enum: ["blank", "template", "pattern", "interview"],
          description: "Creation mode",
        },
        pattern: { type: "string", description: "Spec pattern template name" },
      },
      required: ["name"],
    },
    handler: async (args) => {
      const v = validateInput(BrainSpecCreateSchema, args);
      if (!v.valid) return v.response;
      return specManager.create(v.data.name, v.data.description || "", v.data.mode, v.data.pattern);
    },
  });

  // --- brain_spec_get ---
  server.registerTool({
    name: "brain_spec_get",
    description: "Read a spec by slug. Returns the full markdown content and metadata.",
    inputSchema: {
      type: "object",
      properties: {
        specSlug: { type: "string", description: "Spec slug identifier" },
      },
      required: ["specSlug"],
    },
    handler: async (args) => {
      const v = validateInput(BrainSpecGetSchema, args);
      if (!v.valid) return v.response;
      return specManager.get(v.data.specSlug);
    },
  });

  // --- brain_spec_list ---
  server.registerTool({
    name: "brain_spec_list",
    description: "List all specs with optional status filter. Returns slugs, names, statuses, task progress.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["draft", "active", "completed", "archived"],
          description: "Filter by status",
        },
      },
    },
    handler: async (args) => {
      const v = validateInput(BrainSpecListSchema, args);
      if (!v.valid) return v.response;
      return specManager.list(v.data.status);
    },
  });

  // --- brain_spec_update ---
  server.registerTool({
    name: "brain_spec_update",
    description: "Update a spec's content or metadata.",
    inputSchema: {
      type: "object",
      properties: {
        specSlug: { type: "string", description: "Spec slug" },
        content: { type: "string", description: "New markdown content" },
        status: { type: "string", enum: ["draft", "active", "completed", "archived"] },
        metadata: { type: "object", description: "Additional metadata to merge" },
      },
      required: ["specSlug"],
    },
    handler: async (args) => {
      const v = validateInput(BrainSpecUpdateSchema, args);
      if (!v.valid) return v.response;
      return specManager.update(v.data.specSlug, v.data.content, v.data.status, v.data.metadata);
    },
  });

  // --- brain_spec_delete ---
  server.registerTool({
    name: "brain_spec_delete",
    description:
      "Delete a spec and its associated tasks/logs. Requires typing the slug again to confirm.",
    inputSchema: {
      type: "object",
      properties: {
        specSlug: { type: "string", description: "Spec slug to delete" },
        confirmSlug: { type: "string", description: "Type the slug again to confirm deletion" },
      },
      required: ["specSlug", "confirmSlug"],
    },
    handler: async (args) => {
      const v = validateInput(BrainSpecDeleteSchema, args);
      if (!v.valid) return v.response;
      return specManager.delete(v.data.specSlug, v.data.confirmSlug);
    },
  });

  // --- brain_spec_archive ---
  server.registerTool({
    name: "brain_spec_archive",
    description: "Move a completed/deprecated spec to the archive with metadata.",
    inputSchema: {
      type: "object",
      properties: {
        specSlug: { type: "string", description: "Spec slug to archive" },
        reason: {
          type: "string",
          enum: ["completed", "deprecated", "superseded"],
          description: "Reason for archiving",
        },
        supersededBy: { type: "string", description: "Slug of replacement spec (if superseded)" },
        summary: { type: "string", description: "Brief summary of what this spec accomplished" },
      },
      required: ["specSlug", "reason"],
    },
    handler: async (args) => {
      const v = validateInput(BrainSpecArchiveSchema, args);
      if (!v.valid) return v.response;
      return specManager.archive(
        v.data.specSlug,
        v.data.reason,
        v.data.supersededBy,
        v.data.summary,
      );
    },
  });

  // --- brain_steering_manage ---
  server.registerTool({
    name: "brain_steering_manage",
    description:
      "Create, update, or retrieve steering documents (product, tech, structure).",
    inputSchema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["get", "set", "list"], description: "Action to perform" },
        docType: {
          type: "string",
          enum: ["product", "tech", "structure"],
          description: "Document type",
        },
        content: { type: "string", description: "Document content (for set action)" },
      },
      required: ["action"],
    },
    handler: async (args) => {
      const v = validateInput(BrainSteeringManageSchema, args);
      if (!v.valid) return v.response;
      return steeringManager.manage(v.data.action, v.data.docType, v.data.content);
    },
  });

  // --- brain_task_create ---
  server.registerTool({
    name: "brain_task_create",
    description: "Add a task to a spec. Supports hierarchical IDs and Pimzino-style metadata.",
    inputSchema: {
      type: "object",
      properties: {
        specSlug: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        parentTaskId: { type: "string" },
        acceptanceCriteria: { type: "array", items: { type: "string" } },
        requirements: { type: "array", items: { type: "string" } },
        leverage: { type: "string" },
        files: { type: "array", items: { type: "string" } },
        prompt: { type: "string" },
      },
      required: ["specSlug", "title"],
    },
    handler: async (args) => {
      const v = validateInput(BrainTaskCreateSchema, args);
      if (!v.valid) return v.response;
      return taskManager.create(
        v.data.specSlug,
        v.data.title,
        v.data.description,
        v.data.parentTaskId,
        v.data.acceptanceCriteria,
        v.data.requirements,
        v.data.leverage,
        v.data.files,
        v.data.prompt,
      );
    },
  });

  // --- brain_task_update ---
  server.registerTool({
    name: "brain_task_update",
    description: "Update task status, progress percentage, or notes.",
    inputSchema: {
      type: "object",
      properties: {
        specSlug: { type: "string" },
        taskId: { type: "string" },
        status: { type: "string", enum: ["pending", "in-progress", "completed"] },
        progress: { type: "number", minimum: 0, maximum: 100 },
        notes: { type: "string" },
      },
      required: ["specSlug", "taskId"],
    },
    handler: async (args) => {
      const v = validateInput(BrainTaskUpdateSchema, args);
      if (!v.valid) return v.response;
      return taskManager.update(
        v.data.specSlug,
        v.data.taskId,
        v.data.status,
        v.data.progress,
        v.data.notes,
      );
    },
  });

  // --- brain_task_list ---
  server.registerTool({
    name: "brain_task_list",
    description: "List tasks for a spec with filtering and progress summary.",
    inputSchema: {
      type: "object",
      properties: {
        specSlug: { type: "string" },
        status: { type: "string", enum: ["pending", "in-progress", "completed"] },
        includeSubtasks: { type: "boolean", default: true },
      },
      required: ["specSlug"],
    },
    handler: async (args) => {
      const v = validateInput(BrainTaskListSchema, args);
      if (!v.valid) return v.response;
      return taskManager.list(v.data.specSlug, v.data.status, v.data.includeSubtasks);
    },
  });

  // --- brain_task_log ---
  server.registerTool({
    name: "brain_task_log",
    description:
      "Log implementation details for a task. Captures files, artifacts, and auto-enriches with git data.",
    inputSchema: {
      type: "object",
      properties: {
        specSlug: { type: "string" },
        taskId: { type: "string" },
        summary: { type: "string" },
        filesChanged: { type: "array", items: { type: "string" } },
        filesCreated: { type: "array", items: { type: "string" } },
        linesAdded: { type: "number" },
        linesRemoved: { type: "number" },
        artifacts: { type: "object" },
        notes: { type: "string" },
      },
      required: ["specSlug", "taskId", "summary"],
    },
    handler: async (args) => {
      const v = validateInput(BrainTaskLogSchema, args);
      if (!v.valid) return v.response;
      return taskManager.log(
        v.data.specSlug,
        v.data.taskId,
        v.data.summary,
        v.data.filesChanged,
        v.data.filesCreated,
        v.data.linesAdded,
        v.data.linesRemoved,
        v.data.artifacts,
        v.data.notes,
      );
    },
  });

  // --- brain_progress ---
  server.registerTool({
    name: "brain_progress",
    description: "Get aggregated progress across one or all specs.",
    inputSchema: {
      type: "object",
      properties: {
        specSlug: { type: "string", description: "Specific spec (omit for all specs)" },
      },
    },
    handler: async (args) => {
      const v = validateInput(BrainProgressSchema, args);
      if (!v.valid) return v.response;
      return taskManager.progress(v.data.specSlug);
    },
  });
}
