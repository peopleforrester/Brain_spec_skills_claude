#!/usr/bin/env bash
# ABOUTME: Validates schema consistency across all SKILL.md files.
# ABOUTME: Checks slug rules, meta schema fields, archive schema, and ID generation match everywhere.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILLS_DIR="$REPO_ROOT/.claude/skills"

# --- Tests ---

test_all_skills_have_frontmatter() {
    local skill
    for skill in brain-init brain-spec brain-task brain-status; do
        local file="$SKILLS_DIR/$skill/SKILL.md"
        local first_line
        first_line=$(head -1 "$file")
        assert_equals "---" "$first_line" "$skill should start with YAML frontmatter delimiter"
    done
}

test_all_skills_have_name_field() {
    local skill
    for skill in brain-init brain-spec brain-task brain-status; do
        local file="$SKILLS_DIR/$skill/SKILL.md"
        local frontmatter
        frontmatter=$(sed -n '2,/^---$/p' "$file" | head -n -1)
        assert_contains "$frontmatter" "name:" "$skill should have name field in frontmatter"
    done
}

test_all_skills_have_description_field() {
    local skill
    for skill in brain-init brain-spec brain-task brain-status; do
        local file="$SKILLS_DIR/$skill/SKILL.md"
        local frontmatter
        frontmatter=$(sed -n '2,/^---$/p' "$file" | head -n -1)
        assert_contains "$frontmatter" "description:" "$skill should have description in frontmatter"
    done
}

test_brain_status_has_fork_context() {
    local file="$SKILLS_DIR/brain-status/SKILL.md"
    local frontmatter
    frontmatter=$(sed -n '2,/^---$/p' "$file" | head -n -1)
    assert_contains "$frontmatter" "context: fork" "brain-status should have context: fork in frontmatter"
}

test_slug_rules_consistent() {
    # brain-spec and brain-task both reference slug rules — verify they match
    local spec_slugs task_file
    spec_slugs=$(grep -A 6 "### Reference: Slug Rules" "$SKILLS_DIR/brain-spec/SKILL.md" || true)

    # brain-spec should define slug rules
    assert_contains "$spec_slugs" "Lowercase the name" "brain-spec should have lowercase rule"
    assert_contains "$spec_slugs" "non-alphanumeric" "brain-spec should have hyphen replacement rule"
    assert_contains "$spec_slugs" "100 characters" "brain-spec should have truncation rule"
}

test_slug_pattern_present() {
    local content
    content=$(cat "$SKILLS_DIR/brain-spec/SKILL.md")
    assert_contains "$content" '^[a-z0-9]' "should have slug validation pattern"
}

test_meta_schema_has_required_fields() {
    local content
    content=$(cat "$SKILLS_DIR/brain-spec/SKILL.md")
    assert_contains "$content" '"specSlug"' "meta schema should have specSlug"
    assert_contains "$content" '"name"' "meta schema should have name"
    assert_contains "$content" '"status"' "meta schema should have status"
    assert_contains "$content" '"interview"' "meta schema should have interview"
    assert_contains "$content" '"coverageMap"' "meta schema should have coverageMap"
}

test_archive_schema_has_required_fields() {
    local content
    content=$(cat "$SKILLS_DIR/brain-spec/SKILL.md")
    assert_contains "$content" '"archivedAt"' "archive schema should have archivedAt"
    assert_contains "$content" '"reason"' "archive schema should have reason"
    assert_contains "$content" '"supersededBy"' "archive schema should have supersededBy"
    assert_contains "$content" '"finalStatus"' "archive schema should have finalStatus"
}

test_task_schema_has_required_fields() {
    local content
    content=$(cat "$SKILLS_DIR/brain-task/SKILL.md")
    assert_contains "$content" '"id"' "task schema should have id"
    assert_contains "$content" '"title"' "task schema should have title"
    assert_contains "$content" '"status"' "task schema should have status"
    assert_contains "$content" '"parentTaskId"' "task schema should have parentTaskId"
    assert_contains "$content" '"progress"' "task schema should have progress"
}

test_id_generation_algorithm_documented() {
    local content
    content=$(cat "$SKILLS_DIR/brain-task/SKILL.md")
    assert_contains "$content" "ID Generation Algorithm" "should document ID generation"
    assert_contains "$content" "Top-level tasks" "should explain top-level ID format"
    assert_contains "$content" "Subtasks" "should explain subtask ID format"
}

test_coverage_categories_count() {
    # Verify 8 categories are listed in the coverage map
    local content
    content=$(cat "$SKILLS_DIR/brain-spec/SKILL.md")
    assert_contains "$content" '"functional"' "should have functional category"
    assert_contains "$content" '"technical"' "should have technical category"
    assert_contains "$content" '"data-model"' "should have data-model category"
    assert_contains "$content" '"edge-cases"' "should have edge-cases category"
    assert_contains "$content" '"security"' "should have security category"
    assert_contains "$content" '"testing"' "should have testing category"
    assert_contains "$content" '"nonfunctional"' "should have nonfunctional category"
    assert_contains "$content" '"implementation"' "should have implementation category"
}

test_progress_bar_format_consistent() {
    # All skills that show progress bars should use the same characters
    local status_content task_content

    status_content=$(cat "$SKILLS_DIR/brain-status/SKILL.md")
    task_content=$(cat "$SKILLS_DIR/brain-task/SKILL.md")

    # Both should reference ━ (filled) and ─ (empty)
    assert_contains "$status_content" "━" "brain-status should use ━ for filled progress"
    assert_contains "$status_content" "─" "brain-status should use ─ for empty progress"
    assert_contains "$task_content" "━" "brain-task should use ━ for filled progress"
    assert_contains "$task_content" "─" "brain-task should use ─ for empty progress"

    # Neither should use █ or ░ (old format)
    # Check only in the instruction/format sections, not in arbitrary text
    local task_list_section
    task_list_section=$(sed -n '/Progress bar:/p' "$SKILLS_DIR/brain-task/SKILL.md")
    assert_not_contains "$task_list_section" "█" "brain-task progress bar spec should not use █"
    assert_not_contains "$task_list_section" "░" "brain-task progress bar spec should not use ░"
}

test_no_askuserquestion_in_skills() {
    local skill
    for skill in brain-init brain-spec brain-task brain-status; do
        local file="$SKILLS_DIR/$skill/SKILL.md"
        local content
        content=$(cat "$file")
        assert_not_contains "$content" "AskUserQuestion" "$skill should not reference AskUserQuestion"
    done
}

test_all_skills_have_version_files() {
    local skill
    for skill in brain-init brain-spec brain-task brain-status; do
        assert_file_exists "$SKILLS_DIR/$skill/VERSION" "$skill should have VERSION file"
    done
}
