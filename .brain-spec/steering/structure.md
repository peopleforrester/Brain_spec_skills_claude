# Structure Steering

## Directory Organization
```
.claude/skills/          # The 4 skill files (the product)
  brain-init/SKILL.md
  brain-spec/SKILL.md
  brain-task/SKILL.md
  brain-status/SKILL.md
.brain-spec/             # Brain Spec's own workspace (dogfooding)
docs/                    # User-facing documentation
  QUICKSTART.md
  SKILLS-REFERENCE.md
  ARCHITECTURE.md
  PLUGIN-GUIDE.md
README.md                # Public face
CLAUDE.md                # Contributor guide
SPEC.md                  # Legacy MCP server spec (reference)
VERSION                  # Version source of truth
install.sh               # Distribution mechanism
```

## Naming Conventions
- Directories: lowercase with hyphens (brain-init, brain-spec)
- SKILL.md: always uppercase (Claude Code convention)
- Documentation: UPPERCASE.md for top-level, UPPERCASE.md for docs/
- JSON files: lowercase (config.json, tasks.json)
- Slugs: lowercase alphanumeric + hyphens, max 100 chars

## Module Boundaries
- Each skill is self-contained — all schemas, templates, and logic in one SKILL.md
- Skills share the .brain-spec/ data directory but do not import from each other
- install.sh is independent of the skills (bash, not markdown)
- docs/ is for humans; SKILL.md is for Claude

## Development Guidelines
- Edit SKILL.md files directly — no transpilation or build step
- Test by invoking the slash command in Claude Code
- Commit to staging first, merge to main after verification
- SPEC.md is historical reference — do not update it for skill changes
