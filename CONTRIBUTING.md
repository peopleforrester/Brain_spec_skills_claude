# Contributing to Brain Spec Skills

Thanks for your interest. This project ships pure-markdown skills with no
runtime, so most contributions are doc edits, schema changes inside SKILL.md
files, or test additions.

## Branch Workflow

This repo uses a `staging` → `main` flow. Every change lands on `staging`
first, runs through CI (and, where applicable, a real-world dogfooding pass),
and only then merges into `main`.

1. Branch off `staging`: `git checkout staging && git pull origin staging`
2. Make your changes (see TDD below).
3. Open a PR against `staging`. CI runs `tests/run-tests.sh`, verifies
   checksums, and lints shell with `shellcheck`.
4. After review and a green build, the maintainer merges `staging` → `main`.

Direct pushes to `main` are blocked. Don't bypass `staging`, even for "trivial"
fixes — the test suite is fast.

## Development Setup

No build step or dependency install. You only need:

- `bash` 4+
- `git`
- `shellcheck` (for local linting; CI also runs it)

## Test-Driven Development

The expected loop is:

1. **Write a failing test** in `tests/test_*.sh`. Use the assertion helpers
   exported by `tests/run-tests.sh` (`assert_equals`, `assert_contains`,
   `assert_file_exists`, `assert_match`, etc.).
2. Run `bash tests/run-tests.sh` and confirm the new test fails for the
   expected reason.
3. Implement the change.
4. Re-run `bash tests/run-tests.sh` and confirm everything passes.
5. Update `CHANGELOG.md` under the most recent unreleased section (or open a
   new one if the current top entry is shipped).

The CI workflow runs the same script, so a green local run is a strong
signal you'll pass CI.

## Modifying Skill Files

Skill behavior lives in `.claude/skills/<skill>/SKILL.md`. When you change one:

1. Bump the relevant `VERSION` files if the change is user-facing. The root
   `VERSION` and the four `.claude/skills/*/VERSION` files all stay in sync
   (`tests/test_docs.sh::test_skill_versions_match_root` enforces this).
2. Add a `CHANGELOG.md` entry. The top-most `## [x.y.z]` heading must match
   the root `VERSION` file (`test_version_matches_changelog`).
3. **Regenerate `checksums.txt`**:

   ```bash
   sha256sum install.sh \
     .claude/skills/brain-init/SKILL.md \
     .claude/skills/brain-spec/SKILL.md \
     .claude/skills/brain-status/SKILL.md \
     .claude/skills/brain-task/SKILL.md > checksums.txt
   ```

   CI runs `sha256sum -c checksums.txt`; any drift fails the build.

## Frontmatter Conventions

- `name:` and `description:` are required on every skill.
- `allowed-tools:` is a **comma-separated** list (e.g. `Read, Write, Bash`),
  not space-separated. A space-separated value parses as a single string,
  which silently disables the allowlist.
- `context: fork` only on `brain-status`. Do not add it to other skills
  unless you genuinely need to isolate the skill output from the main
  conversation context.

## Style

- Bash scripts: `set -euo pipefail`, `[[ ]]` for tests, quoted expansions,
  `local` inside functions.
- Match the surrounding indent (4 spaces in shell, 2 in YAML/JSON).
- Two-line `ABOUTME:` comment block at the top of every code file.

## Reporting Issues

Open a GitHub issue with: what you expected, what happened, the version
(`cat VERSION`), and the full output if a skill misbehaved. For security
issues, email the maintainer rather than filing publicly.
