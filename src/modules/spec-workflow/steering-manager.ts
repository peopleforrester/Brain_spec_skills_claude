// ABOUTME: Steering document management (product.md, tech.md, structure.md)
// ABOUTME: Handles creation, retrieval, and listing of project-level guidance documents

import path from "node:path";
import type { ToolResponse, BrainSpecConfig, SteeringDocType } from "../../types.js";
import { readFile, writeFile, fileExists, ensureDir } from "../../utils/file-system.js";

const STEERING_TEMPLATES: Record<SteeringDocType, string> = {
  product: `# Product Steering

## Vision
TODO: One-paragraph vision statement.

## Target Audience
- TODO: Persona 1

## Core Features
1. TODO: Feature description and value proposition

## Success Metrics
- TODO: Metric and target value

## Out of Scope
- TODO: Items explicitly excluded
`,
  tech: `# Technical Steering

## Architecture Pattern
TODO: Monolith, microservices, etc.

## Technology Stack
- Language: TODO
- Framework: TODO
- Database: TODO

## Performance Requirements
- Response time: TODO
- Throughput: TODO

## Security Architecture
- Authentication: TODO
- Authorization: TODO

## Constraints
- TODO: Must run on X, cannot use Y
`,
  structure: `# Structure Steering

## Directory Organization
TODO: Describe project directory layout

## Naming Conventions
- Files: snake_case
- Classes: PascalCase
- Functions: camelCase
- Constants: UPPER_CASE

## Module Boundaries
- TODO: Module and responsibility

## Development Guidelines
- TODO: Key development patterns
`,
};

export class SteeringManager {
  constructor(
    private projectRoot: string,
    private config: BrainSpecConfig,
  ) {}

  private getSteeringPath(docType: SteeringDocType): string {
    return path.resolve(this.projectRoot, this.config.paths.steering, `${docType}.md`);
  }

  /** Get, set, or list steering documents */
  async manage(
    action: "get" | "set" | "list",
    docType?: SteeringDocType,
    content?: string,
  ): Promise<ToolResponse> {
    switch (action) {
      case "get":
        return this.get(docType);
      case "set":
        return this.set(docType, content);
      case "list":
        return this.list();
      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }

  /** Get a steering document or all documents */
  private async get(docType?: SteeringDocType): Promise<ToolResponse> {
    if (docType) {
      const filePath = this.getSteeringPath(docType);
      const content = await readFile(filePath);
      if (content === null) {
        return {
          success: false,
          error: `Steering document "${docType}" not found. Use action "set" to create it.`,
        };
      }
      return { success: true, data: { docType, content } };
    }

    // Get all steering documents
    const docs: Record<string, string | null> = {};
    for (const type of ["product", "tech", "structure"] as SteeringDocType[]) {
      const filePath = this.getSteeringPath(type);
      docs[type] = await readFile(filePath);
    }

    return { success: true, data: { documents: docs } };
  }

  /** Set (create or update) a steering document */
  private async set(docType?: SteeringDocType, content?: string): Promise<ToolResponse> {
    if (!docType) {
      return { success: false, error: "docType is required for set action" };
    }

    const steeringDir = path.resolve(this.projectRoot, this.config.paths.steering);
    await ensureDir(steeringDir);

    const docContent = content || STEERING_TEMPLATES[docType];
    const relativePath = path.join(this.config.paths.steering, `${docType}.md`);
    await writeFile(relativePath, docContent, this.projectRoot);

    return {
      success: true,
      data: {
        docType,
        path: relativePath,
        created: true,
      },
    };
  }

  /** List which steering documents exist */
  private async list(): Promise<ToolResponse> {
    const status: Record<string, boolean> = {};
    for (const type of ["product", "tech", "structure"] as SteeringDocType[]) {
      const filePath = this.getSteeringPath(type);
      status[type] = await fileExists(filePath);
    }

    return { success: true, data: { steeringDocuments: status } };
  }

  /** Get all steering content combined (for interview engine context) */
  async getAllSteeringContent(): Promise<string> {
    const parts: string[] = [];
    for (const type of ["product", "tech", "structure"] as SteeringDocType[]) {
      const filePath = this.getSteeringPath(type);
      const content = await readFile(filePath);
      if (content) {
        parts.push(content);
      }
    }
    return parts.join("\n\n---\n\n");
  }
}
