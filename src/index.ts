// ABOUTME: Entry point for the Brain Spec MCP server
// ABOUTME: Initializes the server, registers all tools/resources/prompts, and starts stdio transport

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { BrainSpecServer } from "./server.js";
import { registerSpecWorkflowTools } from "./modules/spec-workflow/register.js";
import path from "node:path";
import { dirExists, ensureDir, readJsonFile, writeJsonFile } from "./utils/file-system.js";
import { getGitRoot } from "./utils/git.js";
import { DEFAULT_CONFIG } from "./modules/spec-workflow/types.js";
import type { BrainSpecConfig } from "./types.js";

/** Resolve the project root: CLI arg > git root > cwd */
async function resolveProjectRoot(): Promise<string> {
  // Check CLI args for project path
  const args = process.argv.slice(2);
  const dashboardIndex = args.indexOf("--dashboard");

  // Filter out flags to find the project path argument
  const pathArg = args.find(
    (arg) => !arg.startsWith("--") && args.indexOf(arg) !== dashboardIndex + 1,
  );

  if (pathArg) {
    return path.resolve(pathArg);
  }

  // Try git root
  const gitRoot = await getGitRoot(process.cwd());
  if (gitRoot) {
    return gitRoot;
  }

  return process.cwd();
}

/** Load config from .brain-spec/config.json, falling back to defaults */
async function loadConfig(projectRoot: string): Promise<BrainSpecConfig> {
  const configPath = path.join(projectRoot, ".brain-spec", "config.json");
  const userConfig = await readJsonFile<Partial<BrainSpecConfig>>(configPath);

  if (!userConfig) {
    return { ...DEFAULT_CONFIG } as BrainSpecConfig;
  }

  // Deep merge user config over defaults
  return {
    version: userConfig.version || DEFAULT_CONFIG.version,
    paths: { ...DEFAULT_CONFIG.paths, ...userConfig.paths },
    dashboard: { ...DEFAULT_CONFIG.dashboard, ...userConfig.dashboard },
    git: { ...DEFAULT_CONFIG.git, ...userConfig.git },
    defaults: { ...DEFAULT_CONFIG.defaults, ...userConfig.defaults },
  };
}

/** Ensure the .brain-spec/ directory structure exists */
async function ensureWorkspace(projectRoot: string, config: BrainSpecConfig): Promise<void> {
  const brainSpecDir = path.join(projectRoot, ".brain-spec");
  if (await dirExists(brainSpecDir)) return;

  // Create all directories
  const dirs = [
    config.paths.specs,
    config.paths.tasks,
    config.paths.steering,
    config.paths.agents,
    config.paths.skills,
    config.paths.hooks,
    config.paths.rules,
    config.paths.patterns,
    config.paths.archive,
    config.paths.analytics,
  ];

  for (const dir of dirs) {
    await ensureDir(path.resolve(projectRoot, dir));
  }

  // Write default config
  const configPath = path.join(".brain-spec", "config.json");
  await writeJsonFile(configPath, config, projectRoot);
}

async function main() {
  const projectRoot = await resolveProjectRoot();
  const config = await loadConfig(projectRoot);

  // Ensure workspace exists
  await ensureWorkspace(projectRoot, config);

  // Create and configure the MCP server
  const brainSpec = new BrainSpecServer();

  // Register all tool modules
  registerSpecWorkflowTools(brainSpec, projectRoot, config);

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await brainSpec.getServer().connect(transport);
}

main().catch((err) => {
  console.error("Brain Spec MCP server failed to start:", err);
  process.exit(1);
});
