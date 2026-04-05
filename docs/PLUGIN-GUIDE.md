# Plugin & Extension Guide

How to install, share, customize, and extend Brain Spec Skills.

## Installation Modes

### Per-Project (Default)

```bash
curl -fsSL https://raw.githubusercontent.com/peopleforrester/Brain_spec_skills_claude/main/install.sh | bash
```

Installs to `.claude/skills/` in the current directory. This is recommended because:
- You can commit the skills to your repo so team members get them automatically
- Different projects can use different versions
- No global side effects

### Global

```bash
curl -fsSL https://raw.githubusercontent.com/peopleforrester/Brain_spec_skills_claude/main/install.sh | bash -s -- --global
```

Installs to `~/.claude/skills/`. Skills are available in every Claude Code project. Use this if you want Brain Spec everywhere without per-project setup.

If both global and per-project skills exist, per-project takes precedence.

## Team Sharing

To share Brain Spec Skills with your team, commit the skills to your repo:

```bash
# Install skills
curl -fsSL https://raw.githubusercontent.com/peopleforrester/Brain_spec_skills_claude/main/install.sh | bash

# Commit them
git add .claude/skills/brain-*
git commit -m "Add Brain Spec Skills for spec-driven development"
git push
```

Team members who clone the repo will have the skills immediately -- no separate install step.

### Sharing Brain Spec Data

You can also commit `.brain-spec/` to share specs and tasks:

```bash
git add .brain-spec/
git commit -m "Add project specs and task tracking"
```

Or add it to `.gitignore` for personal use:

```
# .gitignore
.brain-spec/
```

## Version Management

### Checking Your Version

```bash
cat .claude/skills/brain-init/VERSION 2>/dev/null || echo "pre-1.0"
```

Or from within Claude Code:

```
/brain-status
```

The dashboard header shows the installed version.

### Updating

Re-run the install command. It detects the existing installation and overwrites:

```bash
curl -fsSL https://raw.githubusercontent.com/peopleforrester/Brain_spec_skills_claude/main/install.sh | bash
```

Output for an update:

```
Installing Brain Spec Skills to .claude/skills
  Existing installation detected: v1.0.0
Fetching latest skills...
  Installed: brain-init
  Installed: brain-spec
  Installed: brain-task
  Installed: brain-status

Brain Spec Skills updated: v1.0.0 -> v1.1.0 (4 skills)
```

### Pinning a Version

To pin a specific version, clone the repo at a tag:

```bash
git clone --depth 1 --branch v1.0.0 https://github.com/peopleforrester/Brain_spec_skills_claude.git /tmp/brain-spec
cp -r /tmp/brain-spec/.claude/skills/brain-* .claude/skills/
rm -rf /tmp/brain-spec
```

## Customizing Skills

SKILL.md files are plain markdown. You can edit them to customize behavior.

### Safe Customizations

These changes work well and do not break compatibility:

- **Add questions to the interview bank** -- edit the question bank in `brain-spec/SKILL.md` to include domain-specific questions
- **Change CLAUDE.md templates** -- edit the templates in `brain-init/SKILL.md` to match your team's conventions
- **Modify steering templates** -- edit the product/tech/structure templates in `brain-init/SKILL.md`
- **Change progress bar characters** -- edit the display format in `brain-task/SKILL.md`
- **Adjust coverage threshold** -- change the 60% threshold in `brain-spec/SKILL.md`

### Things to Avoid

- Do not change the JSON schema structures -- this breaks existing `.brain-spec/` data
- Do not rename subcommands -- other documentation references them
- Do not remove the slug rules section -- it ensures consistent file naming

### Keeping Custom Changes Through Updates

If you customize a skill, the next `install.sh` run will overwrite your changes. To preserve customizations:

1. Make your edits
2. Commit the skill files to your repo
3. When updating, compare before overwriting:
   ```bash
   # See what changed upstream
   diff .claude/skills/brain-spec/SKILL.md /tmp/brain-spec/.claude/skills/brain-spec/SKILL.md
   ```

## Creating New Skills

You can add a 5th (or 6th, ...) skill that follows the same patterns.

### Skill File Structure

Create `.claude/skills/your-skill-name/SKILL.md`:

```markdown
# Your Skill Name -- Brief Description

One paragraph describing what this skill does.

## Usage

/your-skill-name [arguments]

## Instructions

### Step 1: Do Something

Describe what Claude should do. Reference Claude Code tools:
- Use Glob to find files
- Use Read to read file contents
- Use Write to create files
- Use Edit to modify files
- Use Bash for shell commands
- Ask the user questions and wait for their response for interactive prompts

### Step 2: Do Something Else

Continue with instructions...
```

### Integration with Brain Spec

If your skill reads or writes `.brain-spec/` data, follow these conventions:

- Read `config.json` for directory paths -- do not hardcode them
- Use the same slug rules for naming
- Use ISO 8601 timestamps
- Follow the existing JSON schema patterns

### Example: Custom Report Skill

```markdown
# Brain Report -- Generate Spec Summary Report

Generate a markdown report summarizing all active specs and their progress.

## Usage

/brain-report [--output <path>]

## Instructions

### Step 1: Read Workspace

Use Glob to find all .brain-spec/specs/*.meta.json files. Read each one.
For each spec, also read .brain-spec/tasks/{slug}/tasks.json if it exists.

### Step 2: Generate Report

Build a markdown report with:
- Date generated
- Table of all specs with status and completion percentage
- For each spec: summary of pending tasks
- Overall statistics

### Step 3: Write Output

If --output is provided, write the report to that path.
Otherwise, display the report directly.
```

## Integration with Other Claude Code Features

### CLAUDE.md

Brain Spec's `/brain-init` can generate a CLAUDE.md for your project. This file is read by Claude Code at the start of every conversation and provides project context. Brain Spec does not modify an existing CLAUDE.md unless you explicitly run `/brain-init` and choose to generate one.

### Agents

Claude Code agents (defined in `.claude/agents/`) can reference Brain Spec commands. For example, a "planning agent" could be instructed to always start with `/brain-status` and then work through pending tasks.

### Hooks

Claude Code hooks (configured in `.claude/settings.json`) run shell commands in response to events. You could configure a hook that runs after every commit to check if any Brain Spec tasks should be updated.
