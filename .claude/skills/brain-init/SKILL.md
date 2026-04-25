---
name: brain-init
description: Initialize a .brain-spec/ workspace with directory tree, config, steering documents, and optional CLAUDE.md generation.
allowed-tools: Glob, Read, Write, Bash
hooks:
  SessionStart:
    - command: 'test -f .brain-spec/config.json || true'
      once: true
---
<!-- ABOUTME: Skill instructions for /brain-init slash command. -->
<!-- ABOUTME: Creates .brain-spec/ workspace, config, steering docs, and optional project CLAUDE.md. -->

# Brain Init — Project Setup

Initialize a `.brain-spec/` workspace in the current project. Creates the directory tree, config file, steering documents, and optionally generates a CLAUDE.md.

## Usage

```
/brain-init
```

No arguments required. The skill uses interactive prompts to gather project context.

## Instructions

### Step 1: Check for Existing Workspace

Use the Glob tool to check if `.brain-spec/config.json` already exists.

- If it exists, read it and tell the user: "Brain Spec workspace already initialized. Current config:" followed by the config contents. Ask if they want to reinitialize (which will overwrite config but preserve existing specs).
- If it does not exist, proceed to Step 2.

### Step 2: Create Directory Tree

Create the following directories using Bash `mkdir -p`:

```
.brain-spec/
  specs/
  tasks/
  steering/
  archive/
```

### Step 3: Write Config File

Write `.brain-spec/config.json` with this content:

```json
{
  "version": "1.0.0",
  "paths": {
    "specs": ".brain-spec/specs",
    "tasks": ".brain-spec/tasks",
    "steering": ".brain-spec/steering",
    "archive": ".brain-spec/archive"
  }
}
```

### Step 4: Create Steering Documents

Ask the user about each steering document. For each one (product, tech, structure), present these choices and wait for their response:
1. Create it now with guided content
2. Create it with the template (to fill in later)
3. Skip it for now

**Product steering template** — write to `.brain-spec/steering/product.md`:
```markdown
# Product Steering

## Vision
TODO: One-paragraph vision statement.

## Target Audience
- TODO: Persona 1

## Core Features
1. TODO: Feature description and value proposition

## Success Metrics
- TODO: Metric and target value

## Out of Scope
- TODO: Items explicitly excluded
```

**Tech steering template** — write to `.brain-spec/steering/tech.md`:
```markdown
# Technical Steering

## Architecture Pattern
TODO: Monolith, microservices, etc.

## Technology Stack
- Language: TODO
- Framework: TODO
- Database: TODO

## Performance Requirements
- Response time: TODO
- Throughput: TODO

## Security Architecture
- Authentication: TODO
- Authorization: TODO

## Constraints
- TODO: Must run on X, cannot use Y
```

**Structure steering template** — write to `.brain-spec/steering/structure.md`:
```markdown
# Structure Steering

## Directory Organization
TODO: Describe project directory layout

## Naming Conventions
- Files: snake_case
- Classes: PascalCase
- Functions: camelCase
- Constants: UPPER_CASE

## Module Boundaries
- TODO: Module and responsibility

## Development Guidelines
- TODO: Key development patterns
```

If the user chooses "Create with guided content", ask them specific questions about that document and write their answers into the template sections.

### Step 5: Auto-Detect Stack and Generate CLAUDE.md

Ask the user if they want to generate a CLAUDE.md file. If yes:

1. Auto-detect the project stack by checking for these files using Glob:
   - `package.json` → Node.js/TypeScript (read it to check for `typescript` in devDependencies)
   - `pyproject.toml` or `setup.py` → Python
   - `go.mod` → Go
   - `Cargo.toml` → Rust
   - `tsconfig.json` → TypeScript specifically

2. Ask the user which template to use. Present the following options and wait for their response:

   - **minimal** — Just build/test/lint commands and basic style notes
   - **standard** — Overview, tech stack, commands, style guide, testing, git workflow
   - **comprehensive** — Everything in standard plus writing rules, security guidelines
   - **typescript** — TypeScript-specific: strict mode, const preference, type imports, vitest
   - **python** — Python-specific: type hints, Google docstrings, snake_case, pytest

3. Fill in template variables by reading project files:
   - `projectName`: basename of the current directory
   - `description`: from steering docs if available, else "TODO"
   - `language`, `framework`, `packageManager`: from stack detection
   - `testCommand`, `buildCommand`, `lintCommand`: from package.json scripts or language defaults

4. Write the CLAUDE.md file. Use these templates:

**minimal**:
```markdown
# {{projectName}}

## Build/Run/Test Commands
- **Build**: `{{buildCommand}}`
- **Test**: `{{testCommand}}`
- **Lint**: `{{lintCommand}}`

## Code Style
- Follow existing patterns in the codebase
- Write clear, descriptive commit messages
```

**standard**:
```markdown
# {{projectName}}

## Project Overview
{{description}}

## Tech Stack
- **Language**: {{language}}
- **Framework**: {{framework}}
- **Package Manager**: {{packageManager}}

## Build/Run/Test Commands
- **Build**: `{{buildCommand}}`
- **Test**: `{{testCommand}}`
- **Lint**: `{{lintCommand}}`

## Code Style Guidelines
- All code files start with a 2-line ABOUTME comment
- Follow existing patterns in the codebase
- Prefer simple, clean, maintainable solutions
- Write clear, descriptive commit messages

## Testing
- Write tests for all new functionality
- Run tests before committing
- Maintain test coverage above 80%

## Git Workflow
- Use descriptive branch names
- Write conventional commit messages
- Keep commits atomic and focused
```

**comprehensive**:
```markdown
# {{projectName}}

## Project Overview
{{description}}

## Tech Stack
- **Language**: {{language}}
- **Framework**: {{framework}}
- **Package Manager**: {{packageManager}}

## Build/Run/Test Commands
- **Build**: `{{buildCommand}}`
- **Test**: `{{testCommand}}`
- **Lint**: `{{lintCommand}}`

## Code Style Guidelines
- All code files start with a 2-line ABOUTME comment
- Follow existing patterns in the codebase
- Prefer simple, clean, maintainable solutions
- Prioritize readability and maintainability
- Make the smallest reasonable changes necessary
- Match the style and formatting of surrounding code
- Write evergreen comments; avoid temporal references

## Writing Code
- NEVER implement mock modes. Use real data and APIs only.
- NEVER add fallback mechanisms without explicit permission.
- NEVER rewrite implementations without explicit permission.
- Ask for clarification rather than making assumptions.

## Testing
- Tests MUST cover implemented functionality
- Test output MUST be pristine to pass
- Write tests before implementation (TDD)
- Run tests before committing
- Maintain test coverage above 80%

## Git Workflow
- Work on feature branches
- Write conventional commit messages
- Keep commits atomic and focused
- Never push directly to main

## Security
- Never commit secrets or credentials
- Sanitize all user inputs
- Use parameterized queries for databases
```

**typescript**:
```markdown
# {{projectName}}

## Project Overview
{{description}}

## Tech Stack
- **Language**: TypeScript
- **Framework**: {{framework}}
- **Package Manager**: {{packageManager}}

## Build/Run/Test Commands
- **Build**: `{{buildCommand}}`
- **Test**: `{{testCommand}}`
- **Lint**: `{{lintCommand}}`
- **Type Check**: `npx tsc --noEmit`

## Code Style Guidelines
- All code files start with a 2-line ABOUTME comment
- Use strict TypeScript (`strict: true` in tsconfig)
- Prefer `const` over `let`, never use `var`
- Use explicit return types on exported functions
- Use `type` imports for type-only imports

## Testing
- Use vitest for testing
- Maintain 80%+ coverage
- Run `{{testCommand}}` before committing

## Git Workflow
- Use conventional commit messages
- Keep commits atomic and focused
```

**python**:
```markdown
# {{projectName}}

## Project Overview
{{description}}

## Tech Stack
- **Language**: Python 3.11+
- **Framework**: {{framework}}
- **Package Manager**: {{packageManager}}

## Build/Run/Test Commands
- **Test**: `{{testCommand}}`
- **Lint**: `{{lintCommand}}`
- **Type Check**: `mypy src/ --ignore-missing-imports`

## Code Style Guidelines
- All code files start with a 2-line ABOUTME comment
- Use type hints for all function signatures
- Use Google-style docstrings
- snake_case for functions/variables, PascalCase for classes
- 4-space indentation, 100 character line length

## Testing
- Write tests for all new functionality
- Use pytest as the test framework
- Maintain 80%+ coverage

## Git Workflow
- Use conventional commit messages
- Keep commits atomic and focused
```

### Step 6: Confirmation

After all steps complete, display a summary:

```
Brain Spec workspace initialized:
  .brain-spec/config.json     ✓
  .brain-spec/steering/        [list which docs were created]
  .brain-spec/specs/           (empty, ready for specs)
  .brain-spec/tasks/           (empty, ready for tasks)
  .brain-spec/archive/         (empty)
  CLAUDE.md                    [created / skipped]

Next steps:
  /brain-spec create <name>   — Create your first spec
  /brain-status               — View workspace overview
```
