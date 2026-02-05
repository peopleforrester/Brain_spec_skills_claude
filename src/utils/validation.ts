// ABOUTME: Input validation utilities using zod schemas
// ABOUTME: Provides consistent error formatting for tool input validation

import { z } from "zod";
import type { ToolResponse } from "../types.js";

/** Validate tool input against a zod schema. Returns parsed data or error response. */
export function validateInput<T extends z.ZodTypeAny>(
  schema: T,
  input: unknown,
): { valid: true; data: z.infer<T> } | { valid: false; response: ToolResponse } {
  const result = schema.safeParse(input);

  if (result.success) {
    return { valid: true, data: result.data };
  }

  const errors = result.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`,
  );

  return {
    valid: false,
    response: {
      success: false,
      error: `Invalid input: ${errors.join("; ")}`,
    },
  };
}

/** Slugify a spec name: lowercase, replace spaces/special chars with hyphens */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
}

/** Validate a slug format */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || /^[a-z0-9]$/.test(slug);
}
