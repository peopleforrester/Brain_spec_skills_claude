// ABOUTME: Unit tests for deterministic task ID generation
// ABOUTME: Tests top-level task ID assignment and hierarchical subtask ID generation

import { describe, it, expect } from "vitest";

import { generateTaskId } from "../../src/utils/id-generator.js";
import type { Task } from "../../src/types.js";

/** Helper to create a minimal Task object for testing */
function makeTask(id: string, parentTaskId: string | null = null): Task {
  return {
    id,
    title: `Task ${id}`,
    description: "",
    status: "pending",
    parentTaskId,
    acceptanceCriteria: [],
    requirements: [],
    leverage: "",
    files: [],
    prompt: "",
    progress: 0,
    notes: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("id-generator", () => {
  // ---------------------------------------------------------------
  // Top-level task IDs (parentTaskId = null)
  // ---------------------------------------------------------------
  describe("generateTaskId for top-level tasks", () => {
    it("should return '1' when there are no existing tasks", () => {
      const result = generateTaskId([], null);
      expect(result).toBe("1");
    });

    it("should return '2' when there is one top-level task with id '1'", () => {
      const tasks = [makeTask("1")];
      const result = generateTaskId(tasks, null);
      expect(result).toBe("2");
    });

    it("should increment from the highest existing top-level ID", () => {
      const tasks = [makeTask("1"), makeTask("2"), makeTask("3")];
      const result = generateTaskId(tasks, null);
      expect(result).toBe("4");
    });

    it("should handle gaps in top-level IDs", () => {
      const tasks = [makeTask("1"), makeTask("5")];
      const result = generateTaskId(tasks, null);
      expect(result).toBe("6");
    });

    it("should ignore subtasks when computing next top-level ID", () => {
      const tasks = [
        makeTask("1"),
        makeTask("1.1", "1"),
        makeTask("1.2", "1"),
        makeTask("2"),
      ];
      const result = generateTaskId(tasks, null);
      expect(result).toBe("3");
    });

    it("should handle a single top-level task with a high ID", () => {
      const tasks = [makeTask("10")];
      const result = generateTaskId(tasks, null);
      expect(result).toBe("11");
    });
  });

  // ---------------------------------------------------------------
  // Subtask IDs (parentTaskId is set)
  // ---------------------------------------------------------------
  describe("generateTaskId for subtasks", () => {
    it("should return 'parent.1' for first subtask under a parent", () => {
      const tasks = [makeTask("1")];
      const result = generateTaskId(tasks, "1");
      expect(result).toBe("1.1");
    });

    it("should increment subtask number for existing siblings", () => {
      const tasks = [
        makeTask("1"),
        makeTask("1.1", "1"),
        makeTask("1.2", "1"),
      ];
      const result = generateTaskId(tasks, "1");
      expect(result).toBe("1.3");
    });

    it("should handle subtask IDs under different parents independently", () => {
      const tasks = [
        makeTask("1"),
        makeTask("1.1", "1"),
        makeTask("1.2", "1"),
        makeTask("2"),
        makeTask("2.1", "2"),
      ];

      const resultParent1 = generateTaskId(tasks, "1");
      expect(resultParent1).toBe("1.3");

      const resultParent2 = generateTaskId(tasks, "2");
      expect(resultParent2).toBe("2.2");
    });

    it("should return 'parent.1' when parent has no subtasks yet", () => {
      const tasks = [makeTask("1"), makeTask("2")];
      const result = generateTaskId(tasks, "2");
      expect(result).toBe("2.1");
    });

    it("should handle gaps in subtask numbering", () => {
      const tasks = [
        makeTask("1"),
        makeTask("1.1", "1"),
        makeTask("1.5", "1"),
      ];
      const result = generateTaskId(tasks, "1");
      expect(result).toBe("1.6");
    });

    it("should handle nested subtasks (sub-subtasks)", () => {
      const tasks = [
        makeTask("1"),
        makeTask("1.1", "1"),
        makeTask("1.1.1", "1.1"),
        makeTask("1.1.2", "1.1"),
      ];
      const result = generateTaskId(tasks, "1.1");
      expect(result).toBe("1.1.3");
    });

    it("should handle deeply nested subtasks", () => {
      const tasks = [
        makeTask("1"),
        makeTask("1.1", "1"),
        makeTask("1.1.1", "1.1"),
        makeTask("1.1.1.1", "1.1.1"),
      ];
      const result = generateTaskId(tasks, "1.1.1");
      expect(result).toBe("1.1.1.2");
    });

    it("should return parent.1 when tasks list is empty (no siblings)", () => {
      const result = generateTaskId([], "3");
      expect(result).toBe("3.1");
    });
  });
});
