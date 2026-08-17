# Quick Start Guide

This walkthrough takes you from installation to a fully tracked spec in about 10 minutes.

## Prerequisites

- [Claude Code](https://claude.ai/claude-code) installed and working
- A project directory (any language, any framework)

## Step 1: Install Brain Spec Skills

Run the installer from your project directory:

```bash
curl -fsSL https://raw.githubusercontent.com/peopleforrester/Brain_spec_skills_claude/main/install.sh | bash
```

You should see:

```
Installing Brain Spec Skills to .claude/skills
Fetching latest skills...
  Installed: brain-init
  Installed: brain-spec
  Installed: brain-task
  Installed: brain-status

Brain Spec Skills v1.2.0 installed (4 skills)
  Location: .claude/skills
```

## Step 2: Initialize Your Workspace

Open Claude Code in your project and type:

```
/brain-init
```

Brain Spec will:

1. **Create the directory tree** -- `.brain-spec/` with subdirectories for specs, tasks, steering docs, and archives.

2. **Ask about steering documents** -- these are project-level guidance documents that give context to every spec you create:
   - **product.md** -- Vision, target audience, core features, success metrics
   - **tech.md** -- Architecture, tech stack, performance requirements, constraints
   - **structure.md** -- Directory layout, naming conventions, module boundaries

   You can create them now with guided content, use the template to fill in later, or skip them entirely. We recommend at least creating them from templates -- you can fill them in as you go.

3. **Offer to generate a CLAUDE.md** -- auto-detects your project stack (Python, TypeScript, etc.) and generates a CLAUDE.md from built-in templates.

When finished, you'll see a summary:

```
Brain Spec workspace initialized:
  .brain-spec/config.json     ✓
  .brain-spec/steering/        product.md, tech.md, structure.md
  .brain-spec/specs/           (empty, ready for specs)
  .brain-spec/tasks/           (empty, ready for tasks)
  .brain-spec/archive/         (empty)
  CLAUDE.md                    created (standard template)
```

## Step 3: Create Your First Spec

Type:

```
/brain-spec create User Authentication
```

You'll be asked how to create the spec:

- **Interview** (recommended) -- Claude asks you structured questions across 8 categories
- **Blank template** -- creates a spec with TODO placeholders

### The Interview Flow

If you choose Interview, Claude will walk you through questions like:

```
[Functional Requirements] What is the primary purpose of this feature/system?
What problem does it solve?
```

Answer naturally. After each answer, you'll see progress:

```
[3 answered | technical | coverage: 40%]
```

The interview covers 8 categories:
1. Functional Requirements
2. Technical Constraints
3. Data Model
4. Edge Cases & Error Handling
5. Security Considerations
6. Testing Strategy
7. Non-Functional Requirements
8. Implementation Approach

After 3+ questions, you can type **done** to compile the spec early, or continue for more thorough coverage. When a category reaches 60% coverage (3/5 questions), the interview automatically advances to the next category.

When you finish, the spec is compiled to `.brain-spec/specs/user-authentication.md` with structured sections for each category discussed.

## Step 4: Create Tasks

Break your spec into actionable tasks:

```
/brain-task create user-authentication "Implement login endpoint"
```

Output:

```
Task 1 created: Implement login endpoint
```

Add subtasks with `--parent`:

```
/brain-task create user-authentication "Add email validation" --parent 1
/brain-task create user-authentication "Add password hashing" --parent 1
/brain-task create user-authentication "Add JWT token generation" --parent 1
```

This creates a hierarchy:

```
1    Implement login endpoint
1.1  Add email validation
1.2  Add password hashing
1.3  Add JWT token generation
```

Add more top-level tasks:

```
/brain-task create user-authentication "Implement session management"
/brain-task create user-authentication "Write integration tests"
```

## Step 5: Track Progress

As you work, update tasks:

```
/brain-task update user-authentication 1.1 --status completed
/brain-task update user-authentication 1 --status in-progress --progress 50
```

View your task list:

```
/brain-task list user-authentication
```

Output:

```
ID    Title                        Status        Progress
────  ───────────────────────────  ────────────  ──────────────────
1     Implement login endpoint     in-progress   ━━━━━━━━━─────────  50%
1.1   Add email validation         completed     ━━━━━━━━━━━━━━━━━━ 100%
1.2   Add password hashing         pending       ──────────────────   0%
1.3   Add JWT token generation     pending       ──────────────────   0%
2     Implement session management pending       ──────────────────   0%
3     Write integration tests      pending       ──────────────────   0%

2/6 tasks completed (33%)
```

Check progress across all specs:

```
/brain-task progress
```

## Step 6: Log Implementation

When you complete a task, create an implementation log:

```
/brain-task log user-authentication 1
```

Claude will ask you for:
- **Summary**: What was implemented
- **Files modified/created**: Auto-detected from git if available
- **Artifacts**: Endpoints, functions, classes created
- **Notes**: Anything else to record

The log is saved to `.brain-spec/tasks/user-authentication/logs/1.log.md` with git commit/branch data auto-populated. The task is automatically marked as completed.

## Step 7: View the Dashboard

Get an overview of everything:

```
/brain-status
```

Output:

```
╔══════════════════════════════════════╗
║    Brain Spec Dashboard v1.2.0       ║
╚══════════════════════════════════════╝

Steering Documents
  product.md    ✓ exists
  tech.md       ✓ exists
  structure.md  ✓ exists

Active Specs
  Slug                 Status      Progress
  ─────────────────  ──────────  ──────────────────
  user-authentication  active      ━━━━━━━━━━━━────── 33% (2/6)

Archived Specs
  No archived specs.

Overall Statistics
  Active specs:    1
  Archived specs:  0
  Total tasks:     6
  Completed tasks: 2
  Completion:      33%
```

## Step 8: Archive When Done

When a spec is fully implemented:

```
/brain-spec archive user-authentication
```

You'll be asked for a reason (completed/deprecated/superseded) and a brief summary. The spec, metadata, and tasks are moved to `.brain-spec/archive/user-authentication/`.

## What's Next?

- Read the [Skills Reference](./SKILLS-REFERENCE.md) for all subcommands and options
- Read the [Architecture Guide](./ARCHITECTURE.md) to understand the data model
- Read the [Plugin Guide](./PLUGIN-GUIDE.md) to learn about team sharing and customization
