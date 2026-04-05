---
name: brain-task
description: Task management — create, update, list, log, and track progress for spec implementation tasks.
---

# Brain Task — Task Management

Create, update, list, and log implementation tasks for specs stored in `.brain-spec/tasks/`.

## Usage

```
/brain-task <subcommand> [arguments]
```

Subcommands:
- `create <slug> <title> [--parent <id>]` — Create a task for a spec
- `update <slug> <id> [--status <s>] [--progress <n>]` — Update a task
- `list <slug> [--status <s>]` — List tasks for a spec
- `log <slug> <id>` — Log implementation details for a completed task
- `progress [slug]` — Show aggregated progress for one or all specs

## Instructions

Parse `$ARGUMENTS` to determine the subcommand. The first word is the subcommand; remaining words are arguments. Parse `--flag value` style options.

### Reference: Task Schema

Tasks are stored in `.brain-spec/tasks/{slug}/tasks.json`:

```json
{
  "specSlug": "string",
  "tasks": [
    {
      "id": "string (hierarchical: 1, 2, 2.1, 2.2)",
      "title": "string",
      "description": "string",
      "status": "pending | in-progress | completed",
      "parentTaskId": "string | null",
      "acceptanceCriteria": ["string"],
      "requirements": ["string"],
      "leverage": "string",
      "files": ["string"],
      "prompt": "string",
      "progress": 0,
      "notes": "string",
      "createdAt": "ISO 8601",
      "updatedAt": "ISO 8601"
    }
  ]
}
```

### Reference: ID Generation Algorithm

- **Top-level tasks**: Find the highest existing top-level ID (integer), increment by 1. First task is "1".
- **Subtasks**: Given parent ID (e.g., "2"), find siblings under that parent, take the highest sub-ID, increment. Example: if "2.1" and "2.2" exist, next is "2.3".
- IDs are strings, not numbers. "1", "2", "1.1", "1.2", "2.1" etc.

### Reference: Implementation Log Template

Logs are written to `.brain-spec/tasks/{slug}/logs/{id}.log.md`:

```markdown
# Implementation Log — Task {id}

## Summary
{summary}

## Git Reference
- **Commit**: {commitSha}
- **Branch**: {branch}
- **Date**: {timestamp}

## Files Changed
### Modified
- `{file}`

### Created
- `{file}`

## Code Statistics
- Lines Added: {linesAdded}
- Lines Removed: {linesRemoved}
- Files Changed: {totalFiles}

## Artifacts
### API Endpoints
- **{METHOD}** `{path}` — {purpose}

### Functions
- `{name}` — {purpose}
  - Signature: `{signature}`
  - Exported: yes/no
  - Module: `{module}`

### Classes
- `{name}` — {purpose}
  - Methods: {methods}
  - Module: `{module}`

### UI Components
- `{name}` — {purpose}
  - Props: {props}
  - Module: `{module}`

### Integrations
- {from} → {to}

## Notes
{notes}
```

Only include sections that have content. Omit empty sections.

---

## Subcommand: `create`

**Usage**: `/brain-task create my-feature "Implement login form"` or `/brain-task create my-feature "Add validation" --parent 1`

1. Verify `.brain-spec/tasks/` exists. If not, tell user to run `/brain-init`.
2. Verify the spec exists by checking `.brain-spec/specs/{slug}.meta.json`. If not found, error.
3. Create `.brain-spec/tasks/{slug}/` directory if it doesn't exist.
4. Read `.brain-spec/tasks/{slug}/tasks.json` or create a new one if it doesn't exist:
   ```json
   { "specSlug": "{slug}", "tasks": [] }
   ```
5. Parse the title (text after the slug, optionally in quotes).
6. Parse `--parent <id>` if present.
7. Generate the task ID using the ID generation algorithm.
8. Ask the user for optional details:
   - Description (or skip)
   - Acceptance criteria (or skip)
9. Create the task object with defaults:
   - `status`: "pending"
   - `progress`: 0
   - `parentTaskId`: from --parent or null
   - `createdAt`/`updatedAt`: current ISO timestamp
   - All other string fields: empty string
   - All other array fields: empty array
10. Append to the tasks array, write `tasks.json`.
11. Display: "Task {id} created: {title}" with the file path.

## Subcommand: `update`

**Usage**: `/brain-task update my-feature 1 --status in-progress` or `/brain-task update my-feature 1.2 --progress 75`

1. Read `.brain-spec/tasks/{slug}/tasks.json`. If not found, error.
2. Find the task by ID. If not found, error with available IDs.
3. Parse flags:
   - `--status <pending|in-progress|completed>`: Update status. If set to "completed", also set progress to 100.
   - `--progress <0-100>`: Update progress percentage.
   - `--notes <text>`: Append to notes.
4. If no flags provided, show current task details and ask the user what they want to update.
5. Update `updatedAt` timestamp.
6. Save `tasks.json`.
7. Display updated task summary.

## Subcommand: `list`

**Usage**: `/brain-task list my-feature` or `/brain-task list my-feature --status pending`

1. Read `.brain-spec/tasks/{slug}/tasks.json`. If not found, show "No tasks for spec '{slug}'."
2. If `--status` provided, filter tasks.
3. Display a formatted table with indentation for subtasks:

```
ID    Title                    Status        Progress
────  ───────────────────────  ────────────  ────────
1     Implement login form     in-progress   ████░░░░ 50%
1.1   Add email validation     completed     ████████ 100%
1.2   Add password rules       pending       ░░░░░░░░ 0%
2     Design API endpoints     pending       ░░░░░░░░ 0%
```

Progress bar: Use `█` for filled and `░` for empty, 8 characters wide. Calculate fill: `round(progress / 100 * 8)`.

Subtasks (IDs containing ".") should be indented with 2 spaces.

After the table, show summary: "{completed}/{total} tasks completed ({percentage}%)"

## Subcommand: `log`

**Usage**: `/brain-task log my-feature 1`

Create an implementation log for a task, documenting what was done.

1. Read `.brain-spec/tasks/{slug}/tasks.json`. Find the task by ID. If not found, error.
2. Create `.brain-spec/tasks/{slug}/logs/` directory if it doesn't exist.
3. **Auto-enrich with git data**: Run these Bash commands to get current git context:
   - `git rev-parse HEAD` — current commit SHA
   - `git rev-parse --abbrev-ref HEAD` — current branch
   - `git log -1 --format=%cI` — commit timestamp
   If any fail (not a git repo), omit the Git Reference section.
4. Ask the user for log details:
   - **Summary**: What was implemented? (required)
   - **Files modified**: Which existing files were changed? (can auto-detect from `git diff --name-only HEAD~1` if available)
   - **Files created**: Which new files were added?
   - **Artifacts**: Any endpoints, functions, classes, components, or integrations created? (optional, ask one at a time)
   - **Notes**: Any additional notes?
5. Build the log markdown using the template above, omitting empty sections.
6. Write to `.brain-spec/tasks/{slug}/logs/{id}.log.md`.
7. Update the task: set `status` to "completed", `progress` to 100, update `updatedAt`.
8. Save `tasks.json`.
9. Display: "Implementation log saved to .brain-spec/tasks/{slug}/logs/{id}.log.md" and "Task {id} marked as completed."

## Subcommand: `progress`

**Usage**: `/brain-task progress` or `/brain-task progress my-feature`

1. If a slug is provided:
   - Read `.brain-spec/tasks/{slug}/tasks.json`. Calculate and display progress for that spec.
2. If no slug:
   - Use Glob to find all `.brain-spec/tasks/*/tasks.json` files.
   - Read each one and calculate progress.
   - Display aggregated progress across all specs.

3. For each spec, calculate:
   - Total tasks (count)
   - Completed tasks (status === "completed")
   - In-progress tasks (status === "in-progress")
   - Pending tasks (status === "pending")
   - Completion percentage: `(completed / total * 100)` or 0 if no tasks

4. Display format:

**Single spec:**
```
Progress: my-feature
━━━━━━━━━━━━━━━━━━━━ 60% (3/5 tasks)

  Completed:   3 tasks
  In Progress: 1 task
  Pending:     1 task
```

Progress bar: 20 characters wide. Use `━` for filled, `─` for empty.

**All specs:**
```
Overall Progress

my-feature      ━━━━━━━━━━━━━━━━━━━━ 60% (3/5)
api-redesign    ━━━━━━━━━━──────────── 25% (1/4)
user-auth       ━━━━━━━━━━━━━━━━━━━━ 100% (2/2)

Total: 6/11 tasks completed (55%)
```
