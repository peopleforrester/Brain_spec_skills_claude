# Skills Reference

Complete documentation for all Brain Spec slash commands.

---

## /brain-init

Initialize a Brain Spec workspace in the current project.

**Usage:**
```
/brain-init
```

No arguments. The skill uses interactive prompts.

**What it does:**

1. Creates the `.brain-spec/` directory tree:
   ```
   .brain-spec/
     config.json
     specs/
     tasks/
     steering/
     archive/
   ```

2. Writes `config.json` with default settings.

3. Asks about three steering documents (product, tech, structure). For each, you can:
   - Create with guided content (Claude asks you questions to fill in the sections)
   - Create from template (with TODO placeholders)
   - Skip

4. Offers to generate a CLAUDE.md for your project:
   - Auto-detects your stack (Python, TypeScript, Go, Rust, Node.js)
   - Lets you choose a template: minimal, standard, comprehensive, typescript, python
   - Fills in build/test/lint commands from your project files

**Idempotent:** If `.brain-spec/config.json` already exists, it asks if you want to reinitialize. Existing specs and tasks are preserved.

---

## /brain-spec

Manage feature specifications.

### /brain-spec create \<name\>

Create a new spec.

**Usage:**
```
/brain-spec create User Authentication Flow
```

The name is everything after `create`. It gets converted to a slug: `user-authentication-flow`.

**Slug rules:** lowercase, non-alphanumeric characters become hyphens, leading/trailing hyphens stripped, max 100 characters.

You'll be asked to choose:
- **Interview** (recommended) -- starts a guided Q&A session
- **Blank template** -- creates a spec with TODO placeholders

### /brain-spec interview \<slug\>

Start or resume a guided interview for a spec.

**Usage:**
```
/brain-spec interview user-authentication-flow
```

The interview covers 8 categories with 5 questions each (40 total):

| Category | Topics |
|----------|--------|
| Functional Requirements | Purpose, users, flows, inputs/outputs, business rules |
| Technical Constraints | Language, patterns, dependencies, versions, integration |
| Data Model | Entities, storage, migrations, validation, retention |
| Edge Cases | Invalid input, failures, rate limiting, concurrency, recovery |
| Security | Auth, sanitization, secrets, OWASP, audit logging |
| Testing Strategy | Strategy, scenarios, coverage, edge cases, performance |
| Non-Functional | Performance, scalability, a11y, i18n, monitoring |
| Implementation | Task breakdown, dependencies, complexity, parallelism, milestones |

**Coverage tracking:** Each category advances when 60% of its questions are answered (3/5). The interview can be finished early after 3+ total questions.

**Resumable:** Interview state is saved after every answer. If you close Claude Code and come back later, `/brain-spec interview <slug>` resumes where you left off.

**Compilation:** When you type "done" or all categories are covered, answers are compiled into a structured spec markdown file at `.brain-spec/specs/{slug}.md`.

### /brain-spec list

List all specs.

**Usage:**
```
/brain-spec list
/brain-spec list --status active
```

**Filters:** `--status draft`, `--status active`, `--status completed`

**Output:**
```
Slug                 Status     Tasks    Created
-------------------  ---------  -------  ----------
user-auth-flow       active     3/5      2025-01-15
api-redesign         draft      0/0      2025-01-20
```

### /brain-spec get \<slug\>

Display a spec's content and metadata.

**Usage:**
```
/brain-spec get user-auth-flow
```

Shows: status, creation date, last updated, interview coverage (if applicable), followed by the full spec markdown.

### /brain-spec update \<slug\>

Interactively update a spec.

**Usage:**
```
/brain-spec update user-auth-flow
```

You'll be asked what to update:
- **Status** -- change to draft, active, or completed
- **Content** -- edit the spec markdown
- **Description** -- update the metadata description

### /brain-spec validate \<slug\>

Check a spec for completeness, EARS-formed acceptance criteria, and task coverage. Read-only; reports a pass/warn/fail verdict without editing anything.

**Usage:**
```
/brain-spec validate user-auth-flow
```

Flags: unresolved `TODO:` placeholders in required sections, acceptance criteria that are not in EARS form (`WHEN <event> THE SYSTEM SHALL <behavior>`), and specs with no tasks covering them. Run it before breaking a spec into tasks or handing it off.

### /brain-spec delete \<slug\>

Delete a spec and all associated tasks.

**Usage:**
```
/brain-spec delete user-auth-flow
```

Requires confirmation. Deletes the spec file, metadata, and task directory. This cannot be undone -- consider `/brain-spec archive` instead.

### /brain-spec archive \<slug\>

Move a spec to the archive.

**Usage:**
```
/brain-spec archive user-auth-flow
```

You'll be asked for:
- **Reason:** completed, deprecated, or superseded
- **Summary:** brief description of what was accomplished
- **Superseded by:** (if reason is superseded) slug of the replacement spec

Files are moved to `.brain-spec/archive/{slug}/` with an `archive-metadata.json`.

---

## /brain-task

Manage implementation tasks for a spec.

### /brain-task create \<slug\> \<title\> [--parent \<id\>]

Create a task.

**Usage:**
```
/brain-task create user-auth "Implement login form"
/brain-task create user-auth "Add email validation" --parent 1
```

**ID generation:**
- Top-level tasks get sequential integer IDs: 1, 2, 3, ...
- Subtasks get hierarchical IDs: 1.1, 1.2, 2.1, ...

You'll be optionally asked for a description and acceptance criteria.

### /brain-task update \<slug\> \<id\> [--status \<s\>] [--progress \<n\>]

Update a task.

**Usage:**
```
/brain-task update user-auth 1 --status in-progress
/brain-task update user-auth 1.2 --progress 75
/brain-task update user-auth 1 --status completed
```

**Status values:** `pending`, `in-progress`, `completed`

**Progress:** 0-100. Setting status to `completed` automatically sets progress to 100.

If no flags are provided, shows the current task and asks what to update.

### /brain-task list \<slug\> [--status \<s\>]

List tasks for a spec.

**Usage:**
```
/brain-task list user-auth
/brain-task list user-auth --status pending
```

**Output:**
```
ID    Title                    Status        Progress
────  ───────────────────────  ────────────  ──────────────────
1     Implement login form     in-progress   ━━━━━━━━━─────────  50%
1.1   Add email validation     completed     ━━━━━━━━━━━━━━━━━━ 100%
1.2   Add password rules       pending       ──────────────────   0%
2     Design API endpoints     pending       ──────────────────   0%

1/4 tasks completed (25%)
```

Subtasks are indented. Progress bars are 18 characters wide.

### /brain-task log \<slug\> \<id\>

Log implementation details for a task.

**Usage:**
```
/brain-task log user-auth 1
```

Creates a detailed implementation log at `.brain-spec/tasks/{slug}/logs/{id}.log.md`.

**Auto-enrichment:** If the project is a git repository, the log automatically includes:
- Current commit SHA
- Current branch name
- Commit timestamp
- Changed files (from `git diff`)

You'll be asked for:
- **Summary** (required): what was implemented
- **Files modified/created**: auto-detected from git when possible
- **Artifacts**: endpoints, functions, classes, components, integrations
- **Notes**: additional context

The task is automatically marked as completed after logging.

### /brain-task progress [slug]

Show aggregated progress.

**Usage:**
```
/brain-task progress                    # All specs
/brain-task progress user-auth          # Single spec
```

**Single spec output:**
```
Progress: user-auth
━━━━━━━━━━━━━━━━━━━━ 60% (3/5 tasks)

  Completed:   3 tasks
  In Progress: 1 task
  Pending:     1 task
```

**All specs output:**
```
Overall Progress

user-auth       ━━━━━━━━━━━━━━━━━━━━ 60% (3/5)
api-redesign    ━━━━━━━━━━────────── 25% (1/4)

Total: 4/9 tasks completed (44%)
```

---

## /brain-status

Display a workspace dashboard.

**Usage:**
```
/brain-status
```

No arguments. Runs in a fork context (isolated from your main conversation) to keep the context window clean.

**Output:**
```
╔══════════════════════════════════════╗
║    Brain Spec Dashboard v1.2.0       ║
╚══════════════════════════════════════╝

Steering Documents
  product.md    ✓ exists
  tech.md       ✓ exists
  structure.md  ✗ missing

Active Specs
  Slug                 Status      Progress
  ─────────────────  ──────────  ──────────────────
  user-auth-flow       active      ━━━━━━━━━━━━────── 60% (3/5)
  api-redesign         draft       ────────────────── 0% (0/0)

Archived Specs
  Slug                 Reason       Archived
  ─────────────────  ───────────  ──────────
  old-feature          completed    2025-01-10

Overall Statistics
  Active specs:    2
  Archived specs:  1
  Total tasks:     5
  Completed tasks: 3
  Completion:      60%
```
