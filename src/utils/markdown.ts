// ABOUTME: Markdown generation utilities for specs and implementation logs
// ABOUTME: Converts structured data into formatted markdown documents

import type { ImplementationLog, Artifacts } from "../types.js";

/** Generate an implementation log as markdown */
export function generateLogMarkdown(log: ImplementationLog): string {
  const lines: string[] = [];

  lines.push(`# Implementation Log — Task ${log.taskId}`);
  lines.push("");
  lines.push("## Summary");
  lines.push(log.summary);
  lines.push("");

  if (log.gitRef) {
    lines.push("## Git Reference");
    lines.push(`- **Commit**: ${log.gitRef.commitSha}`);
    lines.push(`- **Branch**: ${log.gitRef.branch}`);
    lines.push(`- **Date**: ${log.gitRef.timestamp}`);
    lines.push("");
  }

  if (log.filesModified.length > 0 || log.filesCreated.length > 0) {
    lines.push("## Files Changed");
    if (log.filesModified.length > 0) {
      lines.push("### Modified");
      for (const f of log.filesModified) {
        lines.push(`- \`${f}\``);
      }
      lines.push("");
    }
    if (log.filesCreated.length > 0) {
      lines.push("### Created");
      for (const f of log.filesCreated) {
        lines.push(`- \`${f}\``);
      }
      lines.push("");
    }
  }

  lines.push("## Code Statistics");
  lines.push(`- Lines Added: ${log.linesAdded}`);
  lines.push(`- Lines Removed: ${log.linesRemoved}`);
  lines.push(`- Files Changed: ${log.filesModified.length + log.filesCreated.length}`);
  lines.push("");

  if (hasArtifacts(log.artifacts)) {
    lines.push("## Artifacts");
    lines.push(...formatArtifacts(log.artifacts));
    lines.push("");
  }

  if (log.notes) {
    lines.push("## Notes");
    lines.push(log.notes);
    lines.push("");
  }

  return lines.join("\n");
}

function hasArtifacts(artifacts: Artifacts): boolean {
  return !!(
    artifacts.endpoints?.length ||
    artifacts.functions?.length ||
    artifacts.classes?.length ||
    artifacts.components?.length ||
    artifacts.integrations?.length
  );
}

function formatArtifacts(artifacts: Artifacts): string[] {
  const lines: string[] = [];

  if (artifacts.endpoints?.length) {
    lines.push("### API Endpoints");
    for (const ep of artifacts.endpoints) {
      lines.push(`- **${ep.method}** \`${ep.path}\` — ${ep.purpose}`);
      if (ep.request) lines.push(`  - Request: ${ep.request}`);
      if (ep.response) lines.push(`  - Response: ${ep.response}`);
    }
    lines.push("");
  }

  if (artifacts.functions?.length) {
    lines.push("### Functions");
    for (const fn of artifacts.functions) {
      lines.push(`- \`${fn.name}\` — ${fn.purpose}`);
      if (fn.signature) lines.push(`  - Signature: \`${fn.signature}\``);
      lines.push(`  - Exported: ${fn.exported ? "yes" : "no"}`);
      lines.push(`  - Module: \`${fn.module}\``);
    }
    lines.push("");
  }

  if (artifacts.classes?.length) {
    lines.push("### Classes");
    for (const cls of artifacts.classes) {
      lines.push(`- \`${cls.name}\` — ${cls.purpose}`);
      if (cls.methods?.length) lines.push(`  - Methods: ${cls.methods.join(", ")}`);
      lines.push(`  - Module: \`${cls.module}\``);
    }
    lines.push("");
  }

  if (artifacts.components?.length) {
    lines.push("### UI Components");
    for (const comp of artifacts.components) {
      lines.push(`- \`${comp.name}\` — ${comp.purpose}`);
      if (comp.props) lines.push(`  - Props: ${comp.props}`);
      lines.push(`  - Module: \`${comp.module}\``);
    }
    lines.push("");
  }

  if (artifacts.integrations?.length) {
    lines.push("### Integrations");
    for (const int of artifacts.integrations) {
      lines.push(`- ${int.from} → ${int.to}`);
    }
    lines.push("");
  }

  return lines;
}

/** Generate a default spec template */
export function generateDefaultSpecTemplate(name: string, description: string): string {
  return `# Spec: ${name}

## Overview
${description || "TODO: Describe this feature/component."}

## Functional Requirements
- [ ] TODO: Define functional requirements

## Technical Constraints
- TODO: Define technical constraints

## Data Model
TODO: Define data models and relationships

## Edge Cases & Error Handling
- TODO: Define edge cases

## Security Considerations
- TODO: Define security requirements

## Testing Strategy
- TODO: Define testing approach

## Non-Functional Requirements
- TODO: Define performance, scalability requirements

## Implementation Checklist
- [ ] TODO: Break down into tasks

## Acceptance Criteria
- [ ] TODO: Define acceptance criteria
`;
}
