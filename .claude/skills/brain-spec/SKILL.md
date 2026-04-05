---
name: brain-spec
description: Spec lifecycle management — create, interview, list, get, update, delete, and archive feature specifications.
---
<!-- ABOUTME: Skill instructions for /brain-spec slash command. -->
<!-- ABOUTME: Manages spec lifecycle: create, interview, list, get, update, delete, archive. -->

# Brain Spec — Spec Lifecycle Management

Create, interview, view, update, delete, and archive feature specifications stored in `.brain-spec/specs/`.

## Usage

```
/brain-spec <subcommand> [arguments]
```

Subcommands:
- `create <name>` — Create a blank spec or start an interview
- `interview <name>` — Start/resume a guided interview for a spec
- `list [--status <status>]` — List all specs with status and task counts
- `get <slug>` — Display a spec's content and metadata
- `update <slug>` — Interactively update spec content or status
- `delete <slug>` — Delete a spec (requires confirmation)
- `archive <slug>` — Move a spec to the archive

## Instructions

Parse `$ARGUMENTS` to determine the subcommand and its parameters. The first word is the subcommand; remaining words are arguments.

### Reference: Slug Rules

Slugs are generated from spec names:
- Lowercase the name
- Replace any sequence of non-alphanumeric characters with a single hyphen
- Strip leading/trailing hyphens
- Truncate to 100 characters
- Valid slug pattern: `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`

Example: "User Authentication Flow" → `user-authentication-flow`

### Reference: SpecMeta Schema

Each spec has a `{slug}.meta.json` file in `.brain-spec/specs/`:

```json
{
  "specSlug": "string",
  "name": "string (original name)",
  "description": "string",
  "status": "draft | active | completed | archived",
  "interview": {
    "currentCategory": "string (one of 8 categories)",
    "questionsAsked": "number",
    "answers": [
      {
        "category": "string",
        "question": "string",
        "answer": "string"
      }
    ],
    "coverageMap": {
      "functional": 0.0,
      "technical": 0.0,
      "data-model": 0.0,
      "edge-cases": 0.0,
      "security": 0.0,
      "testing": 0.0,
      "nonfunctional": 0.0,
      "implementation": 0.0
    }
  },
  "createdAt": "ISO 8601 timestamp",
  "updatedAt": "ISO 8601 timestamp"
}
```

### Reference: Interview Question Bank

8 categories, 5 questions each (40 total):

**Functional Requirements:**
1. What is the primary purpose of this feature/system? What problem does it solve?
2. Who are the target users? Describe the key user personas.
3. What are the main user flows? Walk through the critical path.
4. What inputs does the system accept and what outputs does it produce?
5. What business rules or constraints govern the behavior?

**Technical Constraints:**
1. What programming language and framework will be used?
2. Are there existing codebase patterns or conventions that must be followed?
3. What external dependencies or third-party services are required?
4. What are the version requirements or compatibility constraints?
5. How will this integrate with the existing system architecture?

**Data Model:**
1. What are the core data entities and their relationships?
2. How will data be stored (database type, schema structure)?
3. How will the schema evolve over time? Migration strategy?
4. What data validation rules apply?
5. Are there data retention or cleanup requirements?

**Edge Cases & Error Handling:**
1. What happens when the system receives invalid or unexpected input?
2. How should the system handle network failures or timeouts?
3. What are the rate limiting and throttling requirements?
4. How should concurrent access or race conditions be handled?
5. What are the failure modes and recovery strategies?

**Security:**
1. What authentication and authorization mechanisms are needed?
2. How will user input be sanitized to prevent injection attacks?
3. What secrets management approach will be used?
4. Are there OWASP concerns specific to this feature?
5. What audit logging or compliance requirements exist?

**Testing Strategy:**
1. What testing strategy will be used (unit, integration, e2e)?
2. What are the critical test scenarios that must be covered?
3. What is the target code coverage percentage?
4. How will edge cases and error paths be tested?
5. Are there performance or load testing requirements?

**Non-Functional Requirements:**
1. What are the performance targets (response time, throughput)?
2. What are the scalability expectations?
3. Are there accessibility (a11y) requirements?
4. Are there internationalization (i18n) requirements?
5. What monitoring and observability is needed?

**Implementation Approach:**
1. What is the suggested task breakdown for implementation?
2. What is the dependency ordering between tasks?
3. What is the estimated complexity (simple, moderate, complex)?
4. Are there any tasks that should be parallelized?
5. What are the key milestones or checkpoints?

**Category display names:**
- functional → "Functional Requirements"
- technical → "Technical Constraints"
- data-model → "Data Model"
- edge-cases → "Edge Cases & Error Handling"
- security → "Security Considerations"
- testing → "Testing Strategy"
- nonfunctional → "Non-Functional Requirements"
- implementation → "Implementation Approach"

### Reference: Spec Template (blank)

```markdown
# Spec: {{name}}

## Overview
{{description}}

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
```

### Reference: Archive Metadata Schema

```json
{
  "specSlug": "string",
  "archivedAt": "ISO 8601 timestamp",
  "reason": "completed | deprecated | superseded",
  "supersededBy": "string | null",
  "summary": "string",
  "finalStatus": {
    "totalTasks": 0,
    "completedTasks": 0,
    "specStatus": "string"
  }
}
```

---

## Subcommand: `create`

**Usage**: `/brain-spec create My Feature Name`

1. Verify `.brain-spec/specs/` directory exists. If not, tell the user to run `/brain-init` first.
2. Generate the slug from the name (everything after "create ").
3. Check if `.brain-spec/specs/{slug}.meta.json` already exists. If so, error with "Spec '{slug}' already exists."
4. Ask the user: "How do you want to create this spec?"
   - **Interview** (recommended) — Guided Q&A that builds the spec interactively
   - **Blank template** — Creates a spec with TODO placeholders to fill in manually
5. If **Blank template**: Write `{slug}.meta.json` and `{slug}.md` using the templates above, with status "draft". Display the file path and suggest next steps.
6. If **Interview**: Write `{slug}.meta.json` with status "draft" and empty interview state, then immediately begin the interview flow (see `interview` subcommand below).

## Subcommand: `interview`

**Usage**: `/brain-spec interview my-feature-name`

Runs a guided interview to build a spec. Can be started fresh or resumed.

1. Read `.brain-spec/specs/{slug}.meta.json`. If not found, error.
2. Check the `interview` field:
   - If null or missing: Initialize interview state with `currentCategory: "functional"`, `questionsAsked: 0`, empty answers, all coverage at 0.0. Save the meta file.
   - If exists with `questionsAsked > 0`: Resume from where we left off. Tell the user: "Resuming interview for '{name}' — {questionsAsked} questions answered so far."

3. **Read steering context**: If `.brain-spec/steering/` has any documents, read them to provide context for the interview. Mention relevant steering context when asking questions.

4. **Interview loop**: For each question:
   - Determine the current category and find the next unanswered question in that category.
   - Present the question to the user, prefixed with the category name in brackets: `[Functional Requirements] What is the primary purpose...`
   - Wait for the user's response.
   - Record the answer in the interview state: `{ category, question, answer }`.
   - Update `questionsAsked` counter.
   - Update coverage for the category: `categoryAnswers.length / 5` (5 questions per category).
   - If coverage for current category >= 0.6 (3+ answers), advance to the next uncovered category.
   - Save the meta file after each answer.
   - After each answer, show a brief progress indicator: `[{questionsAsked} answered | {currentCategory} | coverage: {percentage}%]`
   - If `questionsAsked >= 3`, offer the option to finish early: "You can continue answering or type 'done' to compile the spec now."

5. **Category advancement**: When advancing categories, go in order: functional → technical → data-model → edge-cases → security → testing → nonfunctional → implementation. Skip categories already at >= 0.6 coverage. If all categories are covered, tell the user all categories are covered and offer to compile.

6. **Compiling the spec** (when user says "done" or all categories covered):
   - Build the spec markdown from interview answers:
     - Title: `# Spec: {name}`
     - Description as blockquote if present
     - `## Overview` section using the first functional answer
     - One `## {Category Display Name}` section per category that has answers
     - Within each section, one `### {question}` subsection per answer
     - Skip the first functional answer in the Functional Requirements section (already in Overview)
     - `## Acceptance Criteria` with a TODO checkbox
     - `## Implementation Checklist` with a TODO checkbox (only if implementation answers exist)
     - Footer: `---` then italicized generation metadata (questions asked, categories covered)
   - Write the compiled markdown to `.brain-spec/specs/{slug}.md`
   - Update meta: set `status` to "active", update `updatedAt`
   - Display: "Spec compiled and saved to .brain-spec/specs/{slug}.md" with a summary of coverage

## Subcommand: `list`

**Usage**: `/brain-spec list` or `/brain-spec list --status active`

1. Use Glob to find all `.brain-spec/specs/*.meta.json` files.
2. Read each meta file.
3. If `--status` is provided, filter by that status.
4. For each spec, also check if `.brain-spec/tasks/{slug}/tasks.json` exists and count tasks.
5. Display a formatted table:

```
Slug               Status     Tasks    Created
─────────────────  ─────────  ───────  ──────────
user-auth-flow     active     3/5      2025-01-15
api-redesign       draft      0/0      2025-01-20
```

If no specs exist, display: "No specs found. Create one with `/brain-spec create <name>`"

## Subcommand: `get`

**Usage**: `/brain-spec get my-feature-name`

1. Read `.brain-spec/specs/{slug}.meta.json`. If not found, error.
2. Read `.brain-spec/specs/{slug}.md`. If not found, show metadata only.
3. Display metadata summary (status, created, updated, interview coverage if present).
4. Display the full spec markdown content.

## Subcommand: `update`

**Usage**: `/brain-spec update my-feature-name`

1. Read `.brain-spec/specs/{slug}.meta.json`. If not found, error.
2. Ask the user what they want to update. Present these choices and wait for their response:
   - **Status** — Change spec status (draft/active/completed)
   - **Content** — Edit the spec markdown
   - **Description** — Update the spec description
3. For **Status**: Ask which status to set. Update meta, save.
4. For **Content**: Read current `.brain-spec/specs/{slug}.md`, show it, ask what to change. Apply edits using the Edit tool. Update `updatedAt` in meta.
5. For **Description**: Ask for the new description, update meta, save.

## Subcommand: `delete`

**Usage**: `/brain-spec delete my-feature-name`

1. Read `.brain-spec/specs/{slug}.meta.json`. If not found, error.
2. Ask for confirmation: "Are you sure you want to delete spec '{name}' ({slug})? This will remove the spec file, metadata, and all associated tasks. This cannot be undone."
3. If confirmed:
   - Delete `.brain-spec/specs/{slug}.md`
   - Delete `.brain-spec/specs/{slug}.meta.json`
   - Delete `.brain-spec/tasks/{slug}/` directory if it exists
   - Confirm deletion: "Spec '{slug}' deleted."
4. If not confirmed: "Deletion cancelled."

## Subcommand: `archive`

**Usage**: `/brain-spec archive my-feature-name`

1. Read `.brain-spec/specs/{slug}.meta.json`. If not found, error.
2. Ask the user for:
   - **Reason**: completed / deprecated / superseded (ask the user to choose)
   - **Summary**: Brief summary of what was accomplished
   - If superseded: **Superseded by**: slug of the replacement spec
3. Count tasks from `.brain-spec/tasks/{slug}/tasks.json` if it exists.
4. Create archive directory: `.brain-spec/archive/{slug}/`
5. Write `.brain-spec/archive/{slug}/archive-metadata.json` using the Archive Metadata Schema.
6. Move (copy then delete) these files into the archive directory:
   - `.brain-spec/specs/{slug}.md` → `.brain-spec/archive/{slug}/{slug}.md`
   - `.brain-spec/specs/{slug}.meta.json` → `.brain-spec/archive/{slug}/{slug}.meta.json`
   - `.brain-spec/tasks/{slug}/` → `.brain-spec/archive/{slug}/tasks/` (if exists)
7. Confirm: "Spec '{slug}' archived to .brain-spec/archive/{slug}/"
