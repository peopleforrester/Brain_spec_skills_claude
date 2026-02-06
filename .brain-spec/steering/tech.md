# Technical Steering

## Architecture Pattern
Pure markdown skill files — no runtime, no build step, no server. Claude Code reads SKILL.md files and executes the instructions using its built-in tools (Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion).

## Technology Stack
- Language: Markdown (SKILL.md files are structured prompts)
- Distribution: Bash install script + git clone
- Storage: JSON metadata + markdown content in .brain-spec/
- Version control: Git-friendly flat files

## Performance Requirements
- Skill invocation: instant (Claude reads the markdown, no startup)
- File I/O: limited by Claude Code's tool execution speed
- Context cost: ~1,500-3,000 tokens per skill invocation (only when used)

## Security Architecture
- Write scope: .brain-spec/ directory + CLAUDE.md only
- Git operations: read-only (commit SHA, branch, diffs for log enrichment)
- No network calls from skills themselves
- No secrets stored in .brain-spec/

## Constraints
- Must work with any Claude Code version that supports skills
- Must be language/framework agnostic (works for Python, TypeScript, Go, Rust, etc.)
- All schemas and templates must be embedded in SKILL.md (no external files)
- Install script requires only git and bash
