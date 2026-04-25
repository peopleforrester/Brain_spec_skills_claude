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
