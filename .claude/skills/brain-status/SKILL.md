---
name: brain-status
description: Display a quick overview of the Brain Spec workspace with steering doc status, specs, tasks, and progress.
context: fork
allowed-tools: Glob Read Grep Bash
---
<!-- ABOUTME: Skill instructions for /brain-status slash command. -->
<!-- ABOUTME: Displays workspace dashboard with steering docs, specs, tasks, and progress bars. -->

# Brain Status — Workspace Dashboard

Display a quick overview of the Brain Spec workspace: steering doc status, all specs with progress, archived specs, and overall statistics.

## Usage

```
/brain-status
```

No arguments. Reads workspace state and displays a summary.

## Instructions

### Step 1: Read Version

Use Glob to check for a VERSION file in `.claude/skills/brain-status/VERSION` or `.claude/skills/brain-init/VERSION`. If found, read it and store the version string for the dashboard header. If not found, use "dev" as the version.

### Step 2: Verify Workspace

Check if `.brain-spec/config.json` exists using Glob.

- If not found, display: "No Brain Spec workspace found. Run `/brain-init` to set up."
- If found, proceed.

### Step 3: Check Steering Documents

Check for the existence of each steering document:
- `.brain-spec/steering/product.md`
- `.brain-spec/steering/tech.md`
- `.brain-spec/steering/structure.md`

### Step 4: List Active Specs

Use Glob to find all `.brain-spec/specs/*.meta.json` files. Read each one.

For each spec, also read `.brain-spec/tasks/{slug}/tasks.json` if it exists to get task counts.

### Step 5: List Archived Specs

Use Glob to find all `.brain-spec/archive/*/archive-metadata.json` files. Read each one.

### Step 6: Display Dashboard

Format the output as follows:

```
╔══════════════════════════════════════╗
║    Brain Spec Dashboard v{version}   ║
╚══════════════════════════════════════╝

Steering Documents
  product.md    ✓ exists / ✗ missing
  tech.md       ✓ exists / ✗ missing
  structure.md  ✓ exists / ✗ missing

Active Specs
  Slug               Status      Progress
  ─────────────────  ──────────  ──────────────────
  user-auth-flow     active      ━━━━━━━━━━━━──── 60% (3/5)
  api-redesign       draft       ────────────────── 0% (0/0)

Archived Specs
  Slug               Reason       Archived
  ─────────────────  ───────────  ──────────
  old-feature        completed    2025-01-10

Overall Statistics
  Active specs:    2
  Archived specs:  1
  Total tasks:     5
  Completed tasks: 3
  Completion:      60%
```

If there are no specs, show: "No specs yet. Create one with `/brain-spec create <name>`"

If there are no archived specs, show: "No archived specs."

Progress bar: 18 characters wide. Use `━` for filled and `─` for empty. Calculate fill: `round(progress / 100 * 18)`.

### Notes on Fork Context

This skill uses `context: fork` so that the JSON parsing and file reads stay isolated from the main conversation context. The output is the formatted dashboard text shown to the user.
