// ABOUTME: Shared TypeScript types and interfaces for the Brain Spec MCP server
// ABOUTME: Defines data models for specs, tasks, config, interview state, and tool responses

import { z } from "zod";

/** Standard envelope returned by every tool */
export interface ToolResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Spec status lifecycle */
export type SpecStatus = "draft" | "active" | "completed" | "archived";

/** Task status lifecycle */
export type TaskStatus = "pending" | "in-progress" | "completed";

/** Steering document types */
export type SteeringDocType = "product" | "tech" | "structure";

/** Interview question categories */
export type InterviewCategory =
  | "functional"
  | "technical"
  | "data-model"
  | "edge-cases"
  | "security"
  | "testing"
  | "nonfunctional"
  | "implementation";

/** Spec metadata stored in {slug}.meta.json */
export interface SpecMeta {
  specSlug: string;
  name: string;
  description: string;
  status: SpecStatus;
  interview?: InterviewState;
  createdAt: string;
  updatedAt: string;
}

/** Interview state persisted across sessions */
export interface InterviewState {
  currentCategory: InterviewCategory;
  questionsAsked: number;
  answers: InterviewAnswer[];
  coverageMap: Record<InterviewCategory, number>;
}

export interface InterviewAnswer {
  category: InterviewCategory;
  question: string;
  answer: string;
}

/** Task data stored in tasks.json */
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  parentTaskId: string | null;
  acceptanceCriteria: string[];
  requirements: string[];
  leverage: string;
  files: string[];
  prompt: string;
  progress: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/** Tasks file structure */
export interface TasksFile {
  specSlug: string;
  tasks: Task[];
}

/** Artifact types for implementation logging */
export interface Artifacts {
  endpoints?: ArtifactEndpoint[];
  functions?: ArtifactFunction[];
  classes?: ArtifactClass[];
  components?: ArtifactComponent[];
  integrations?: ArtifactIntegration[];
}

export interface ArtifactEndpoint {
  method: string;
  path: string;
  purpose: string;
  request?: string;
  response?: string;
}

export interface ArtifactFunction {
  name: string;
  purpose: string;
  signature?: string;
  exported: boolean;
  module: string;
}

export interface ArtifactClass {
  name: string;
  purpose: string;
  methods?: string[];
  module: string;
}

export interface ArtifactComponent {
  name: string;
  purpose: string;
  props?: string;
  module: string;
}

export interface ArtifactIntegration {
  from: string;
  to: string;
}

/** Git reference data for implementation logs */
export interface GitReference {
  commitSha: string;
  branch: string;
  timestamp: string;
}

/** Implementation log entry */
export interface ImplementationLog {
  taskId: string;
  summary: string;
  gitRef?: GitReference;
  filesModified: string[];
  filesCreated: string[];
  linesAdded: number;
  linesRemoved: number;
  artifacts: Artifacts;
  notes: string;
  loggedAt: string;
}

/** Project configuration stored in .brain-spec/config.json */
export interface BrainSpecConfig {
  version: string;
  paths: {
    specs: string;
    tasks: string;
    steering: string;
    agents: string;
    skills: string;
    hooks: string;
    rules: string;
    patterns: string;
    archive: string;
    analytics: string;
    claudeMd: string;
  };
  dashboard: {
    enabled: boolean;
    port: number;
    pollIntervalMs: number;
  };
  git: {
    enabled: boolean;
    autoEnrichLogs: boolean;
  };
  defaults: {
    specTemplate: string;
    claudeMdTemplate: string;
    maxTasksPerSpec: number;
    autoLogImplementations: boolean;
    staleThresholdDays: number;
  };
}

/** Progress summary for a spec or across all specs */
export interface ProgressSummary {
  specSlug?: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  completionPercentage: number;
}

/** Archive metadata */
export interface ArchiveMetadata {
  specSlug: string;
  archivedAt: string;
  reason: "completed" | "deprecated" | "superseded";
  supersededBy: string | null;
  summary: string;
  finalStatus: {
    totalTasks: number;
    completedTasks: number;
    specStatus: SpecStatus;
  };
}

// --- Zod schemas for tool input validation ---

export const BrainInitSchema = z.object({
  projectPath: z.string().optional(),
  template: z.string().optional(),
  stack: z.string().optional(),
});

export const BrainSpecCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  mode: z.enum(["blank", "template", "pattern", "interview"]).default("blank"),
  pattern: z.string().optional(),
});

export const BrainSpecInterviewSchema = z.object({
  specSlug: z.string(),
  answer: z.string().optional(),
  action: z.enum(["start", "answer", "finish"]),
});

export const BrainSpecGetSchema = z.object({
  specSlug: z.string(),
});

export const BrainSpecListSchema = z.object({
  status: z.enum(["draft", "active", "completed", "archived"]).optional(),
});

export const BrainSpecUpdateSchema = z.object({
  specSlug: z.string(),
  content: z.string().optional(),
  status: z.enum(["draft", "active", "completed", "archived"]).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const BrainSpecDeleteSchema = z.object({
  specSlug: z.string(),
  confirmSlug: z.string(),
});

export const BrainSpecArchiveSchema = z.object({
  specSlug: z.string(),
  reason: z.enum(["completed", "deprecated", "superseded"]),
  supersededBy: z.string().optional(),
  summary: z.string().optional(),
});

export const BrainSteeringManageSchema = z.object({
  action: z.enum(["get", "set", "list"]),
  docType: z.enum(["product", "tech", "structure"]).optional(),
  content: z.string().optional(),
});

export const BrainTaskCreateSchema = z.object({
  specSlug: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  parentTaskId: z.string().optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  leverage: z.string().optional(),
  files: z.array(z.string()).optional(),
  prompt: z.string().optional(),
});

export const BrainTaskUpdateSchema = z.object({
  specSlug: z.string(),
  taskId: z.string(),
  status: z.enum(["pending", "in-progress", "completed"]).optional(),
  progress: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

export const BrainTaskListSchema = z.object({
  specSlug: z.string(),
  status: z.enum(["pending", "in-progress", "completed"]).optional(),
  includeSubtasks: z.boolean().optional().default(true),
});

export const BrainTaskLogSchema = z.object({
  specSlug: z.string(),
  taskId: z.string(),
  summary: z.string(),
  filesChanged: z.array(z.string()).optional(),
  filesCreated: z.array(z.string()).optional(),
  linesAdded: z.number().optional(),
  linesRemoved: z.number().optional(),
  artifacts: z
    .object({
      endpoints: z.array(z.object({
        method: z.string(),
        path: z.string(),
        purpose: z.string(),
        request: z.string().optional(),
        response: z.string().optional(),
      })).optional(),
      functions: z.array(z.object({
        name: z.string(),
        purpose: z.string(),
        signature: z.string().optional(),
        exported: z.boolean(),
        module: z.string(),
      })).optional(),
      classes: z.array(z.object({
        name: z.string(),
        purpose: z.string(),
        methods: z.array(z.string()).optional(),
        module: z.string(),
      })).optional(),
      components: z.array(z.object({
        name: z.string(),
        purpose: z.string(),
        props: z.string().optional(),
        module: z.string(),
      })).optional(),
      integrations: z.array(z.object({
        from: z.string(),
        to: z.string(),
      })).optional(),
    })
    .optional(),
  notes: z.string().optional(),
});

export const BrainProgressSchema = z.object({
  specSlug: z.string().optional(),
});
