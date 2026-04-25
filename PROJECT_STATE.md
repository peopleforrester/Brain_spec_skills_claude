# PROJECT_STATE — Senior Review (April 2026) Remediation

## Status: Phase A complete (in progress: B, C)

Two senior reviews have been executed. The first (March 2026) shipped as v1.1.0
(see CHANGELOG). A follow-up review on 2026-04-24 found stale artifacts,
version drift, and frontmatter issues that this round resolves.

## Verification Method

Bash test suite (`tests/run-tests.sh`) — 57 tests across 5 files. All assertions
read source-of-truth files, not summary docs. CI not yet wired (Phase B).

## Phase A — Critical/High senior-review fixes (DONE)

- [x] Deleted stray `SPEC.md` and `session_*.md` from repo root
- [x] Bumped `VERSION` (root + all 4 skills) to `1.1.1`
- [x] `allowed-tools` frontmatter on all 4 skills converted to comma-separated YAML
- [x] `hooks:` field added to brain-init frontmatter
- [x] brain-status uses `${CLAUDE_SKILL_DIR}` for runtime version detection
- [x] brain-task references `${CLAUDE_SESSION_ID}` in implementation log template
- [x] `.claude-plugin/plugin.json` manifest created
- [x] Removed phantom `AskUserQuestion` reference from `.brain-spec/steering/tech.md`
- [x] Regenerated `checksums.txt`
- [x] Updated CHANGELOG with `[1.1.1]` entry
- [x] Updated dashboard version examples in QUICKSTART/SKILLS-REFERENCE to v1.1.1
- [x] PROJECT_STATE.md updated (this file)

## Phase B — Sprint items (DONE)

- [x] GitHub Actions workflow `.github/workflows/test.yml` runs `tests/run-tests.sh` + checksum verify on push/PR
- [x] H3: brain-task log step 4 now branches on `git status --porcelain` (dirty vs clean tree)

## Phase C — Polish (DONE)

- [x] README badges (CI status, version, license)
- [x] `CONTRIBUTING.md` documenting staging→main workflow and checksum regen command
- [x] shellcheck enforcement in CI (M2/L2)
- [x] `install.sh --version <tag>` for release pinning (M2)
- [x] Replaced `cat file | tr` UUOC in install.sh with redirected input

## Branch / Test Status

- Branch: `staging` and `main` are in sync (1.1.1 shipped)
- Tests: 67/67 passing locally and on GitHub Actions (run 24942665928 staging, 24942680231 main)
- shellcheck (`--severity=warning`) and checksum verification both pass in CI
- Action pinned to SHA, `GITHUB_TOKEN` scoped `contents: read`
- Note: GitHub deprecation warning about Node 20 will require updating `actions/checkout@v4.2.2` to a v5 release before June 2026 — minor follow-up
