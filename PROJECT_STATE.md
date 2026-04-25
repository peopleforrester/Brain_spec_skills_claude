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

## Phase B — Sprint items (PENDING)

- [ ] Add GitHub Actions workflow `.github/workflows/test.yml` running `tests/run-tests.sh`
- [ ] Fix H3: branch brain-task log step 4 logic on dirty vs clean working tree

## Phase C — Polish (PENDING)

- [ ] README badges (CI status, license, version)
- [ ] CONTRIBUTING.md documenting staging→main workflow and how to regenerate checksums
- [ ] shellcheck enforcement in CI (M2/L2)
- [ ] install.sh tag pinning support (`--version v1.1.1`) (M2)

## Branch / Test Status

- Branch: `staging`
- Tests: 57/57 passing locally
- Last commit: TBD after Phase A commit
- Remote: not yet pushed for this round
