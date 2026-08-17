# Brain Spec Skills for Claude Code

[![tests](https://github.com/peopleforrester/Brain_spec_skills_claude/actions/workflows/test.yml/badge.svg)](https://github.com/peopleforrester/Brain_spec_skills_claude/actions/workflows/test.yml)
[![version](https://img.shields.io/badge/version-1.2.0-blue.svg)](CHANGELOG.md)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> Spec-driven development inside Claude Code. No server, no dependencies -- just 4 slash commands.

## What is Brain Spec?

Brain Spec turns Claude Code into a structured development environment. It adds four slash commands that let you plan features through guided interviews, break them into tracked tasks, and maintain a persistent project knowledge base -- all stored as readable JSON and markdown in a `.brain-spec/` directory.

Unlike an MCP server, Brain Spec Skills are plain markdown files that Claude Code loads on demand. Zero startup cost, zero dependencies, zero configuration.

The skills use current Claude Code conventions: runtime version detection via `${CLAUDE_SKILL_DIR}`, skill-scoped lifecycle hooks, comma-separated `allowed-tools` allowlists, and a plugin manifest for marketplace installation. Every skill file is checksummed and covered by a CI-run test suite (see the badge above).

## How It Works

```
/brain-init          /brain-spec create      /brain-task create     /brain-status
+-----------+        +----------------+      +----------------+     +-----------+
| Create    |------->| Interview or   |----->| Break into     |---->| View      |
| workspace |        | blank spec     |      | tracked tasks  |     | dashboard |
+-----------+        +----------------+      +----------------+     +-----------+
      |                     |                       |                     |
      v                     v                       v                     v
 .brain-spec/         specs/*.md              tasks/*/tasks.json    Aggregated
 config.json          specs/*.meta.json       tasks/*/logs/*.md     statistics
 steering/*.md
```

## How Brain Spec compares

Spec-driven development is a crowded field. GitHub Spec Kit, OpenSpec, and Amazon Kiro all cover the same core loop (structured spec, then plan, then tasks, then implement), and Spec Kit's Claude Code integration now installs as agent skills under `.claude/skills/`, the same form factor Brain Spec uses. Brain Spec does not try to out-feature them. It makes three deliberate choices:

- **Claude Code-native, not agent-agnostic.** Spec Kit spreads across ~30 agents and lands on the lowest common denominator. Brain Spec leans into Claude Code specifics: skills, skill-scoped hooks, `${CLAUDE_SKILL_DIR}` runtime version detection, and plugin-marketplace install.
- **Interview-first authoring.** `brain-spec create` runs a guided interview to build the spec with you, rather than handing you a blank template to fill in. It targets the blank-page problem directly.
- **Zero-install.** Four markdown files. No Python CLI to `uv tool install`, no IDE. `curl` it or install it as a plugin.

Acceptance criteria use [EARS notation](https://alistairmavin.com/ears/) (`WHEN <event> THE SYSTEM SHALL <behavior>`), the same testable-requirements convention Kiro adopted, and `brain-spec validate` checks a spec for completeness, EARS form, and task coverage before you build.

If you want a large, agent-portable framework, use Spec Kit or OpenSpec. If you want a small, opinionated, Claude Code-native take you can read end to end, that is what this is.

## Installation

### One-liner (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/peopleforrester/Brain_spec_skills_claude/main/install.sh | bash
```

This clones the repo to a temp directory, copies the 4 skill folders into your project's `.claude/skills/`, and cleans up.

### Manual

```bash
git clone --depth 1 https://github.com/peopleforrester/Brain_spec_skills_claude.git /tmp/brain-spec-skills
mkdir -p .claude/skills
cp -r /tmp/brain-spec-skills/.claude/skills/brain-* .claude/skills/
rm -rf /tmp/brain-spec-skills
```

### Global install (all projects)

```bash
curl -fsSL https://raw.githubusercontent.com/peopleforrester/Brain_spec_skills_claude/main/install.sh | bash -s -- --global
```

Installs to `~/.claude/skills/` so skills are available in every Claude Code project.

### As a Claude Code plugin

Brain Spec ships a plugin manifest, so you can install it through Claude Code's plugin marketplace instead of the install script:

```
/plugin marketplace add peopleforrester/Brain_spec_skills_claude
/plugin install brain-spec-skills@brain-spec
```

The first command registers this repo as a marketplace; the second installs the four skills. Updates come through `/plugin` rather than re-running the install script.

> Requires a Claude Code version with plugin marketplace support. The install-script methods above work on every version and need no marketplace.

### Verify

```bash
ls .claude/skills/brain-*/SKILL.md
# Should list 4 files
```

### Verify Checksums

For security-conscious installs, verify file integrity against published checksums:

```bash
curl -fsSL https://raw.githubusercontent.com/peopleforrester/Brain_spec_skills_claude/main/checksums.txt -o /tmp/brain-spec-checksums.txt
sha256sum -c /tmp/brain-spec-checksums.txt --ignore-missing
```

## Quick Start

1. Open Claude Code in your project
2. Type `/brain-init` -- creates the `.brain-spec/` workspace, steering docs, and optionally a CLAUDE.md
3. Type `/brain-spec create User Authentication` -- starts a guided interview that builds a structured spec
4. Type `/brain-task create user-authentication "Implement login form"` -- adds a tracked task
5. Type `/brain-status` -- see your dashboard with specs, tasks, and progress bars

## Skills

| Skill | Command | Purpose |
|-------|---------|---------|
| **brain-init** | `/brain-init` | Initialize workspace, create steering docs, generate CLAUDE.md |
| **brain-spec** | `/brain-spec <sub>` | Spec lifecycle: `create`, `interview`, `list`, `get`, `update`, `validate`, `delete`, `archive` |
| **brain-task** | `/brain-task <sub>` | Task management: `create`, `update`, `list`, `log`, `progress` |
| **brain-status** | `/brain-status` | Dashboard overview of all specs and tasks |

See [Skills Reference](docs/SKILLS-REFERENCE.md) for full subcommand documentation.

## Version

Check your installed version:

```bash
cat .claude/skills/brain-init/VERSION 2>/dev/null || echo "pre-1.0 (no version file)"
```

To update, re-run the install command.

## Documentation

- [Quick Start Guide](docs/QUICKSTART.md) -- Step-by-step first-use walkthrough
- [Skills Reference](docs/SKILLS-REFERENCE.md) -- Detailed subcommand documentation
- [Architecture](docs/ARCHITECTURE.md) -- Data model, design decisions, security
- [Plugin Guide](docs/PLUGIN-GUIDE.md) -- Install modes, team sharing, extending
- [Changelog](CHANGELOG.md) -- Release history
- [Legacy MCP Server Spec](docs/legacy/SPEC.md) -- Reference only; the project pivoted to skills

## Data Directory

All Brain Spec data lives in `.brain-spec/` within your project:

```
.brain-spec/
  config.json                       # Workspace configuration
  steering/                         # Project guidance documents
    product.md                      #   Vision, audience, features
    tech.md                         #   Stack, architecture, constraints
    structure.md                    #   Directory layout, conventions
  specs/                            # Feature specifications
    {slug}.md                       #   Spec content (markdown)
    {slug}.meta.json                #   Metadata, interview state
  tasks/                            # Implementation tracking
    {slug}/
      tasks.json                    #   Task list with hierarchical IDs
      logs/{id}.log.md              #   Implementation logs with git data
  archive/                          # Completed/deprecated specs
    {slug}/archive-metadata.json
```

Commit `.brain-spec/` to version control to share specs with your team, or add it to `.gitignore` for personal use.

## Testing

The skills ship with a bash test suite that validates frontmatter, schemas, docs consistency, the plugin manifests, and version integrity. It runs on every push and pull request via GitHub Actions, alongside checksum verification and `shellcheck`.

```bash
bash tests/run-tests.sh
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow.

## License

MIT -- see [LICENSE](LICENSE).
