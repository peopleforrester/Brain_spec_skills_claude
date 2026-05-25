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

## Phase D — Node 24 CI maintenance (2026-05-25, DONE)

- [x] Bumped `actions/checkout` v4.2.2 (Node 20, deprecated ~June 2026) → v6.0.2 (Node 24), pinned to full SHA `de0fac2e4500dabe0009e67214ff5f5447ce83dd`
- [x] Added regression test `test_ci_checkout_action_runs_on_supported_node` (rejects deprecated v4, requires v5/v6 SHA pin)
- [x] Corrected `plugin.json` homepage to `peopleforrester` owner; synced its version (was drifted at 1.1.0)
- [x] Patch bump to `1.1.2` across root + 4 skills + plugin.json + README badge + CHANGELOG

## Branch / Test Status

- Version: `1.1.2`
- Branch: `staging` and `main` in sync after this lands (1.1.2)
- Tests: 68/68 passing locally and shellcheck clean; CI re-verified after push
- Action pinned to SHA, `GITHUB_TOKEN` scoped `contents: read`
- v6.0.0's only substantive change (separate git-credentials file) is transparent for our plain default checkout
