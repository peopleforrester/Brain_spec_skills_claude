// ABOUTME: Unit tests for markdown generation utilities
// ABOUTME: Tests implementation log markdown output and default spec template generation

import { describe, it, expect } from "vitest";

import {
  generateLogMarkdown,
  generateDefaultSpecTemplate,
} from "../../src/utils/markdown.js";
import type { ImplementationLog } from "../../src/types.js";

/** Helper to create a full ImplementationLog for testing */
function makeFullLog(): ImplementationLog {
  return {
    taskId: "1.2",
    summary: "Implemented user authentication flow with JWT tokens.",
    gitRef: {
      commitSha: "abc123def456",
      branch: "feature/auth",
      timestamp: "2025-01-15T10:30:00Z",
    },
    filesModified: ["src/auth/handler.ts", "src/auth/middleware.ts"],
    filesCreated: ["src/auth/jwt.ts", "src/auth/types.ts"],
    linesAdded: 150,
    linesRemoved: 20,
    artifacts: {
      endpoints: [
        {
          method: "POST",
          path: "/api/auth/login",
          purpose: "Authenticate user and return JWT",
          request: "{ email: string, password: string }",
          response: "{ token: string, expiresIn: number }",
        },
      ],
      functions: [
        {
          name: "verifyToken",
          purpose: "Validate and decode a JWT token",
          signature: "(token: string) => Promise<JwtPayload>",
          exported: true,
          module: "src/auth/jwt.ts",
        },
      ],
      classes: [
        {
          name: "AuthService",
          purpose: "Manages authentication logic",
          methods: ["login", "logout", "refreshToken"],
          module: "src/auth/service.ts",
        },
      ],
      components: [
        {
          name: "LoginForm",
          purpose: "User login form component",
          props: "{ onSuccess: () => void }",
          module: "src/components/LoginForm.tsx",
        },
      ],
      integrations: [
        { from: "AuthService", to: "UserDatabase" },
      ],
    },
    notes: "Consider adding rate limiting to the login endpoint.",
    loggedAt: "2025-01-15T10:35:00Z",
  };
}

/** Helper to create a minimal ImplementationLog (no optional fields) */
function makeMinimalLog(): ImplementationLog {
  return {
    taskId: "3",
    summary: "Set up project scaffolding.",
    filesModified: [],
    filesCreated: [],
    linesAdded: 0,
    linesRemoved: 0,
    artifacts: {},
    notes: "",
    loggedAt: "2025-01-10T08:00:00Z",
  };
}

describe("markdown utilities", () => {
  // ---------------------------------------------------------------
  // generateLogMarkdown
  // ---------------------------------------------------------------
  describe("generateLogMarkdown", () => {
    describe("with full log data", () => {
      let markdown: string;

      it("should produce a non-empty string", () => {
        markdown = generateLogMarkdown(makeFullLog());
        expect(markdown).toBeTruthy();
        expect(typeof markdown).toBe("string");
      });

      it("should contain the task ID in the heading", () => {
        markdown = generateLogMarkdown(makeFullLog());
        expect(markdown).toContain("# Implementation Log \u2014 Task 1.2");
      });

      it("should contain the summary section", () => {
        markdown = generateLogMarkdown(makeFullLog());
        expect(markdown).toContain("## Summary");
        expect(markdown).toContain("Implemented user authentication flow with JWT tokens.");
      });

      it("should contain the git reference section", () => {
        markdown = generateLogMarkdown(makeFullLog());
        expect(markdown).toContain("## Git Reference");
        expect(markdown).toContain("abc123def456");
        expect(markdown).toContain("feature/auth");
        expect(markdown).toContain("2025-01-15T10:30:00Z");
      });

      it("should contain the files changed section with modified and created files", () => {
        markdown = generateLogMarkdown(makeFullLog());
        expect(markdown).toContain("## Files Changed");
        expect(markdown).toContain("### Modified");
        expect(markdown).toContain("`src/auth/handler.ts`");
        expect(markdown).toContain("`src/auth/middleware.ts`");
        expect(markdown).toContain("### Created");
        expect(markdown).toContain("`src/auth/jwt.ts`");
        expect(markdown).toContain("`src/auth/types.ts`");
      });

      it("should contain code statistics", () => {
        markdown = generateLogMarkdown(makeFullLog());
        expect(markdown).toContain("## Code Statistics");
        expect(markdown).toContain("Lines Added: 150");
        expect(markdown).toContain("Lines Removed: 20");
        expect(markdown).toContain("Files Changed: 4");
      });

      it("should contain the artifacts section", () => {
        markdown = generateLogMarkdown(makeFullLog());
        expect(markdown).toContain("## Artifacts");
      });

      it("should contain API endpoint artifacts", () => {
        markdown = generateLogMarkdown(makeFullLog());
        expect(markdown).toContain("### API Endpoints");
        expect(markdown).toContain("**POST** `/api/auth/login`");
        expect(markdown).toContain("Authenticate user and return JWT");
        expect(markdown).toContain("Request:");
        expect(markdown).toContain("Response:");
      });

      it("should contain function artifacts", () => {
        markdown = generateLogMarkdown(makeFullLog());
        expect(markdown).toContain("### Functions");
        expect(markdown).toContain("`verifyToken`");
        expect(markdown).toContain("Validate and decode a JWT token");
        expect(markdown).toContain("Signature:");
        expect(markdown).toContain("Exported: yes");
        expect(markdown).toContain("Module: `src/auth/jwt.ts`");
      });

      it("should contain class artifacts", () => {
        markdown = generateLogMarkdown(makeFullLog());
        expect(markdown).toContain("### Classes");
        expect(markdown).toContain("`AuthService`");
        expect(markdown).toContain("Methods: login, logout, refreshToken");
        expect(markdown).toContain("Module: `src/auth/service.ts`");
      });

      it("should contain UI component artifacts", () => {
        markdown = generateLogMarkdown(makeFullLog());
        expect(markdown).toContain("### UI Components");
        expect(markdown).toContain("`LoginForm`");
        expect(markdown).toContain("Props:");
      });

      it("should contain integration artifacts", () => {
        markdown = generateLogMarkdown(makeFullLog());
        expect(markdown).toContain("### Integrations");
        expect(markdown).toContain("AuthService \u2192 UserDatabase");
      });

      it("should contain the notes section", () => {
        markdown = generateLogMarkdown(makeFullLog());
        expect(markdown).toContain("## Notes");
        expect(markdown).toContain("Consider adding rate limiting to the login endpoint.");
      });
    });

    describe("with minimal log data (missing optional fields)", () => {
      let markdown: string;

      it("should produce a non-empty string", () => {
        markdown = generateLogMarkdown(makeMinimalLog());
        expect(markdown).toBeTruthy();
      });

      it("should contain the task ID in the heading", () => {
        markdown = generateLogMarkdown(makeMinimalLog());
        expect(markdown).toContain("# Implementation Log \u2014 Task 3");
      });

      it("should contain the summary", () => {
        markdown = generateLogMarkdown(makeMinimalLog());
        expect(markdown).toContain("Set up project scaffolding.");
      });

      it("should not contain git reference section when gitRef is missing", () => {
        markdown = generateLogMarkdown(makeMinimalLog());
        expect(markdown).not.toContain("## Git Reference");
      });

      it("should not contain files changed section when no files modified or created", () => {
        markdown = generateLogMarkdown(makeMinimalLog());
        expect(markdown).not.toContain("## Files Changed");
      });

      it("should still contain code statistics with zero values", () => {
        markdown = generateLogMarkdown(makeMinimalLog());
        expect(markdown).toContain("## Code Statistics");
        expect(markdown).toContain("Lines Added: 0");
        expect(markdown).toContain("Lines Removed: 0");
        expect(markdown).toContain("Files Changed: 0");
      });

      it("should not contain artifacts section when artifacts are empty", () => {
        markdown = generateLogMarkdown(makeMinimalLog());
        expect(markdown).not.toContain("## Artifacts");
      });

      it("should not contain notes section when notes is empty string", () => {
        markdown = generateLogMarkdown(makeMinimalLog());
        expect(markdown).not.toContain("## Notes");
      });
    });

    describe("with partial optional fields", () => {
      it("should show only Modified section when only filesModified is populated", () => {
        const log = makeMinimalLog();
        log.filesModified = ["src/index.ts"];
        const markdown = generateLogMarkdown(log);

        expect(markdown).toContain("## Files Changed");
        expect(markdown).toContain("### Modified");
        expect(markdown).not.toContain("### Created");
      });

      it("should show only Created section when only filesCreated is populated", () => {
        const log = makeMinimalLog();
        log.filesCreated = ["src/new-file.ts"];
        const markdown = generateLogMarkdown(log);

        expect(markdown).toContain("## Files Changed");
        expect(markdown).toContain("### Created");
        expect(markdown).not.toContain("### Modified");
      });

      it("should show artifacts section with only endpoints", () => {
        const log = makeMinimalLog();
        log.artifacts = {
          endpoints: [
            { method: "GET", path: "/health", purpose: "Health check" },
          ],
        };
        const markdown = generateLogMarkdown(log);

        expect(markdown).toContain("## Artifacts");
        expect(markdown).toContain("### API Endpoints");
        expect(markdown).not.toContain("### Functions");
        expect(markdown).not.toContain("### Classes");
      });

      it("should handle endpoint without optional request/response fields", () => {
        const log = makeMinimalLog();
        log.artifacts = {
          endpoints: [
            { method: "GET", path: "/ping", purpose: "Ping endpoint" },
          ],
        };
        const markdown = generateLogMarkdown(log);

        expect(markdown).toContain("**GET** `/ping`");
        expect(markdown).not.toContain("Request:");
        expect(markdown).not.toContain("Response:");
      });

      it("should handle function without optional signature", () => {
        const log = makeMinimalLog();
        log.artifacts = {
          functions: [
            {
              name: "init",
              purpose: "Initialize the system",
              exported: false,
              module: "src/main.ts",
            },
          ],
        };
        const markdown = generateLogMarkdown(log);

        expect(markdown).toContain("`init`");
        expect(markdown).toContain("Exported: no");
        expect(markdown).not.toContain("Signature:");
      });

      it("should handle class without optional methods", () => {
        const log = makeMinimalLog();
        log.artifacts = {
          classes: [
            {
              name: "Config",
              purpose: "Configuration holder",
              module: "src/config.ts",
            },
          ],
        };
        const markdown = generateLogMarkdown(log);

        expect(markdown).toContain("`Config`");
        expect(markdown).not.toContain("Methods:");
      });

      it("should handle component without optional props", () => {
        const log = makeMinimalLog();
        log.artifacts = {
          components: [
            {
              name: "Header",
              purpose: "Page header",
              module: "src/components/Header.tsx",
            },
          ],
        };
        const markdown = generateLogMarkdown(log);

        expect(markdown).toContain("`Header`");
        expect(markdown).not.toContain("Props:");
      });

      it("should show notes section when notes is a non-empty string", () => {
        const log = makeMinimalLog();
        log.notes = "Important note here.";
        const markdown = generateLogMarkdown(log);

        expect(markdown).toContain("## Notes");
        expect(markdown).toContain("Important note here.");
      });
    });
  });

  // ---------------------------------------------------------------
  // generateDefaultSpecTemplate
  // ---------------------------------------------------------------
  describe("generateDefaultSpecTemplate", () => {
    it("should include the spec name in the heading", () => {
      const template = generateDefaultSpecTemplate("User Auth", "Handle user login");
      expect(template).toContain("# Spec: User Auth");
    });

    it("should include the description in the Overview section", () => {
      const template = generateDefaultSpecTemplate("Billing", "Manage subscription billing");
      expect(template).toContain("Manage subscription billing");
    });

    it("should use TODO placeholder when description is empty", () => {
      const template = generateDefaultSpecTemplate("Search", "");
      expect(template).toContain("TODO: Describe this feature/component.");
    });

    it("should contain all expected sections", () => {
      const template = generateDefaultSpecTemplate("API Gateway", "Route and proxy requests");
      const expectedSections = [
        "## Overview",
        "## Functional Requirements",
        "## Technical Constraints",
        "## Data Model",
        "## Edge Cases & Error Handling",
        "## Security Considerations",
        "## Testing Strategy",
        "## Non-Functional Requirements",
        "## Implementation Checklist",
        "## Acceptance Criteria",
      ];

      for (const section of expectedSections) {
        expect(template).toContain(section);
      }
    });

    it("should contain TODO placeholders for all sections", () => {
      const template = generateDefaultSpecTemplate("Notifications", "Send push notifications");
      // Multiple TODO items should be present for the various sections
      const todoCount = (template.match(/TODO:/g) || []).length;
      expect(todoCount).toBeGreaterThanOrEqual(7);
    });

    it("should contain checkbox items for checklists", () => {
      const template = generateDefaultSpecTemplate("Cache", "Caching layer");
      expect(template).toContain("- [ ] TODO:");
    });

    it("should return a string ending with a newline", () => {
      const template = generateDefaultSpecTemplate("Test", "Description");
      expect(template.endsWith("\n")).toBe(true);
    });

    it("should handle special characters in name and description", () => {
      const template = generateDefaultSpecTemplate(
        "Feature <v2> & More",
        "Description with 'quotes' and \"doubles\"",
      );
      expect(template).toContain("# Spec: Feature <v2> & More");
      expect(template).toContain("Description with 'quotes' and \"doubles\"");
    });
  });
});
