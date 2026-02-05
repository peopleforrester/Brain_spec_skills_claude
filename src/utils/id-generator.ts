// ABOUTME: Deterministic ID generation for tasks
// ABOUTME: Generates hierarchical IDs (1.1, 1.2, 2.1) based on parent task context

import type { Task } from "../types.js";

/** Generate the next task ID for a given parent context */
export function generateTaskId(tasks: Task[], parentTaskId: string | null): string {
  if (parentTaskId === null) {
    // Top-level task: find highest top-level ID and increment
    const topLevelIds = tasks
      .filter((t) => t.parentTaskId === null)
      .map((t) => parseFloat(t.id))
      .filter((n) => !isNaN(n));

    const maxId = topLevelIds.length > 0 ? Math.max(...topLevelIds) : 0;
    return String(Math.floor(maxId) + 1);
  }

  // Subtask: find highest sibling ID under this parent and increment
  const siblingIds = tasks
    .filter((t) => t.parentTaskId === parentTaskId)
    .map((t) => {
      const parts = t.id.split(".");
      return parseInt(parts[parts.length - 1], 10);
    })
    .filter((n) => !isNaN(n));

  const maxSub = siblingIds.length > 0 ? Math.max(...siblingIds) : 0;
  return `${parentTaskId}.${maxSub + 1}`;
}
