// ABOUTME: Types specific to the spec workflow module
// ABOUTME: Re-exports shared types and defines module-local interfaces

export type { SpecMeta, SpecStatus, Task, TasksFile, TaskStatus } from "../../types.js";

/** Default configuration for .brain-spec/config.json */
export const DEFAULT_CONFIG = {
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
  dashboard: {
    enabled: true,
    port: 5100,
    pollIntervalMs: 3000,
  },
  git: {
    enabled: true,
    autoEnrichLogs: true,
  },
  defaults: {
    specTemplate: "standard",
    claudeMdTemplate: "minimal",
    maxTasksPerSpec: 20,
    autoLogImplementations: true,
    staleThresholdDays: 7,
  },
} as const;

/** Detected tech stack from project files */
export interface DetectedStack {
  name: string;
  language: string;
  framework?: string;
  packageManager?: string;
  testFramework?: string;
}
