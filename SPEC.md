# Brain Spec MCP Server — Full Specification

**Version:** 1.0.0-draft
**Date:** February 5, 2026
**Status:** Pre-implementation
**License:** MIT
**Package Name:** `@brain-spec/mcp-server`

---

## 1. Project Overview

### 1.1 What This Is

Brain Spec is a Model Context Protocol (MCP) server that combines two things that currently exist as separate tools:

1. **Spec-driven development workflow** — interview-first spec generation, task breakdown, progress tracking (inspired by [Pimzino/spec-workflow-mcp](https://github.com/Pimzino/spec-workflow-mcp))
2. **Development environment configuration** — CLAUDE.md generation, skill/agent management, hook automation, rules enforcement (inspired by [affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code) and [peopleforrester/claude-dotfiles](https://github.com/peopleforrester/claude-dotfiles))

No existing tool merges these two layers into a single MCP server. Users currently have to install Pimzino for workflow management AND manually configure their Claude Code environment from scattered repos. Brain Spec eliminates that fragmentation.

### 1.2 Who This Is For

- **Solo developers** using Claude Code or Claude Desktop who want structured spec-driven workflows without manual setup
- **Teams** who want consistent Claude Code configuration across contributors
- **Open source maintainers** who want to onboard AI-assisted contributors with pre-configured environments

### 1.3 Compatibility Targets

| Client | Support Level |
|---|---|
| Claude Code CLI | Primary — full feature support |
| Claude Desktop | Primary — full feature support |
| Cursor / Windsurf / Continue | Secondary — core tools work, hooks may vary |
| Any MCP-compatible client | Basic — spec and config tools work |

### 1.4 Core Design Principles

1. **Moderately opinionated** — sensible defaults for directory structure, file naming, and workflow. Everything is configurable via `.brain-spec/config.json`.
2. **File-based state** — all specs, tasks, configs, and metadata stored as JSON/markdown in `.brain-spec/`. No databases. Everything is git-friendly and human-readable.
3. **Interview-first, not ceremony-first** — no rigid phase gates or approval workflows. The server helps you build good specs through conversation, not bureaucratic enforcement.
4. **Composable** — each tool module (spec workflow, config generation, skills, hooks, rules) works independently. Users can adopt incrementally.
5. **Planning is the highest-leverage activity** — spending 10–20% of tokens on a good spec drives 80–90% of quality outcomes. Specs survive sessions; when context resets, the spec file is the recovery point.
6. **Security by constraint** — the server only reads/writes within `.brain-spec/` (plus CLAUDE.md at project root). Git integration is read-only. No arbitrary shell execution.

---

## 2. Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│                 MCP Clients                      │
│  (Claude Code CLI, Claude Desktop, Cursor, etc.) │
└──────────────────┬──────────────────────────────┘
                   │ MCP Protocol (stdio/SSE)
                   ▼
┌─────────────────────────────────────────────────┐
│            Brain Spec MCP Server                 │
│                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐│
│  │  Spec    │ │  Config  │ │   Learning &     ││
│  │ Workflow │ │  Engine  │ │   Analytics      ││
│  │ Module   │ │  Module  │ │   Module         ││
│  └────┬─────┘ └────┬─────┘ └────────┬─────────┘│
│       │             │                │           │
│  ┌────▼─────────────▼────────────────▼─────────┐│
│  │          File System Layer                   ││
│  │     .brain-spec/ directory management        ││
│  └──────────────────────────────────────────────┘│
│                                                  │
│  ┌──────────────────────────────────────────────┐│
│  │       Git Integration Layer (read-only)       ││
│  │   Project root, commit SHAs, branch, diffs    ││
│  └──────────────────────────────────────────────┘│
│                                                  │
│  ┌──────────────────────────────────────────────┐│
│  │          Dashboard Server (optional)          ││
│  │     Express + polling API on port 5100        ││
│  └──────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Language | TypeScript 5.x | MCP ecosystem standard, npx-native distribution |
| MCP SDK | `@modelcontextprotocol/sdk` | Official Anthropic MCP SDK |
| Runtime | Node.js 20+ | LTS, broad compatibility |
| Build | tsup or esbuild | Fast bundling, single entry point |
| Dashboard | Express + vanilla HTML/JS | Minimal dependencies, polling-based |
| Testing | Vitest | Fast, TypeScript-native |
| Linting | ESLint + Prettier | Standard |
| Package Manager | npm (primary), pnpm/yarn compatible | Widest adoption |

### 2.3 Security Model

**Hard boundary**: The server can ONLY write files within `.brain-spec/` and `CLAUDE.md` at project root.

- No arbitrary access to project source code files
- No network calls beyond dashboard localhost (no telemetry, no external APIs)
- No shell command execution beyond git read-only queries
- Implementation logging accepts metadata (file paths, artifact descriptions) but does not read or modify actual source files
- Git integration is **read-only** (log, diff, rev-parse, branch — never commit, push, or modify)
- Destructive operations require explicit confirmation (e.g., `brain_spec_delete` requires re-typing the slug)

### 2.4 Directory Structure (Server Source)

```
brain-spec-mcp-server/
├── src/
│   ├── index.ts                    # Entry point, MCP server initialization
│   ├── server.ts                   # MCP server class, tool/resource/prompt registration
│   ├── types.ts                    # Shared TypeScript types/interfaces
│   │
│   ├── modules/
│   │   ├── spec-workflow/
│   │   │   ├── spec-manager.ts     # Spec CRUD operations
│   │   │   ├── interview-engine.ts # Interview-first spec generation
│   │   │   ├── task-manager.ts     # Task tracking and progress
│   │   │   ├── steering-manager.ts # Steering document management
│   │   │   └── types.ts
│   │   │
│   │   ├── config-engine/
│   │   │   ├── claude-md.ts        # CLAUDE.md template generation
│   │   │   ├── skills.ts           # Skill definition management
│   │   │   ├── agents.ts           # Subagent configuration
│   │   │   ├── hooks.ts            # Hook automation setup
│   │   │   ├── rules.ts            # Rules enforcement
│   │   │   └── types.ts
│   │   │
│   │   ├── learning/
│   │   │   ├── pattern-extractor.ts # Extract patterns from completed work
│   │   │   ├── analytics.ts         # Project metrics and analytics
│   │   │   ├── context-manager.ts   # Context window management
│   │   │   └── types.ts
│   │   │
│   │   └── dashboard/
│   │       ├── server.ts            # Express dashboard server
│   │       ├── api.ts               # Polling API endpoints
│   │       └── static/              # HTML/CSS/JS dashboard UI
│   │
│   ├── resources/
│   │   └── spec-resources.ts        # MCP resource definitions
│   │
│   ├── prompts/
│   │   └── spec-prompts.ts          # MCP prompt definitions
│   │
│   ├── templates/                   # Built-in templates shipped with server
│   │   ├── claude-md/
│   │   │   ├── minimal.md
│   │   │   ├── standard.md
│   │   │   ├── react-typescript.md
│   │   │   ├── python-fastapi.md
│   │   │   ├── python-django.md
│   │   │   ├── node-express.md
│   │   │   ├── node-nestjs.md
│   │   │   ├── vue-typescript.md
│   │   │   ├── svelte-kit.md
│   │   │   ├── terraform-infra.md
│   │   │   ├── docker-k8s.md
│   │   │   └── monorepo.md
│   │   │
│   │   ├── agents/
│   │   │   ├── planner.md
│   │   │   ├── architect.md
│   │   │   ├── code-reviewer.md
│   │   │   ├── security-reviewer.md
│   │   │   ├── tdd-guide.md
│   │   │   ├── build-error-resolver.md
│   │   │   ├── doc-updater.md
│   │   │   └── refactor-cleaner.md
│   │   │
│   │   ├── skills/
│   │   │   ├── coding-standards.md
│   │   │   ├── backend-patterns.md
│   │   │   ├── frontend-patterns.md
│   │   │   ├── tdd-workflow.md
│   │   │   ├── security-review.md
│   │   │   ├── devops-patterns.md
│   │   │   └── api-design.md
│   │   │
│   │   ├── hooks/
│   │   │   ├── pre-commit-lint.json
│   │   │   ├── session-start.json
│   │   │   ├── session-end.json
│   │   │   ├── pre-compact.json
│   │   │   └── post-task-complete.json
│   │   │
│   │   ├── rules/
│   │   │   ├── security.md
│   │   │   ├── coding-style.md
│   │   │   ├── testing.md
│   │   │   ├── git-workflow.md
│   │   │   └── performance.md
│   │   │
│   │   ├── steering/                # Steering document templates
│   │   │   ├── product.md
│   │   │   ├── tech.md
│   │   │   └── structure.md
│   │   │
│   │   └── spec-patterns/           # Spec templates for common project types
│   │       ├── api-endpoint.md
│   │       ├── ui-component.md
│   │       ├── database-migration.md
│   │       ├── cli-tool.md
│   │       ├── mcp-server.md
│   │       └── library-module.md
│   │
│   └── utils/
│       ├── file-system.ts           # Safe file read/write utilities
│       ├── markdown.ts              # Markdown parsing and generation
│       ├── validation.ts            # Schema validation for configs
│       ├── id-generator.ts          # Deterministic ID generation
│       └── git.ts                   # Read-only git integration utilities
│
├── skills/                          # Bundled slash command skills (installable to ~/.claude/commands/)
│   ├── brain-interview.md
│   ├── brain-brainstorm.md
│   ├── brain-spec-create.md
│   ├── brain-spec-status.md
│   ├── brain-spec-review.md
│   ├── brain-implement.md
│   ├── brain-next-task.md
│   ├── brain-guide.md
│   └── brain-templates.md
│
├── tests/
│   ├── unit/
│   │   ├── spec-workflow.test.ts
│   │   ├── config-engine.test.ts
│   │   ├── learning.test.ts
│   │   ├── steering.test.ts
│   │   ├── git-utils.test.ts
│   │   ├── resources.test.ts
│   │   └── dashboard.test.ts
│   ├── integration/
│   │   ├── full-workflow.test.ts
│   │   ├── interview-flow.test.ts
│   │   └── git-integration.test.ts
│   └── e2e/
│       └── mcp-protocol.test.ts     # Full MCP client → server round trips
│
├── docs/
│   ├── GETTING-STARTED.md
│   ├── TOOLS-REFERENCE.md
│   ├── TEMPLATES.md
│   ├── CONFIGURATION.md
│   ├── ARCHITECTURE.md
│   └── CONTRIBUTING.md
│
├── scripts/
│   └── install-skills.sh            # Copy bundled skills to ~/.claude/commands/
│
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .eslintrc.js
├── .prettierrc
├── LICENSE
├── README.md
└── CHANGELOG.md
```

### 2.5 Project Directory Structure (User's Project)

When Brain Spec is initialized in a user's project, it creates:

```
user-project/
├── .brain-spec/                     # All Brain Spec state lives here
│   ├── config.json                  # Server configuration overrides
│   │
│   ├── specs/                       # Spec files
│   │   ├── {spec-slug}.md           # The spec document itself
│   │   └── {spec-slug}.meta.json    # Spec metadata (status, created, updated, interview state)
│   │
│   ├── tasks/                       # Task tracking
│   │   └── {spec-slug}/
│   │       ├── tasks.json           # Task list with status and progress
│   │       └── logs/
│   │           └── {task-id}.log.md # Implementation log per task (with artifact detail)
│   │
│   ├── steering/                    # Project-level guidance documents
│   │   ├── product.md              # Vision, audience, core features, success metrics
│   │   ├── tech.md                 # Architecture, stack, constraints, performance
│   │   └── structure.md            # Directory org, naming, module boundaries
│   │
│   ├── agents/                      # Custom agent definitions (overrides built-in)
│   │   └── *.md
│   │
│   ├── skills/                      # Custom skill definitions
│   │   └── *.md
│   │
│   ├── hooks/                       # Hook configurations
│   │   └── hooks.json
│   │
│   ├── rules/                       # Custom rules
│   │   └── *.md
│   │
│   ├── patterns/                    # Learned patterns extracted from completed work
│   │   └── *.md
│   │
│   ├── archive/                     # Completed/deprecated specs
│   │   └── {spec-slug}/
│   │       ├── {spec-slug}.md
│   │       ├── {spec-slug}.meta.json
│   │       ├── tasks.json
│   │       ├── logs/
│   │       └── archive-metadata.json
│   │
│   └── analytics/                   # Analytics snapshots
│       └── *.json
│
├── CLAUDE.md                        # Generated/managed by Brain Spec
└── ... (rest of user's project)
```

All paths are configurable via `.brain-spec/config.json`:

```json
{
  "version": "1.0.0",
  "paths": {
    "specs": ".brain-spec/specs",
    "tasks": ".brain-spec/tasks",
    "steering": ".brain-spec/steering",
    "agents": ".brain-spec/agents",
    "skills": ".brain-spec/skills",
    "hooks": ".brain-spec/hooks",
    "rules": ".brain-spec/rules",
    "patterns": ".brain-spec/patterns",
    "archive": ".brain-spec/archive",
    "analytics": ".brain-spec/analytics",
    "claudeMd": "CLAUDE.md"
  },
  "dashboard": {
    "enabled": true,
    "port": 5100,
    "pollIntervalMs": 3000
  },
  "git": {
    "enabled": true,
    "autoEnrichLogs": true
  },
  "defaults": {
    "specTemplate": "standard",
    "claudeMdTemplate": "minimal",
    "maxTasksPerSpec": 20,
    "autoLogImplementations": true,
    "staleThresholdDays": 7
  }
}
```

---

## 3. MCP Tool Surface Area

### 3.1 Tool Inventory (28 Tools)

Tools are grouped by module. Each tool is exposed as a named MCP tool with typed input/output schemas.

#### Spec Workflow Module (9 tools)

| # | Tool Name | Description | Key Inputs |
|---|---|---|---|
| 1 | `brain_init` | Initialize Brain Spec in a project directory. Creates `.brain-spec/` structure and optionally generates CLAUDE.md. | `projectPath`, `template?`, `stack?` |
| 2 | `brain_spec_create` | Create a new spec. Can be blank, from a template, from a spec pattern, or trigger interview mode. | `name`, `description?`, `mode: "blank" \| "template" \| "pattern" \| "interview"`, `pattern?` |
| 3 | `brain_spec_interview` | Continue an interview session to build/refine a spec. The engine tracks interview state and returns the next question. | `specSlug`, `answer?`, `action: "start" \| "answer" \| "finish"` |
| 4 | `brain_spec_get` | Read a spec by slug. Returns the full markdown content + metadata. | `specSlug` |
| 5 | `brain_spec_list` | List all specs with optional status filter. Returns slugs, names, statuses, task progress summaries. | `status?: "draft" \| "active" \| "completed" \| "archived"` |
| 6 | `brain_spec_update` | Update a spec's content or metadata. | `specSlug`, `content?`, `status?`, `metadata?` |
| 7 | `brain_spec_delete` | Delete a spec and its associated tasks/logs. Requires confirmation slug. | `specSlug`, `confirmSlug` |
| 8 | `brain_spec_archive` | Move a completed/deprecated spec to the archive with metadata. | `specSlug`, `reason: "completed" \| "deprecated" \| "superseded"`, `supersededBy?`, `summary?` |
| 9 | `brain_steering_manage` | Create, update, or retrieve steering documents (product, tech, structure). | `action: "get" \| "set" \| "list"`, `docType?: "product" \| "tech" \| "structure"`, `content?` |

#### Task Management Module (5 tools)

| # | Tool Name | Description | Key Inputs |
|---|---|---|---|
| 10 | `brain_task_create` | Add a task to a spec. Tasks have IDs like `1.1`, `1.2`, etc. Supports Pimzino-style metadata. | `specSlug`, `title`, `description?`, `parentTaskId?`, `acceptanceCriteria?[]`, `requirements?[]`, `leverage?`, `files?[]`, `prompt?` |
| 11 | `brain_task_update` | Update task status, progress percentage, or notes. | `specSlug`, `taskId`, `status?`, `progress?`, `notes?` |
| 12 | `brain_task_list` | List tasks for a spec with filtering. Returns progress bars, statuses, and summaries. | `specSlug`, `status?`, `includeSubtasks?` |
| 13 | `brain_task_log` | Append an implementation log entry for a task. Captures detailed artifacts and auto-enriches with git data. | `specSlug`, `taskId`, `summary`, `filesChanged?[]`, `filesCreated?[]`, `linesAdded?`, `linesRemoved?`, `artifacts?`, `notes?` |
| 14 | `brain_progress` | Get aggregated progress across one or all specs. Returns completion percentages, task counts by status, velocity metrics. | `specSlug?` (omit for all specs) |

#### Config Engine Module (6 tools)

| # | Tool Name | Description | Key Inputs |
|---|---|---|---|
| 15 | `brain_claude_md_generate` | Generate a CLAUDE.md file from a template. Auto-detects stack if not specified. | `template`, `stack?`, `overrides?{}`, `outputPath?` |
| 16 | `brain_claude_md_update` | Update specific sections of an existing CLAUDE.md without overwriting the whole file. | `section`, `content`, `mode: "replace" \| "append" \| "prepend"` |
| 17 | `brain_agents_manage` | List, load, or configure agent definitions. Can load built-in agents or register custom ones. | `action: "list" \| "get" \| "add" \| "remove"`, `agentName?`, `definition?` |
| 18 | `brain_skills_manage` | List, load, or configure skill definitions. Skills are markdown files defining domain knowledge. | `action: "list" \| "get" \| "add" \| "remove"`, `skillName?`, `definition?` |
| 19 | `brain_hooks_manage` | Configure hook automations (pre-commit, session lifecycle, post-task, etc.). | `action: "list" \| "get" \| "set" \| "remove"`, `hookType?`, `config?` |
| 20 | `brain_rules_manage` | Configure rules enforcement. Rules are always-active guidelines loaded into context. | `action: "list" \| "get" \| "add" \| "remove"`, `ruleName?`, `definition?` |

#### Learning & Analytics Module (4 tools)

| # | Tool Name | Description | Key Inputs |
|---|---|---|---|
| 21 | `brain_patterns_extract` | Analyze completed specs/tasks and extract reusable patterns. Saves to `.brain-spec/patterns/`. | `specSlug?`, `scope: "spec" \| "project"` |
| 22 | `brain_patterns_list` | List extracted patterns with relevance tags. | `tag?` |
| 23 | `brain_analytics` | Get project-level analytics: specs completed, avg task velocity, common patterns, tool usage. | `timeRange?: "week" \| "month" \| "all"` |
| 24 | `brain_context_check` | Utility to estimate current context usage and suggest when to split work or start a fresh session. | `currentTaskDescription?` |

#### Query & Search Module (4 tools)

| # | Tool Name | Description | Key Inputs |
|---|---|---|---|
| 25 | `brain_log_query` | Search past implementation logs across specs by keyword, artifact type, date range. | `specSlug?`, `keyword?`, `artifactType?: "endpoints" \| "functions" \| "classes" \| "components"`, `dateFrom?`, `dateTo?` |
| 26 | `brain_spec_analytics` | Generate text-based analytics: total specs, completion %, tasks by status, stalled specs, artifact counts. | `includeArchived?` |
| 27 | `brain_steering_context` | Retrieve all steering documents as combined context for spec creation. | `docTypes?: ("product" \| "tech" \| "structure")[]` |
| 28 | `brain_template_list` | List all available templates (CLAUDE.md, spec patterns, steering, agents, skills, hooks, rules). | `category?: "claude-md" \| "spec-patterns" \| "steering" \| "agents" \| "skills" \| "hooks" \| "rules"` |

### 3.2 Tool Design Rules

1. **All tools are prefixed with `brain_`** — avoids collision with other MCP servers.
2. **Every tool returns structured JSON** with a consistent envelope: `{ success: boolean, data?: any, error?: string }`.
3. **Destructive operations require confirmation** — `brain_spec_delete` requires re-typing the slug. No silent deletions.
4. **Tools that create files return the file path** in the response so the client can display or navigate to it.
5. **Long-running operations return immediately** with a status, not block. The dashboard polls for updates.
6. **Git enrichment is automatic** — `brain_task_log` auto-populates commit SHA, branch, and timestamp from HEAD when git is available.

---

## 4. MCP Resources

Read-only data endpoints for context loading. Resources enable Claude to load spec context without invoking tools, which is useful for pre-populating context at session start.

| Resource URI | Description |
|---|---|
| `brain-spec://specs` | List of all specs with name, status, and task progress |
| `brain-spec://spec/{slug}` | Full spec content + metadata for a specific spec |
| `brain-spec://spec/{slug}/tasks` | Task list with status for a specific spec |
| `brain-spec://steering` | All steering documents combined |
| `brain-spec://steering/{type}` | Individual steering document (product, tech, structure) |
| `brain-spec://config` | Current configuration state |
| `brain-spec://analytics` | Cross-spec analytics summary |
| `brain-spec://patterns` | All extracted patterns |
| `brain-spec://agents` | Available agent definitions |

---

## 5. MCP Prompts

Registered prompt templates that Claude can invoke directly.

### spec-workflow-guide

Explains the full Brain Spec workflow — interview-first approach, steering docs, spec creation, task management, and implementation logging.

**Arguments:** None

### create-spec-prompt

Guided spec creation prompt that instructs Claude to gather requirements through questions, then compile into a structured spec.

**Arguments:**
- `name` (required): Spec name
- `description` (optional): Brief description
- `pattern` (optional): Spec pattern template to use (api-endpoint, ui-component, etc.)

### implement-task-prompt

Implementation prompt for a specific task. Loads the task's prompt field along with relevant context from the spec and steering documents.

**Arguments:**
- `specSlug` (required): Spec slug
- `taskId` (required): Task ID

---

## 6. Interview Engine (Detailed Design)

The interview engine is the highest-leverage feature. It's what differentiates this from a basic spec CRUD tool.

### 6.1 Interview Flow

```
User: "Create a spec for user authentication"
       │
       ▼
brain_spec_create(name: "user-auth", mode: "interview")
       │
       ▼ Returns: { specSlug: "user-auth", interviewStarted: true }
       │
       ▼
brain_spec_interview(specSlug: "user-auth", action: "start")
       │
       ▼ Returns first question from interview engine
       │
       ▼ (Claude asks user the question)
       │
       ▼ User answers
       │
       ▼
brain_spec_interview(specSlug: "user-auth", action: "answer", answer: "...")
       │
       ▼ Returns next question (engine adapts based on answers)
       │
       ▼ ... repeat until coverage is sufficient ...
       │
       ▼
brain_spec_interview(specSlug: "user-auth", action: "finish")
       │
       ▼ Returns: compiled spec markdown, saved to .brain-spec/specs/user-auth.md
```

### 6.2 Interview Question Categories

The engine covers these categories, adapting question order based on project type:

1. **Functional Requirements** — What does this feature/system do? User flows, inputs/outputs, business rules.
2. **Technical Constraints** — Language, framework, existing codebase patterns, dependencies, version requirements.
3. **Data Model** — What entities exist? Relationships? Storage mechanism? Schema evolution?
4. **Edge Cases & Error Handling** — What happens when things fail? Rate limits? Validation? Timeouts?
5. **Security Considerations** — Auth/authz, input sanitization, secrets management, OWASP concerns.
6. **Testing Strategy** — What needs to be tested? Unit vs integration vs e2e? Coverage targets?
7. **Non-Functional Requirements** — Performance targets, scalability expectations, accessibility, i18n.
8. **Implementation Approach** — Suggested task breakdown, dependency ordering, estimated complexity.

### 6.3 Interview State Persistence

Interview state is persisted in the spec's meta.json so interviews can be resumed across sessions:

```json
{
  "specSlug": "user-auth",
  "status": "interviewing",
  "interview": {
    "currentCategory": "technical-constraints",
    "questionsAsked": 6,
    "answers": [
      { "category": "functional", "question": "...", "answer": "..." }
    ],
    "coverageMap": {
      "functional": 0.8,
      "technical": 0.4,
      "data-model": 0.0,
      "edge-cases": 0.0,
      "security": 0.0,
      "testing": 0.0,
      "nonfunctional": 0.0,
      "implementation": 0.0
    }
  },
  "createdAt": "2026-02-05T...",
  "updatedAt": "2026-02-05T..."
}
```

### 6.4 Spec Output Format

After an interview is finished, the engine compiles answers into a structured spec:

```markdown
# Spec: User Authentication

## Overview
[Compiled from interview answers — project description and purpose]

## Functional Requirements
- [Bullet points derived from functional answers]

## Technical Constraints
- Language: TypeScript
- Framework: Express.js
- [etc.]

## Data Model
[Entity descriptions, relationships]

## Edge Cases & Error Handling
[Derived from edge case discussion]

## Security Considerations
[Derived from security discussion]

## Testing Strategy
[Derived from testing discussion]

## Non-Functional Requirements
[Performance, scalability, etc.]

## Implementation Checklist
- [ ] Task 1.1: [Auto-generated from implementation discussion]
- [ ] Task 1.2: ...
- [ ] Task 1.3: ...

## Acceptance Criteria
- [ ] [Derived from functional + edge case answers]
```

### 6.5 Steering Document Integration

When steering documents exist, the interview engine:

1. Reads `tech.md` to pre-populate technical constraints (avoids re-asking about stack)
2. Reads `product.md` to align feature scope with product vision
3. Reads `structure.md` to suggest file paths consistent with project organization
4. References relevant steering context in the compiled spec output

---

## 7. Steering Documents

Steering documents provide **project-level guidance** that informs all specs. They live in `.brain-spec/steering/` and are managed via the `brain_steering_manage` tool.

### 7.1 Three Document Types

#### product.md — Product Steering

```markdown
# Product Steering

## Vision
One-paragraph vision statement.

## Target Audience
- Persona 1: description
- Persona 2: description

## Core Features
1. Feature: description and value proposition
2. ...

## Success Metrics
- Metric: target value
- ...

## Out of Scope
- Items explicitly excluded from the product vision
```

#### tech.md — Technical Steering

```markdown
# Technical Steering

## Architecture Pattern
Description of chosen architecture (monolith, microservices, etc.)

## Technology Stack
- Language: X (version)
- Framework: Y
- Database: Z
- ...

## Performance Requirements
- Response time: Xms
- Throughput: Y req/s
- ...

## Security Architecture
- Authentication: approach
- Authorization: approach
- Data protection: approach

## Scalability Considerations
- Horizontal scaling strategy
- Caching strategy
- ...

## Constraints
- Must run on X
- Cannot use Y
- ...
```

#### structure.md — Structure Steering

```markdown
# Structure Steering

## Directory Organization
project/
├── src/
│   ├── module_a/
│   └── module_b/
├── tests/
└── docs/

## Naming Conventions
- Files: snake_case
- Classes: PascalCase
- Functions: snake_case
- Constants: UPPER_CASE

## Module Boundaries
- Module A: responsibility
- Module B: responsibility

## Development Guidelines
- Pattern X for Y situations
- ...
```

### 7.2 Characteristics

- Created via `brain_steering_manage` tool or during `brain_init`
- No approval workflow — steering docs are living guidance, updated as the project evolves
- Automatically referenced by the interview engine during spec creation
- Available as MCP resources for context loading

---

## 8. Implementation Logging (Detailed Design)

Implementation logs capture what was built for each completed task, enabling future agents to discover existing implementations and avoid code duplication.

### 8.1 Log File Format

Each completed task gets a log file in `.brain-spec/tasks/{spec-slug}/logs/{task-id}.log.md`:

```markdown
# Implementation Log — Task {id}: {description}

## Summary
Brief description of what was implemented.

## Git Reference
- **Commit**: {SHA} (auto-populated when git.autoEnrichLogs is true)
- **Branch**: {branch-name}
- **Date**: {timestamp}

## Files Changed
### Modified
- `src/module/existing.ts` — Updated to support X

### Created
- `src/module/new-file.ts` — Implements Y
- `tests/new-file.test.ts` — Tests for Y

## Code Statistics
- Lines Added: X
- Lines Removed: Y
- Files Changed: Z

## Artifacts
### API Endpoints
- **POST** `/api/v1/resource` — Creates a new resource
  - Request: `{ "name": "string", "value": "number" }`
  - Response: `{ "id": "string", "created_at": "datetime" }`

### Functions
- `processInput(data: InputModel): OutputModel` — Transforms raw input
  - Exported: yes
  - Module: `src/module/processor.ts`

### Classes
- `ResourceManager` — Manages resource lifecycle
  - Methods: create(), update(), delete(), list()
  - Module: `src/module/manager.ts`

### UI Components
- `ResourceCard` — Displays resource summary
  - Props: resource: Resource, onDelete: callback
  - Module: `src/components/ResourceCard.tsx`

### Integrations
- Frontend `ResourceList` → Backend `GET /api/v1/resources`

## Notes
- Any gotchas, decisions made during implementation, or follow-up items
```

### 8.2 Artifact Types

The `artifacts` parameter in `brain_task_log` accepts structured artifact metadata:

```typescript
interface Artifacts {
  endpoints?: Array<{
    method: string;       // GET, POST, PUT, DELETE, etc.
    path: string;         // /api/v1/resource
    purpose: string;      // Creates a new resource
    request?: string;     // Request schema description
    response?: string;    // Response schema description
  }>;
  functions?: Array<{
    name: string;
    purpose: string;
    signature?: string;   // Full type signature
    exported: boolean;
    module: string;       // File path
  }>;
  classes?: Array<{
    name: string;
    purpose: string;
    methods?: string[];
    module: string;
  }>;
  components?: Array<{
    name: string;
    purpose: string;
    props?: string;
    module: string;
  }>;
  integrations?: Array<{
    from: string;         // Frontend component or module
    to: string;           // Backend endpoint or service
  }>;
}
```

### 8.3 Git Auto-Enrichment

When `git.autoEnrichLogs` is enabled (default: true) and the project is a git repo:

| Operation | Git Command | Purpose |
|---|---|---|
| HEAD commit | `git rev-parse HEAD` | Commit SHA for the log |
| Current branch | `git branch --show-current` | Branch name |
| Commit timestamp | `git log -1 --format=%cI` | ISO timestamp |
| Diff stats | `git diff --stat HEAD~1` | Lines added/removed |

All git operations are **read-only** — the server never commits, pushes, or modifies the repository.

---

## 9. Config Engine (Detailed Design)

### 9.1 CLAUDE.md Generation

Templates are markdown files with variable interpolation. The generator:

1. Detects the project's tech stack by scanning for `package.json`, `requirements.txt`, `go.mod`, `Cargo.toml`, `Dockerfile`, `terraform/`, etc.
2. Selects the best matching template (or uses the one specified).
3. Interpolates project-specific values (project name, detected commands, test framework).
4. Writes to `CLAUDE.md` at the project root.

**Auto-detection rules:**

| File Found | Stack Detected |
|---|---|
| `package.json` + `next.config.*` | Next.js |
| `package.json` + `vite.config.*` | Vite (React/Vue/Svelte based on deps) |
| `package.json` + `tsconfig.json` | Node/TypeScript |
| `requirements.txt` or `pyproject.toml` | Python |
| `pyproject.toml` + `fastapi` in deps | FastAPI |
| `go.mod` | Go |
| `Cargo.toml` | Rust |
| `Dockerfile` or `docker-compose.yml` | Docker |
| `*.tf` files | Terraform |
| `Makefile` only | Generic |

### 9.2 Built-in Agent Definitions

Agents are specialized subagent prompts based on patterns from `everything-claude-code`. Each agent is a markdown file containing:

- **Role description** — what this agent specializes in
- **Trigger conditions** — when to delegate to this agent
- **Input requirements** — what context it needs
- **Output format** — what it produces
- **Quality criteria** — how to evaluate its output

**Shipping agents (v1):**

| Agent | Purpose | Based On |
|---|---|---|
| `planner` | Feature implementation planning, task breakdown | affaan-m/agents/planner.md |
| `architect` | System design decisions, architecture review | affaan-m/agents/architect.md |
| `code-reviewer` | Quality and security review of changes | affaan-m/agents/code-reviewer.md |
| `security-reviewer` | Vulnerability analysis, OWASP checks | affaan-m/agents/security-reviewer.md |
| `tdd-guide` | Test-driven development workflow | affaan-m/agents/tdd-guide.md |
| `build-error-resolver` | Diagnose and fix build failures | affaan-m/agents/build-error-resolver.md |
| `doc-updater` | Keep documentation in sync with code | affaan-m/agents/doc-updater.md |
| `refactor-cleaner` | Dead code cleanup, refactoring | affaan-m/agents/refactor-cleaner.md |

### 9.3 Hook System

Hooks are automation triggers that fire on specific events. Configuration stored in `.brain-spec/hooks/hooks.json`:

```json
{
  "hooks": [
    {
      "event": "PreToolUse",
      "matcher": "Write|Edit",
      "command": "node .brain-spec/hooks/pre-write-lint.js",
      "description": "Lint check before file writes"
    },
    {
      "event": "SessionStart",
      "command": "node .brain-spec/hooks/load-context.js",
      "description": "Load persistent context on session start"
    },
    {
      "event": "SessionEnd",
      "command": "node .brain-spec/hooks/save-state.js",
      "description": "Persist session state on exit"
    },
    {
      "event": "PostTaskComplete",
      "command": "node .brain-spec/hooks/post-task.js",
      "description": "Log task completion and update analytics"
    }
  ]
}
```

**Built-in hook types (v1):**

| Hook | Event | Purpose |
|---|---|---|
| `session-start` | SessionStart | Load context, restore memory from last session |
| `session-end` | SessionEnd | Save session state, extract patterns |
| `pre-commit-lint` | PreToolUse (Write) | Run linting before file writes |
| `post-task-complete` | Stop | Log implementation details when a task is marked done |
| `pre-compact` | Compact | Save critical context before context compaction |

### 9.4 Rules System

Rules are always-loaded guidelines that inform Claude's behavior. They're injected into context at session start. Each rule is a markdown file with a clear, enforceable directive.

**Shipping rules (v1):**

| Rule | Scope | Key Directives |
|---|---|---|
| `security` | All projects | Never commit secrets, sanitize inputs, use parameterized queries |
| `coding-style` | Configurable | Immutability preferences, file organization, naming conventions |
| `testing` | Configurable | TDD workflow, minimum coverage thresholds, test naming |
| `git-workflow` | All projects | Conventional commits, atomic commits, branch naming |
| `performance` | Configurable | Context window management, model selection hints |

---

## 10. Bundled Skills (Slash Commands)

Skills ship as `.md` files in the `skills/` directory and can be installed to `~/.claude/commands/` via `scripts/install-skills.sh`.

### 10.1 Interview & Brainstorm

#### /brain-interview
Iterative interview to refine a spec. Wraps the `brain_spec_interview` tool with a conversational UX — Claude asks questions using AskUserQuestion, building requirements progressively.

#### /brain-brainstorm
Open-ended ideation before formalizing into a spec. Asks one question at a time, exploring the problem space, existing solutions, feasibility, and scope before offering to formalize via `/brain-interview`.

### 10.2 Spec Lifecycle

#### /brain-spec-create
Guided spec creation. Checks for steering docs, asks for name/description, creates spec, guides through requirements, design, and task breakdown.

#### /brain-spec-status
Shows progress across all specs or drills into a specific one. Highlights stalled specs.

#### /brain-spec-review
Reviews a spec for completeness: user stories with acceptance criteria, architecture decisions, API contracts, testing strategy, reasonable task granularity (8-12 top-level typical), implementation prompts per task.

### 10.3 Task Execution

#### /brain-implement
Execute the next task from a spec using subagent delegation. Finds next pending task, shows details, delegates to subagent, logs implementation, marks complete, commits.

#### /brain-next-task
Shows the next unblocked task with full details (ID, description, requirements refs, files involved, implementation prompt). Asks if user wants to start.

### 10.4 Templates & Guide

#### /brain-guide
Explains the full Brain Spec workflow: steering docs → interview → spec → design → tasks → implement → log → archive. Lists available slash commands.

#### /brain-templates
Lists all available templates across categories (CLAUDE.md, spec patterns, steering, agents, skills, hooks, rules). Shows full content on request. Mentions user-override via `.brain-spec/` custom directories.

---

## 11. Spec Pattern Templates

Pre-built spec templates that fast-track common project types. Shipped in `src/templates/spec-patterns/`.

| Template | Description |
|---|---|
| `api-endpoint.md` | REST/GraphQL endpoint: routes, validation, auth, error codes, request/response schemas |
| `ui-component.md` | Frontend component: props, state, events, accessibility, responsive behavior |
| `database-migration.md` | Schema change: before/after models, migration steps, rollback plan, data preservation |
| `cli-tool.md` | Command-line tool: commands, flags, I/O, configuration, help text |
| `mcp-server.md` | MCP server: tools, resources, prompts, security model, distribution |
| `library-module.md` | Reusable library: public API surface, types, error handling, versioning |

Each pattern template pre-fills the spec with domain-specific sections, checklists, and acceptance criteria. Used via `brain_spec_create(mode: "pattern", pattern: "api-endpoint")`.

---

## 12. Archive System

When a spec is completed, deprecated, or superseded, it can be moved to the archive to keep the active workspace clean while preserving full history.

### 12.1 Archive Workflow

```
brain_spec_archive(specSlug: "user-auth", reason: "completed", summary: "...")
       │
       ▼
1. Copies spec .md and .meta.json to .brain-spec/archive/{slug}/
2. Copies tasks.json and logs/ to archive
3. Generates archive-metadata.json
4. Removes from active .brain-spec/specs/ and .brain-spec/tasks/
5. Returns confirmation with archive path
```

### 12.2 Archive Metadata

```json
{
  "specSlug": "user-auth",
  "archivedAt": "2026-02-05T...",
  "reason": "completed",
  "supersededBy": null,
  "summary": "Implemented JWT-based auth with refresh tokens, RBAC, and 2FA.",
  "finalStatus": {
    "totalTasks": 14,
    "completedTasks": 14,
    "specStatus": "completed"
  }
}
```

Archived specs appear in `brain_spec_list(status: "archived")` and in analytics when `includeArchived` is true.

---

## 13. Dashboard

### 13.1 Overview

The dashboard is a lightweight web UI served by an embedded Express server. It provides visual feedback on spec progress and project state. Started separately or as a flag on the main server.

**Start command:**

```bash
npx @brain-spec/mcp-server --dashboard
# or
npx @brain-spec/mcp-server --dashboard --port 5100
```

### 13.2 Dashboard Pages

| Page | Content |
|---|---|
| **Overview** | All specs listed with progress bars, task counts, steering doc status, overall project health |
| **Spec Detail** | Single spec view with full task list, status indicators, implementation logs |
| **Config Status** | Current CLAUDE.md template, active agents/skills/hooks/rules |
| **Analytics** | Charts for task velocity, completion rates, patterns extracted, artifact counts |

### 13.3 Polling API

The dashboard polls the server state via REST endpoints. No WebSocket complexity.

| Endpoint | Method | Returns |
|---|---|---|
| `/api/specs` | GET | All specs with summary metadata |
| `/api/specs/:slug` | GET | Full spec detail with tasks |
| `/api/specs/:slug/tasks` | GET | Task list for a spec |
| `/api/steering` | GET | Steering document status and content |
| `/api/progress` | GET | Aggregated progress data |
| `/api/config` | GET | Current config state |
| `/api/analytics` | GET | Analytics data |
| `/api/health` | GET | Server health check |

**Poll interval:** configurable, default 3 seconds. The dashboard UI auto-refreshes via `setInterval` + `fetch`.

### 13.4 Dashboard Tech

- **Server:** Express.js (already a dependency for the MCP server)
- **UI:** Vanilla HTML + CSS + JS. No React, no build step for the dashboard. Single `index.html` with inline or co-located CSS/JS.
- **Charts:** Chart.js loaded via CDN (for analytics page)
- **Styling:** Clean, minimal. Dark/light mode via `prefers-color-scheme`.

---

## 14. Learning & Analytics Module

### 14.1 Pattern Extraction

When a spec is completed, `brain_patterns_extract` analyzes the spec, tasks, and implementation logs to identify reusable patterns:

- **Architectural patterns** — recurring structural decisions (e.g., "always uses repository pattern for data access")
- **Error handling patterns** — common error handling approaches
- **Testing patterns** — test structure and assertion patterns
- **Process patterns** — workflow steps that consistently produce good results

Patterns are saved as markdown in `.brain-spec/patterns/` and can be referenced by future specs.

### 14.2 Analytics Tracking

Analytics are derived from file state — no telemetry, no external calls. All data stays local.

**Tracked metrics:**

- Specs created / completed / archived
- Average tasks per spec
- Task completion velocity (tasks per day/week)
- Average time from spec creation to completion
- Most commonly used agents/skills
- Implementation log statistics (lines added/removed over time)
- Artifact counts (total endpoints, functions, classes, components logged)
- Stalled specs (no activity in X days, configurable via `staleThresholdDays`)

### 14.3 Context Management

`brain_context_check` helps users manage the 200k token context window:

- Estimates current context consumption based on loaded files and conversation length
- Suggests when to start a fresh session
- Recommends which parts of a spec to focus on vs delegate to subagents
- Flags when context is approaching the 60% threshold (the recommended split point from community best practices)

---

## 15. Git Integration

### 15.1 Capabilities (All Read-Only)

| Operation | Git Command | Purpose |
|---|---|---|
| Project root detection | `git rev-parse --show-toplevel` | Find .git to locate project root |
| Current branch | `git branch --show-current` | Branch name for logs and validation |
| HEAD commit | `git rev-parse HEAD` | Commit SHA for implementation logs |
| Commit timestamp | `git log -1 --format=%cI` | ISO timestamp for logs |
| Diff stats | `git diff --stat HEAD~1` | Lines added/removed for logs |
| Is git repo? | `git rev-parse --is-inside-work-tree` | Feature detection |

### 15.2 Usage

- **brain_init**: Auto-detects project root via `.git`
- **brain_task_log**: Auto-populates git reference (commit SHA, branch, timestamp) when `git.autoEnrichLogs` is true
- **brain_spec_analytics**: Can report git-correlated activity (commits per spec)
- **Steering docs**: No git involvement — they're living documents, not approval-gated

Git is entirely optional. If the project is not a git repo, all git features gracefully degrade (fields left blank, no errors).

---

## 16. Installation & Usage

### 16.1 Installation

**For Claude Code CLI:**

```bash
claude mcp add brain-spec npx @brain-spec/mcp-server -- /path/to/project
```

**For Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "brain-spec": {
      "command": "npx",
      "args": ["-y", "@brain-spec/mcp-server@latest", "/path/to/project"]
    }
  }
}
```

**Install bundled skills (optional):**

```bash
npx @brain-spec/mcp-server --install-skills
# or
./scripts/install-skills.sh
```

**Dashboard (separate process):**

```bash
npx @brain-spec/mcp-server --dashboard
```

### 16.2 First Run

```
User: "Initialize brain spec for this project"

→ brain_init detects stack, creates .brain-spec/, generates CLAUDE.md
→ Prompts to create steering docs (product, tech, structure)

User: "Create a spec for user authentication"

→ brain_spec_create triggers interview mode
→ Claude asks 8-12 targeted questions (informed by steering docs)
→ Spec is compiled and saved

User: "Show my tasks"

→ brain_task_list returns auto-generated task breakdown

User: "Mark task 1.1 as in progress"

→ brain_task_update updates status

User: "Log implementation for task 1.1"

→ brain_task_log records files, artifacts, auto-enriches with git data

User: "Start the dashboard"

→ brain_dashboard opens on localhost:5100
```

---

## 17. Implementation Checklist

### Phase 1: Foundation (MVP)

- [ ] 1.1 — Project scaffolding (TypeScript, tsup, vitest, eslint, prettier)
- [ ] 1.2 — MCP server skeleton with tool/resource/prompt registration framework
- [ ] 1.3 — File system layer (safe read/write, directory management, `.brain-spec/` initialization)
- [ ] 1.4 — Git integration utilities (read-only: rev-parse, branch, log, diff)
- [ ] 1.5 — `brain_init` tool (project detection, config creation, directory scaffolding)
- [ ] 1.6 — Spec CRUD tools (`brain_spec_create`, `get`, `list`, `update`, `delete`)
- [ ] 1.7 — Task management tools (`brain_task_create`, `update`, `list`, `log`)
- [ ] 1.8 — `brain_progress` aggregation tool
- [ ] 1.9 — Unit tests for all Phase 1 tools
- [ ] 1.10 — npm package configuration and first publish

### Phase 2: Interview Engine + Steering + Config

- [ ] 2.1 — Interview engine core (question bank, category tracking, coverage scoring)
- [ ] 2.2 — Interview state persistence and resume
- [ ] 2.3 — Spec compilation from interview answers
- [ ] 2.4 — Steering document management (`brain_steering_manage`)
- [ ] 2.5 — Steering integration into interview engine
- [ ] 2.6 — CLAUDE.md template system with stack auto-detection
- [ ] 2.7 — `brain_claude_md_generate` and `brain_claude_md_update` tools
- [ ] 2.8 — Agent management tool (`brain_agents_manage`) + 8 built-in agents
- [ ] 2.9 — Skill management tool (`brain_skills_manage`) + 7 built-in skills
- [ ] 2.10 — Integration tests for interview → spec → task flow

### Phase 3: Hooks, Rules, Archive, Dashboard

- [ ] 3.1 — Hook system framework (event registration, execution)
- [ ] 3.2 — `brain_hooks_manage` tool + 5 built-in hooks
- [ ] 3.3 — Rules system (`brain_rules_manage`) + 5 built-in rules
- [ ] 3.4 — Archive system (`brain_spec_archive`) with metadata
- [ ] 3.5 — Dashboard Express server with polling API
- [ ] 3.6 — Dashboard UI (overview, spec detail, config status pages)
- [ ] 3.7 — Dashboard analytics page with Chart.js

### Phase 4: Learning, Search, Resources, Skills & Polish

- [ ] 4.1 — MCP resources (all 9 resource URIs)
- [ ] 4.2 — MCP prompts (3 registered prompt templates)
- [ ] 4.3 — Pattern extraction engine (`brain_patterns_extract`, `brain_patterns_list`)
- [ ] 4.4 — Analytics aggregation (`brain_analytics`, `brain_spec_analytics`)
- [ ] 4.5 — Log query tool (`brain_log_query`)
- [ ] 4.6 — Template listing tool (`brain_template_list`)
- [ ] 4.7 — Context management utility (`brain_context_check`)
- [ ] 4.8 — Spec pattern templates (6 templates: api-endpoint, ui-component, etc.)
- [ ] 4.9 — Bundled slash command skills (9 .md files)
- [ ] 4.10 — install-skills.sh script
- [ ] 4.11 — End-to-end MCP protocol tests
- [ ] 4.12 — Documentation (getting started, tools reference, templates, contributing, architecture)
- [ ] 4.13 — README, CHANGELOG, LICENSE
- [ ] 4.14 — CI/CD pipeline (GitHub Actions: lint, test, publish)
- [ ] 4.15 — v1.0.0 release

---

## 18. Acceptance Criteria

### Functional

- [ ] All 28 MCP tools are registered and callable from Claude Code CLI and Claude Desktop
- [ ] All 9 MCP resources return expected content
- [ ] All 3 MCP prompts generate correct templates
- [ ] `brain_init` correctly detects at least 10 tech stacks and generates appropriate CLAUDE.md
- [ ] Interview engine asks contextually relevant questions and compiles coherent specs
- [ ] Interview engine reads steering docs to avoid redundant questions
- [ ] Interrupted interviews can be resumed in a new session
- [ ] Task progress is accurately tracked and aggregated across specs
- [ ] Implementation logs include detailed artifacts and auto-enriched git data
- [ ] Archive system preserves full spec history with metadata
- [ ] Dashboard displays real-time (3s poll) spec/task/steering status
- [ ] All built-in templates, agents, skills, hooks, and rules are loadable
- [ ] Custom agents/skills/hooks/rules can override or extend built-ins
- [ ] Steering documents are accessible as MCP resources
- [ ] File-based state is fully git-friendly (no binary files, no database locks)

### Non-Functional

- [ ] Server starts in under 2 seconds
- [ ] Tool response time under 500ms for all CRUD operations
- [ ] Dashboard loads in under 1 second
- [ ] Zero external network calls (all state is local, no telemetry)
- [ ] Works offline after initial `npx` install
- [ ] npm package size under 5MB
- [ ] Node.js 20+ compatibility
- [ ] Cross-platform: macOS, Linux, Windows
- [ ] Write access constrained to `.brain-spec/` and `CLAUDE.md` only
- [ ] Git operations are read-only (never modify repo state)
- [ ] All tools have progress indicators for operations that might cause wait

### Skills & Documentation

- [ ] All 9 bundled skills have correct frontmatter (name, description)
- [ ] Skills reference correct MCP tool names
- [ ] install-skills.sh correctly copies to ~/.claude/commands/
- [ ] README with installation for Claude Code CLI and Claude Desktop
- [ ] Tools reference with input/output schemas for all 28 tools
- [ ] Template catalog with descriptions
- [ ] Contributing guide with development setup
- [ ] Architecture doc explaining module boundaries

---

## 19. Open Questions & Future Considerations

These are intentionally deferred from v1:

1. **VSCode Extension** — Pimzino ships one. Worth considering for v1.1 if there's demand.
2. **Approval/Review Gates** — Deliberately excluded. Could be an opt-in plugin later.
3. **Multi-user collaboration** — File-based state doesn't handle concurrent writes well. Would need file locking or move to SQLite for teams.
4. **Continuous Learning v2** — Affaan's repo has "instinct-based learning with confidence scoring." More sophisticated than v1's pattern extraction but adds complexity.
5. **WebSocket upgrade for dashboard** — Polling works fine for single-user. If team dashboards become a thing, SSE or WebSocket would be more efficient.
6. **Plugin/Extension System** — Allow third-party tool modules to register with Brain Spec. Deferred until the core API is stable.
7. **Spec Diffing** — Show what changed between spec versions. Currently relies on git diff. Could add built-in visual diffing.
8. **Task Dependencies** — Explicit `blocks`/`blockedBy` relationships between tasks for wave-based parallel execution. Pimzino supports this; deferred for v1 simplicity.

---

## 20. Reconciliation Notes

This spec was produced by merging two source documents. The following decisions were made at reconciliation:

| Area | Decision | Source |
|---|---|---|
| Tech stack | TypeScript / Node.js / npm | Earlier spec (precedence) |
| Scope | Full pipeline (spec + config + learning + dashboard) | Earlier spec (precedence) |
| Config format | JSON | Earlier spec (precedence) |
| Spec storage | Single .md + .meta.json per spec | Earlier spec (precedence) |
| Task storage | tasks.json (structured) | Earlier spec (precedence) |
| Interview | MCP tool with persistent state | Earlier spec (precedence) |
| Dashboard | Express on port 5100 | Earlier spec (precedence) |
| Philosophy | Interview-first, no ceremony/gates | Earlier spec (precedence) |
| Tool naming | `brain_` prefix, underscores | Earlier spec (precedence) |
| Response envelope | `{ success, data, error }` | Earlier spec (precedence) |
| Steering documents | Added (product.md, tech.md, structure.md) | Interview spec (addition) |
| MCP Resources | Added (9 URIs) | Interview spec (addition) |
| MCP Prompts | Added (3 templates) | Interview spec (addition) |
| Archive system | Added with metadata | Interview spec (addition) |
| Detailed artifact logging | Enhanced implementation logs | Interview spec (addition) |
| Git integration | Added (read-only enrichment) | Interview spec (addition) |
| Bundled slash commands | Added (9 skills as .md files) | Interview spec (addition) |
| Security model | Made explicit (write boundary) | Interview spec (addition) |
| Spec pattern templates | Added (6 patterns) | Interview spec (addition) |
| Steering in interview | Engine reads steering docs pre-interview | Interview spec (addition) |

---

## 21. References

| Source | What Was Used |
|---|---|
| [Pimzino/spec-workflow-mcp](https://github.com/Pimzino/spec-workflow-mcp) (3.2k stars) | Spec workflow architecture, tool naming patterns, dashboard concept, steering documents, task hierarchy format |
| [affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code) (35.6k stars) | Agent definitions, skill structure, hook system, rules, continuous learning, directory conventions |
| [peopleforrester/claude-dotfiles](https://github.com/peopleforrester/claude-dotfiles) | CLAUDE.md templates, permission profiles, stack-specific configs, installation patterns, skill .md format |
| Anthropic official best practices | Interview-first workflow, Plan Mode, Opus/Sonnet model routing, subagent delegation |
| alexop.dev (Feb 2026) | Spec structure example (SQLite-to-IndexedDB migration), two-pass refinement pattern |
| Zhu Liang task file format | Task file structure (progress summary, current/target state, implementation steps, acceptance criteria) |
| Dzianis Karviha (350k+ LOC workflow) | Context management at scale, 60% context threshold, disciplined plan-then-execute |
| Boris Cherny (Claude Code creator) | Plan Mode → spec → fresh session → auto-accept pattern |
