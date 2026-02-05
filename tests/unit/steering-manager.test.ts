// ABOUTME: Unit tests for SteeringManager — steering document get, set, list, and combined retrieval
// ABOUTME: Uses real temp directories with .brain-spec/ structure; no filesystem mocks

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
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
let manager: SteeringManager;

/** Helper to check if a file exists in the temp directory */
async function fileExists(relativePath: string): Promise<boolean> {
  try {
    await fs.access(path.join(tmpDir, relativePath));
    return true;
  } catch {
    return false;
  }
}

describe("SteeringManager", () => {
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "brain-spec-steering-test-"));
    await fs.mkdir(path.join(tmpDir, ".brain-spec", "steering"), { recursive: true });
    manager = new SteeringManager(tmpDir, config);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('manage("set")', () => {
    it("should create a steering doc with provided content", async () => {
      const customContent = "# Custom Product Vision\n\nWe build great things.";
      const result = await manager.manage("set", "product", customContent);

      expect(result.success).toBe(true);
      expect(result.data!.docType).toBe("product");
      expect(result.data!.created).toBe(true);
      expect(result.data!.path).toContain("product.md");

      // Verify file was actually written with custom content
      const content = await fs.readFile(
        path.join(tmpDir, ".brain-spec", "steering", "product.md"),
        "utf-8",
      );
      expect(content).toBe(customContent);
    });

    it("should create a steering doc with default template when no content provided", async () => {
      const result = await manager.manage("set", "tech");

      expect(result.success).toBe(true);

      const content = await fs.readFile(
        path.join(tmpDir, ".brain-spec", "steering", "tech.md"),
        "utf-8",
      );
      expect(content).toContain("# Technical Steering");
      expect(content).toContain("Architecture Pattern");
      expect(content).toContain("Technology Stack");
    });

    it("should create structure doc with default template", async () => {
      const result = await manager.manage("set", "structure");

      expect(result.success).toBe(true);

      const content = await fs.readFile(
        path.join(tmpDir, ".brain-spec", "steering", "structure.md"),
        "utf-8",
      );
      expect(content).toContain("# Structure Steering");
      expect(content).toContain("Directory Organization");
      expect(content).toContain("Naming Conventions");
    });

    it("should overwrite an existing steering doc", async () => {
      await manager.manage("set", "product", "Original content");
      await manager.manage("set", "product", "Updated content");

      const content = await fs.readFile(
        path.join(tmpDir, ".brain-spec", "steering", "product.md"),
        "utf-8",
      );
      expect(content).toBe("Updated content");
    });

    it("should return error when docType is missing", async () => {
      const result = await manager.manage("set", undefined, "Some content");

      expect(result.success).toBe(false);
      expect(result.error).toContain("docType is required");
    });

    it("should create the steering directory if it does not exist", async () => {
      // Remove the pre-created steering directory
      await fs.rm(path.join(tmpDir, ".brain-spec", "steering"), { recursive: true, force: true });

      const result = await manager.manage("set", "product", "Content after dir creation");

      expect(result.success).toBe(true);
      expect(await fileExists(".brain-spec/steering/product.md")).toBe(true);
    });
  });

  describe('manage("get")', () => {
    it("should return content for a specific existing doc", async () => {
      const docContent = "# Product Vision\n\nFocus on user experience.";
      await manager.manage("set", "product", docContent);

      const result = await manager.manage("get", "product");

      expect(result.success).toBe(true);
      expect(result.data!.docType).toBe("product");
      expect(result.data!.content).toBe(docContent);
    });

    it("should return error for nonexistent doc", async () => {
      const result = await manager.manage("get", "tech");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
      expect(result.error).toContain("tech");
      expect(result.error).toContain("set");
    });

    it("should return all docs when no docType specified", async () => {
      await manager.manage("set", "product", "Product content");
      await manager.manage("set", "tech", "Tech content");
      // structure is intentionally not set

      const result = await manager.manage("get");

      expect(result.success).toBe(true);
      expect(result.data!.documents).toBeDefined();
      expect(result.data!.documents.product).toBe("Product content");
      expect(result.data!.documents.tech).toBe("Tech content");
      expect(result.data!.documents.structure).toBeNull();
    });

    it("should return all nulls when no docs exist", async () => {
      const result = await manager.manage("get");

      expect(result.success).toBe(true);
      expect(result.data!.documents.product).toBeNull();
      expect(result.data!.documents.tech).toBeNull();
      expect(result.data!.documents.structure).toBeNull();
    });
  });

  describe('manage("list")', () => {
    it("should show which docs exist", async () => {
      await manager.manage("set", "product", "Some product doc");
      await manager.manage("set", "structure", "Some structure doc");

      const result = await manager.manage("list");

      expect(result.success).toBe(true);
      expect(result.data!.steeringDocuments).toBeDefined();
      expect(result.data!.steeringDocuments.product).toBe(true);
      expect(result.data!.steeringDocuments.tech).toBe(false);
      expect(result.data!.steeringDocuments.structure).toBe(true);
    });

    it("should show all false when no docs exist", async () => {
      const result = await manager.manage("list");

      expect(result.success).toBe(true);
      expect(result.data!.steeringDocuments.product).toBe(false);
      expect(result.data!.steeringDocuments.tech).toBe(false);
      expect(result.data!.steeringDocuments.structure).toBe(false);
    });

    it("should show all true when all docs exist", async () => {
      await manager.manage("set", "product", "P");
      await manager.manage("set", "tech", "T");
      await manager.manage("set", "structure", "S");

      const result = await manager.manage("list");

      expect(result.success).toBe(true);
      expect(result.data!.steeringDocuments.product).toBe(true);
      expect(result.data!.steeringDocuments.tech).toBe(true);
      expect(result.data!.steeringDocuments.structure).toBe(true);
    });
  });

  describe("manage with unknown action", () => {
    it("should return error for unknown action", async () => {
      // Cast to bypass TypeScript type checking for the test
      const result = await manager.manage("delete" as "get", "product");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown action");
    });
  });

  describe("getAllSteeringContent", () => {
    it("should combine all existing docs with separator", async () => {
      await manager.manage("set", "product", "Product section");
      await manager.manage("set", "tech", "Tech section");
      await manager.manage("set", "structure", "Structure section");

      const combined = await manager.getAllSteeringContent();

      expect(combined).toContain("Product section");
      expect(combined).toContain("Tech section");
      expect(combined).toContain("Structure section");
      expect(combined).toContain("---");
    });

    it("should skip non-existent docs", async () => {
      await manager.manage("set", "product", "Only product here");

      const combined = await manager.getAllSteeringContent();

      expect(combined).toBe("Only product here");
      // Should not contain separator since only one doc exists
      expect(combined).not.toContain("---");
    });

    it("should return empty string when no docs exist", async () => {
      const combined = await manager.getAllSteeringContent();

      expect(combined).toBe("");
    });

    it("should maintain doc order: product, tech, structure", async () => {
      await manager.manage("set", "structure", "Third");
      await manager.manage("set", "product", "First");
      await manager.manage("set", "tech", "Second");

      const combined = await manager.getAllSteeringContent();

      const productIdx = combined.indexOf("First");
      const techIdx = combined.indexOf("Second");
      const structIdx = combined.indexOf("Third");

      expect(productIdx).toBeLessThan(techIdx);
      expect(techIdx).toBeLessThan(structIdx);
    });
  });
});
