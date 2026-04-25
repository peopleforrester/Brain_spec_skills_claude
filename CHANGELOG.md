# Changelog

All notable changes to Brain Spec Skills are documented here.

## [1.1.1] - 2026-04-26

### Added
- `.claude-plugin/plugin.json` manifest for plugin distribution (name, version, keywords)
- `${CLAUDE_SKILL_DIR}` variable substitution in brain-status for runtime version detection
- `${CLAUDE_SESSION_ID}` reference in brain-task implementation log template
- `hooks:` frontmatter field on brain-init for skill-scoped lifecycle hooks
- Tests covering plugin manifest, variable substitutions, allowed-tools format, version-CHANGELOG sync

### Changed
- `allowed-tools` frontmatter on all 4 skills now uses comma-separated list (was space-separated, parsed as a single string)
- brain-status reads VERSION from `${CLAUDE_SKILL_DIR}` so the dashboard reports the correct version regardless of install location
- `VERSION` files bumped to 1.1.1 across root and all skill directories — earlier files lagged the CHANGELOG

### Removed
- Phantom `AskUserQuestion` reference in `.brain-spec/steering/tech.md` (matches the v1.1.0 sweep across docs and skills)
- Stray `SPEC.md` and `session_*.md` artifacts from repo root

## [1.1.0] - 2026-04-06

### Added
- YAML frontmatter on all SKILL.md files (`name`, `description`, `context`, `argument-hint`, `allowed-tools`)
- `argument-hint` field on brain-spec and brain-task for subcommand autocomplete
- `allowed-tools` field on all 4 skills to suppress permission prompts
- Bash test suite with 46 tests across 4 files (install, schema, docs, housekeeping)
- `.editorconfig` for markdown, shell, and JSON formatting consistency
- `checksums.txt` with SHA256 hashes for integrity verification
- Checksum verification instructions in README

### Changed
- Dashboard format standardized to Unicode box-drawing characters across all docs
- Progress bars standardized to `━`/`─` at 18 characters wide across all skills
- Replaced phantom `AskUserQuestion` tool references with natural language instructions
- Renamed `TMPDIR` to `CLONE_DIR` in install.sh to avoid shadowing standard env var
- Removed unenforced `maxTasksPerSpec` and `staleThresholdDays` config defaults
- Added ABOUTME HTML comments to all SKILL.md files

### Moved
- `SPEC.md` relocated to `docs/legacy/SPEC.md` (legacy MCP server reference)

## [1.0.0] - 2026-02-05

### Added
- `/brain-init` skill -- workspace initialization with steering docs and CLAUDE.md generation
- `/brain-spec` skill -- spec lifecycle with guided interview engine (8 categories, 40 questions)
- `/brain-task` skill -- task management with hierarchical IDs, progress bars, implementation logging
- `/brain-status` skill -- dashboard overview with fork context isolation
- `install.sh` -- one-line installer with per-project and global (`--global`) modes
- Version tracking via `VERSION` files stamped at install time
- Documentation: Quick Start, Skills Reference, Architecture, Plugin Guide

### Migration
- Pivoted from TypeScript MCP server architecture to pure Claude Code skills (markdown only)
- Zero npm dependencies, zero build step, zero startup context cost
- `SPEC.md` retained as historical reference from the MCP server design
