// ABOUTME: Unit tests for input validation utilities
// ABOUTME: Tests validateInput with zod schemas, slugify transformations, and isValidSlug checks

import { describe, it, expect } from "vitest";
import { z } from "zod";

import { validateInput, slugify, isValidSlug } from "../../src/utils/validation.js";

describe("validation utilities", () => {
  // ---------------------------------------------------------------
  // validateInput
  // ---------------------------------------------------------------
  describe("validateInput", () => {
    const testSchema = z.object({
      name: z.string().min(1),
      age: z.number().int().positive(),
      email: z.string().email().optional(),
    });

    it("should return valid: true with parsed data for valid input", () => {
      const input = { name: "Alice", age: 30 };
      const result = validateInput(testSchema, input);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toEqual({ name: "Alice", age: 30 });
      }
    });

    it("should return valid: true with optional fields included", () => {
      const input = { name: "Bob", age: 25, email: "bob@example.com" };
      const result = validateInput(testSchema, input);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.email).toBe("bob@example.com");
      }
    });

    it("should return valid: false with error response for missing required field", () => {
      const input = { age: 30 };
      const result = validateInput(testSchema, input);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.response.success).toBe(false);
        expect(result.response.error).toContain("Invalid input");
      }
    });

    it("should return valid: false for wrong types", () => {
      const input = { name: "Alice", age: "not-a-number" };
      const result = validateInput(testSchema, input);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.response.error).toContain("Invalid input");
      }
    });

    it("should return valid: false for empty name (min length 1)", () => {
      const input = { name: "", age: 30 };
      const result = validateInput(testSchema, input);

      expect(result.valid).toBe(false);
    });

    it("should return valid: false for negative age", () => {
      const input = { name: "Alice", age: -5 };
      const result = validateInput(testSchema, input);

      expect(result.valid).toBe(false);
    });

    it("should return valid: false for invalid email format", () => {
      const input = { name: "Alice", age: 30, email: "not-an-email" };
      const result = validateInput(testSchema, input);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.response.error).toContain("email");
      }
    });

    it("should return valid: false for null input", () => {
      const result = validateInput(testSchema, null);
      expect(result.valid).toBe(false);
    });

    it("should return valid: false for undefined input", () => {
      const result = validateInput(testSchema, undefined);
      expect(result.valid).toBe(false);
    });

    it("should include field path in error message", () => {
      const input = { name: "Alice", age: "bad" };
      const result = validateInput(testSchema, input);

      if (!result.valid) {
        expect(result.response.error).toContain("age");
      }
    });

    it("should handle multiple validation errors", () => {
      const input = { name: "", age: -1, email: "bad" };
      const result = validateInput(testSchema, input);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        // Error message should contain multiple field errors separated by semicolons
        expect(result.response.error).toContain(";");
      }
    });

    it("should work with a simple string schema", () => {
      const stringSchema = z.string().min(3);

      const validResult = validateInput(stringSchema, "hello");
      expect(validResult.valid).toBe(true);

      const invalidResult = validateInput(stringSchema, "hi");
      expect(invalidResult.valid).toBe(false);
    });

    it("should work with enum schemas", () => {
      const enumSchema = z.enum(["draft", "active", "completed"]);

      const validResult = validateInput(enumSchema, "draft");
      expect(validResult.valid).toBe(true);

      const invalidResult = validateInput(enumSchema, "unknown");
      expect(invalidResult.valid).toBe(false);
    });

    it("should apply zod default values", () => {
      const schemaWithDefaults = z.object({
        mode: z.enum(["blank", "template"]).default("blank"),
        name: z.string(),
      });

      const result = validateInput(schemaWithDefaults, { name: "test" });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.mode).toBe("blank");
      }
    });
  });

  // ---------------------------------------------------------------
  // slugify
  // ---------------------------------------------------------------
  describe("slugify", () => {
    it("should convert spaces to hyphens", () => {
      expect(slugify("my spec name")).toBe("my-spec-name");
    });

    it("should convert to lowercase", () => {
      expect(slugify("My Spec Name")).toBe("my-spec-name");
    });

    it("should remove special characters", () => {
      expect(slugify("spec@name!#$%")).toBe("spec-name");
    });

    it("should collapse multiple hyphens into one", () => {
      expect(slugify("spec---name")).toBe("spec-name");
    });

    it("should strip leading and trailing hyphens", () => {
      expect(slugify("--spec-name--")).toBe("spec-name");
    });

    it("should handle mixed special characters and spaces", () => {
      expect(slugify("  Hello, World! (v2)  ")).toBe("hello-world-v2");
    });

    it("should handle single word input", () => {
      expect(slugify("authentication")).toBe("authentication");
    });

    it("should handle already valid slugs", () => {
      expect(slugify("valid-slug")).toBe("valid-slug");
    });

    it("should handle numbers", () => {
      expect(slugify("version 2.0")).toBe("version-2-0");
    });

    it("should handle all special characters resulting in empty string after strip", () => {
      expect(slugify("@#$%^&*")).toBe("");
    });

    it("should truncate slugs longer than 100 characters", () => {
      const longName = "a".repeat(200);
      const result = slugify(longName);
      expect(result.length).toBeLessThanOrEqual(100);
    });

    it("should handle unicode characters by replacing them with hyphens", () => {
      expect(slugify("caf\u00e9 latt\u00e9")).toBe("caf-latt");
    });

    it("should handle tabs and newlines", () => {
      expect(slugify("spec\tname\nhere")).toBe("spec-name-here");
    });
  });

  // ---------------------------------------------------------------
  // isValidSlug
  // ---------------------------------------------------------------
  describe("isValidSlug", () => {
    it("should accept a valid multi-character slug", () => {
      expect(isValidSlug("my-spec")).toBe(true);
    });

    it("should accept a single character slug", () => {
      expect(isValidSlug("a")).toBe(true);
    });

    it("should accept a single digit slug", () => {
      expect(isValidSlug("1")).toBe(true);
    });

    it("should accept slugs with numbers", () => {
      expect(isValidSlug("spec-v2")).toBe(true);
    });

    it("should accept all-numeric slugs", () => {
      expect(isValidSlug("123")).toBe(true);
    });

    it("should reject slugs starting with a hyphen", () => {
      expect(isValidSlug("-bad")).toBe(false);
    });

    it("should reject slugs ending with a hyphen", () => {
      expect(isValidSlug("bad-")).toBe(false);
    });

    it("should reject slugs with uppercase letters", () => {
      expect(isValidSlug("Bad")).toBe(false);
    });

    it("should reject slugs with spaces", () => {
      expect(isValidSlug("bad slug")).toBe(false);
    });

    it("should reject slugs with special characters", () => {
      expect(isValidSlug("bad@slug")).toBe(false);
    });

    it("should reject empty string", () => {
      expect(isValidSlug("")).toBe(false);
    });

    it("should reject slugs with underscores", () => {
      expect(isValidSlug("bad_slug")).toBe(false);
    });

    it("should reject slugs with dots", () => {
      expect(isValidSlug("bad.slug")).toBe(false);
    });

    it("should accept two-character slugs", () => {
      expect(isValidSlug("ab")).toBe(true);
    });

    it("should accept long valid slugs", () => {
      expect(isValidSlug("this-is-a-perfectly-valid-long-slug-123")).toBe(true);
    });
  });
});
