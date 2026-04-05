# Architecture

How Brain Spec Skills work, the data model, and design decisions.

## What Are Claude Code Skills?

Claude Code skills are markdown files that define slash commands. When you type `/brain-init` in Claude Code, it finds `.claude/skills/brain-init/SKILL.md` and follows the instructions in that file.

Skills are not code -- they are structured prompts. Claude reads the SKILL.md, understands the instructions, and uses its built-in tools (file I/O, bash, glob, grep) to carry out the task.

This means:
- **No runtime**: Nothing to install, build, or run
- **No dependencies**: Just markdown files
- **Zero startup cost**: Skills are loaded only when invoked
- **Portable**: Copy the files and they work anywhere Claude Code runs

## Directory Structure

Brain Spec stores all data in `.brain-spec/` within your project:

```
.brain-spec/
  config.json                       # Workspace configuration
  steering/                         # Project-level guidance
    product.md                      #   Vision, audience, features, metrics
    tech.md                         #   Architecture, stack, constraints
    structure.md                    #   Directory layout, conventions
  specs/                            # Feature specifications
    {slug}.md                       #   Compiled spec content
    {slug}.meta.json                #   Metadata + interview state
  tasks/                            # Implementation tracking
    {slug}/                         #   One directory per spec
      tasks.json                    #   Task list
      logs/                         #   Implementation logs
        {id}.log.md                 #   Log per completed task
  archive/                          # Archived specs
    {slug}/                         #   Archived spec bundle
      {slug}.md                     #   Spec content (preserved)
      {slug}.meta.json              #   Metadata (preserved)
      archive-metadata.json         #   Archive reason, summary, stats
      tasks/                        #   Task history (if any)
```

## Data Schemas

### config.json

Created by `/brain-init`. Stores workspace paths and defaults.

```json
{
  "version": "1.0.0",
  "paths": {
    "specs": ".brain-spec/specs",
    "tasks": ".brain-spec/tasks",
    "steering": ".brain-spec/steering",
    "archive": ".brain-spec/archive"
  }
}
```

### Spec Metadata ({slug}.meta.json)

Tracks spec status and interview state.

```json
{
  "specSlug": "user-auth",
  "name": "User Authentication",
  "description": "Login and session management",
  "status": "draft | active | completed | archived",
  "interview": {
    "currentCategory": "functional",
    "questionsAsked": 5,
    "answers": [
      {
        "category": "functional",
        "question": "What is the primary purpose?",
        "answer": "User's response here."
      }
    ],
    "coverageMap": {
      "functional": 0.6,
      "technical": 0.2,
      "data-model": 0.0,
      "edge-cases": 0.0,
      "security": 0.0,
      "testing": 0.0,
      "nonfunctional": 0.0,
      "implementation": 0.0
    }
  },
  "createdAt": "2026-02-05T10:00:00.000Z",
  "updatedAt": "2026-02-05T10:30:00.000Z"
}
```

**Status lifecycle:** draft -> active -> completed -> archived

**Interview state** is persisted across sessions. The `coverageMap` tracks how many questions in each category have been answered (0.0 to 1.0).

### Task List (tasks.json)

Stores all tasks for a spec.

```json
{
  "specSlug": "user-auth",
  "tasks": [
    {
      "id": "1",
      "title": "Implement login endpoint",
      "description": "REST endpoint for email/password login",
      "status": "in-progress",
      "parentTaskId": null,
      "acceptanceCriteria": ["Returns JWT on success", "Returns 401 on failure"],
      "requirements": [],
      "leverage": "",
      "files": ["src/auth/login.ts"],
      "prompt": "",
      "progress": 50,
      "notes": "",
      "createdAt": "2026-02-05T11:00:00.000Z",
      "updatedAt": "2026-02-05T12:00:00.000Z"
    }
  ]
}
```

**Hierarchical IDs:** Top-level tasks are "1", "2", "3". Subtasks are "1.1", "1.2", "2.1". The ID generation algorithm finds the highest sibling ID and increments.

**Task status:** pending -> in-progress -> completed

### Archive Metadata

Created when a spec is archived.

```json
{
  "specSlug": "old-feature",
  "archivedAt": "2026-02-05T15:00:00.000Z",
  "reason": "completed",
  "supersededBy": null,
  "summary": "Feature fully implemented and deployed",
  "finalStatus": {
    "totalTasks": 5,
    "completedTasks": 5,
    "specStatus": "completed"
  }
}
```

**Archive reasons:** completed, deprecated, superseded

## Interview Engine

The interview is the core differentiator of Brain Spec. Instead of writing specs manually, you answer focused questions and the spec is compiled from your answers.

**8 categories, 5 questions each (40 total):**

1. **Functional Requirements** -- purpose, users, flows, inputs/outputs, business rules
2. **Technical Constraints** -- language, patterns, dependencies, versions, integration
3. **Data Model** -- entities, storage, migrations, validation, retention
4. **Edge Cases** -- invalid input, failures, rate limiting, concurrency, recovery
5. **Security** -- auth, sanitization, secrets, OWASP, audit logging
6. **Testing Strategy** -- strategy, scenarios, coverage, edge cases, performance
7. **Non-Functional** -- performance, scalability, a11y, i18n, monitoring
8. **Implementation** -- task breakdown, dependencies, complexity, parallelism, milestones

**Coverage threshold:** A category is considered covered at 60% (3/5 questions answered). Once covered, the interview advances to the next uncovered category.

**Early finish:** After 3+ questions, the user can compile the spec at any time. Not every question needs to be answered -- the goal is sufficient coverage, not exhaustive coverage.

**Compilation:** Answers are organized into a structured markdown spec with sections for each covered category.

## Security Model

Brain Spec has a constrained write scope:

- **Writes to:** `.brain-spec/` directory and `CLAUDE.md` (in the project root)
- **Reads from:** anywhere in the project (for stack detection, git info)
- **Git operations:** read-only (commit SHA, branch name, file diffs for log enrichment). Brain Spec never commits, pushes, or modifies git state.

## Design Decisions

**File-based storage, not a database.** Specs and tasks are JSON and markdown files. This means:
- Everything is human-readable and editable
- Files can be committed to version control
- No database setup or dependencies
- Works offline

**Interview-first, not ceremony-first.** Creating a spec starts with questions, not a blank template. This lowers the barrier to writing good specs and ensures consistent coverage.

**No approval gates.** Brain Spec does not enforce workflow rules. You can create tasks before finishing an interview, archive a spec with pending tasks, or update a completed spec. The tool trusts you to use your judgment.

**Hierarchical task IDs.** Tasks use "1", "1.1", "1.2" style IDs rather than UUIDs. This makes them easy to reference in conversation and shows the parent-child relationship at a glance.

**Fork context for dashboard.** The `/brain-status` skill runs in a forked context to keep JSON parsing and file reads from inflating the main conversation window. You see the output but the intermediate work does not consume context.
