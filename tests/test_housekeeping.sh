#!/usr/bin/env bash
# ABOUTME: Tests for housekeeping items: .editorconfig, ABOUTME comments, config defaults.
# ABOUTME: Validates project hygiene standards are met across all deliverable files.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILLS_DIR="$REPO_ROOT/.claude/skills"

# --- Tests ---

test_editorconfig_exists() {
    assert_file_exists "$REPO_ROOT/.editorconfig" ".editorconfig should exist"
}

test_editorconfig_has_markdown_rules() {
    local content
    content=$(cat "$REPO_ROOT/.editorconfig")
    assert_contains "$content" "[*.md]" "should have markdown section"
}

test_editorconfig_has_shell_rules() {
    local content
    content=$(cat "$REPO_ROOT/.editorconfig")
    assert_contains "$content" "[*.sh]" "should have shell section"
}

test_skill_files_have_aboutme() {
    local skill
    for skill in brain-init brain-spec brain-task brain-status; do
        local file="$SKILLS_DIR/$skill/SKILL.md"
        local content
        content=$(cat "$file")
        assert_contains "$content" "ABOUTME:" "$skill/SKILL.md should have ABOUTME comment"
    done
}

test_install_script_has_aboutme() {
    local content
    content=$(head -5 "$REPO_ROOT/install.sh")
    assert_contains "$content" "ABOUTME:" "install.sh should have ABOUTME comment"
}

test_config_template_no_dead_defaults() {
    # The config template in brain-init should not have unenforced defaults
    local content
    content=$(cat "$SKILLS_DIR/brain-init/SKILL.md")
    assert_not_contains "$content" "maxTasksPerSpec" "config should not have unenforced maxTasksPerSpec"
    assert_not_contains "$content" "staleThresholdDays" "config should not have unenforced staleThresholdDays"
}

test_architecture_config_no_dead_defaults() {
    local content
    content=$(cat "$REPO_ROOT/docs/ARCHITECTURE.md")
    assert_not_contains "$content" "maxTasksPerSpec" "architecture doc should not have unenforced maxTasksPerSpec"
    assert_not_contains "$content" "staleThresholdDays" "architecture doc should not have unenforced staleThresholdDays"
}
