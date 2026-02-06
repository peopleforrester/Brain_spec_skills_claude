# Spec: Brain Spec Skills for Claude Code

> Replace a 20-tool TypeScript MCP server with 4 focused Claude Code slash commands. Zero dependencies, zero context cost until invoked.

## Overview

Brain Spec turns Claude Code into a structured development environment by adding four slash commands: `/brain-init` (workspace setup), `/brain-spec` (spec lifecycle with guided interview), `/brain-task` (task management with hierarchical IDs), and `/brain-status` (dashboard overview). All schemas, templates, and logic are embedded directly in SKILL.md markdown files.

## Functional Requirements

### Skills
- `/brain-init` creates .brain-spec/ directory tree, config.json, steering docs, and optionally generates a CLAUDE.md
- `/brain-spec` manages the full spec lifecycle: create (blank or interview), list, get, update, delete, archive
- `/brain-task` manages tasks: create with hierarchical IDs, update status/progress, list with progress bars, log implementation with git enrichment, show aggregated progress
- `/brain-status` displays a dashboard overview in fork context

### Interview Engine
- 8 categories, 5 questions each (40 total)
- Coverage tracking: category advances at 60% (3/5 questions)
- Resumable across sessions (state persisted in meta.json)
- Compilable into structured spec markdown after 3+ answers

### Data Storage
- File-based: JSON metadata + markdown content in .brain-spec/
- Git-friendly flat files, committable to version control
- Hierarchical task IDs: 1, 1.1, 1.2, 2, 2.1

## Technical Constraints

- Pure markdown skill files — no runtime, no build step
- Must work with any Claude Code version supporting skills
- Language/framework agnostic
- All schemas embedded in SKILL.md (no external file dependencies)
- Install script requires only git + bash

## Security Considerations

- Write scope limited to .brain-spec/ and CLAUDE.md
- Git operations are read-only
- No secrets stored, no network calls from skills

## Acceptance Criteria

- [x] 4 skills created and functional
- [x] Install script works for per-project and global modes
- [x] README with installation, quick start, skill reference
- [x] Documentation suite: quickstart, reference, architecture, plugin guide
- [x] Version tracking via VERSION file
- [x] Brain Spec dogfooded on its own repo
