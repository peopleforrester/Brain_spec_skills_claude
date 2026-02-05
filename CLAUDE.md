# Brain Spec MCP Server — Development Guide

## Stack
- TypeScript 5.x, Node.js 20+, ESM modules
- MCP SDK: @modelcontextprotocol/sdk
- Build: tsup, Test: vitest, Lint: eslint + prettier
- Dashboard: Express + vanilla HTML/JS

## Commands
- `npm test` — Run all tests
- `npm run build` — Build with tsup
- `npm run dev` — Build with watch mode
- `npm run lint` — Lint all source and test files
- `npm run format` — Format with prettier
- `npm run typecheck` — TypeScript type checking

## Key Directories
- `src/modules/spec-workflow/` — Spec CRUD, interview engine, task management
- `src/modules/config-engine/` — CLAUDE.md generation, agents, skills, hooks, rules
- `src/modules/learning/` — Pattern extraction, analytics, context management
- `src/modules/dashboard/` — Express polling dashboard
- `src/utils/` — File system, markdown, git, validation utilities
- `src/templates/` — All built-in templates (read-only)
- `skills/` — Bundled slash command .md files
- `tests/` — Unit, integration, E2E tests

## Code Standards
- All files start with 2-line ABOUTME comments
- Use zod for runtime validation of tool inputs
- Every tool returns `{ success: boolean, data?: any, error?: string }`
- All tools prefixed with `brain_`
- Write access constrained to `.brain-spec/` and `CLAUDE.md` only
- Git operations are read-only (never commit/push/modify)

## Gotchas
- MCP server uses stdio transport for normal operation
- Dashboard is a separate Express process (--dashboard flag)
- Interview state persists in .meta.json, resumable across sessions
- Templates in src/templates/ are bundled as package data files
