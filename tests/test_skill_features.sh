#!/usr/bin/env bash
# ABOUTME: Tests for April 2026 skill features: variable substitutions, hooks, plugin manifest.
# ABOUTME: Validates adoption of CLAUDE_SKILL_DIR, CLAUDE_SESSION_ID, skill hooks, and plugin format.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILLS_DIR="$REPO_ROOT/.claude/skills"

# --- Tests for variable substitutions ---

test_brain_task_uses_session_id() {
    local content
    content=$(cat "$SKILLS_DIR/brain-task/SKILL.md")
    assert_contains "$content" 'CLAUDE_SESSION_ID' \
        "brain-task should reference CLAUDE_SESSION_ID for log enrichment"
}

test_brain_status_uses_skill_dir() {
    local content
    content=$(cat "$SKILLS_DIR/brain-status/SKILL.md")
    assert_contains "$content" 'CLAUDE_SKILL_DIR' \
        "brain-status should reference CLAUDE_SKILL_DIR for version detection"
}

# --- Tests for skill-scoped hooks ---

test_brain_init_has_hooks_field() {
    local frontmatter
    frontmatter=$(sed -n '2,/^---$/p' "$SKILLS_DIR/brain-init/SKILL.md" | head -n -1)
    assert_contains "$frontmatter" "hooks:" \
        "brain-init should have hooks field in frontmatter"
}

# --- Tests for plugin manifest ---

test_plugin_manifest_exists() {
    assert_file_exists "$REPO_ROOT/.claude-plugin/plugin.json" \
        "plugin manifest should exist at .claude-plugin/plugin.json"
}

test_plugin_manifest_has_name() {
    local content
    content=$(cat "$REPO_ROOT/.claude-plugin/plugin.json")
    assert_contains "$content" '"name"' "plugin manifest should have name"
}

test_plugin_manifest_has_version() {
    local content
    content=$(cat "$REPO_ROOT/.claude-plugin/plugin.json")
    assert_contains "$content" '"version"' "plugin manifest should have version"
}

test_plugin_manifest_has_skills() {
    local content
    content=$(cat "$REPO_ROOT/.claude-plugin/plugin.json")
    assert_contains "$content" "brain-init" "plugin manifest should list brain-init"
    assert_contains "$content" "brain-spec" "plugin manifest should list brain-spec"
    assert_contains "$content" "brain-task" "plugin manifest should list brain-task"
    assert_contains "$content" "brain-status" "plugin manifest should list brain-status"
}

# --- Tests for CI workflow ---

test_ci_workflow_exists() {
    assert_file_exists "$REPO_ROOT/.github/workflows/test.yml" \
        "CI workflow should exist at .github/workflows/test.yml"
}

test_ci_workflow_runs_test_suite() {
    local content
    content=$(cat "$REPO_ROOT/.github/workflows/test.yml" 2>/dev/null || echo "")
    assert_contains "$content" "tests/run-tests.sh" \
        "CI workflow should run tests/run-tests.sh"
}

test_ci_workflow_triggers_on_push_and_pr() {
    local content
    content=$(cat "$REPO_ROOT/.github/workflows/test.yml" 2>/dev/null || echo "")
    assert_contains "$content" "push:" "CI workflow should trigger on push"
    assert_contains "$content" "pull_request:" "CI workflow should trigger on pull_request"
}

# --- Tests for brain-task log git auto-detection (H3) ---

test_ci_workflow_runs_shellcheck() {
    local content
    content=$(cat "$REPO_ROOT/.github/workflows/test.yml" 2>/dev/null || echo "")
    assert_contains "$content" "shellcheck" \
        "CI workflow should run shellcheck against shell scripts"
}

test_ci_checkout_action_runs_on_supported_node() {
    # actions/checkout v4 runs on Node 20 (deprecated by GitHub ~June 2026);
    # v5+ runs on Node 24. Pin to a full SHA and keep the version comment at
    # v5 or newer so we never silently regress to a deprecated runtime.
    local content
    content=$(cat "$REPO_ROOT/.github/workflows/test.yml" 2>/dev/null || echo "")
    assert_contains "$content" "actions/checkout@" \
        "CI workflow should use actions/checkout"
    assert_not_contains "$content" "# v4" \
        "actions/checkout must not be pinned to deprecated v4 (Node 20); use v5+ (Node 24)"
    assert_match 'actions/checkout@[0-9a-f]{40} # v[56]' "$content" \
        "actions/checkout should pin a full SHA with a v5/v6 version comment"
}

test_brain_task_log_branches_on_working_tree() {
    # Step 4 must document both clean and dirty working-tree paths so the
    # auto-detection produces the right diff range / timestamp in each case.
    local content
    content=$(cat "$SKILLS_DIR/brain-task/SKILL.md")
    assert_contains "$content" "git status --porcelain" \
        "brain-task log should branch on git status --porcelain (dirty vs clean)"
    assert_contains "$content" "HEAD~1..HEAD" \
        "brain-task log should reference HEAD~1..HEAD diff range for clean tree"
}
