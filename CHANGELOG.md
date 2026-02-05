# Changelog

All notable changes to Brain Spec Skills are documented here.

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
