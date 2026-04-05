# Brain Spec Skills for Claude Code

> Spec-driven development inside Claude Code. No server, no dependencies -- just 4 slash commands.

## What is Brain Spec?

Brain Spec turns Claude Code into a structured development environment. It adds four slash commands that let you plan features through guided interviews, break them into tracked tasks, and maintain a persistent project knowledge base -- all stored as readable JSON and markdown in a `.brain-spec/` directory.

Unlike an MCP server, Brain Spec Skills are plain markdown files that Claude Code loads on demand. Zero startup cost, zero dependencies, zero configuration.

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
| **brain-spec** | `/brain-spec <sub>` | Spec lifecycle: `create`, `interview`, `list`, `get`, `update`, `delete`, `archive` |
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

## License

MIT -- see [LICENSE](LICENSE).
