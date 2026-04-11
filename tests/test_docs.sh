#!/usr/bin/env bash
# ABOUTME: Documentation link checker and consistency tests.
# ABOUTME: Validates cross-references between docs, checks for broken links, and verifies format consistency.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS_DIR="$REPO_ROOT/docs"

# --- Tests ---

test_readme_links_resolve() {
    local readme="$REPO_ROOT/README.md"
    local links
    # Extract markdown links like [text](path)
    links=$(grep -oP '\[.*?\]\(\K[^)]+' "$readme" | grep -v '^http' || true)

    while IFS= read -r link; do
        [[ -z "$link" ]] && continue
        local target="$REPO_ROOT/$link"
        if [[ ! -f "$target" && ! -d "$target" ]]; then
            TEST_FAILURES="${TEST_FAILURES}    FAIL: README link broken: $link\n"
        fi
    done <<< "$links"
    [[ -z "$TEST_FAILURES" ]] || return 1
    return 0
}

test_quickstart_links_resolve() {
    local doc="$DOCS_DIR/QUICKSTART.md"
    local links
    links=$(grep -oP '\[.*?\]\(\K[^)]+' "$doc" | grep -v '^http' || true)

    while IFS= read -r link; do
        [[ -z "$link" ]] && continue
        # Resolve relative to docs/ directory
        local target="$DOCS_DIR/$link"
        if [[ ! -f "$target" && ! -d "$target" ]]; then
            TEST_FAILURES="${TEST_FAILURES}    FAIL: QUICKSTART link broken: $link (resolved to $target)\n"
        fi
    done <<< "$links"
    [[ -z "$TEST_FAILURES" ]] || return 1
    return 0
}

test_dashboard_format_consistent_with_skill() {
    # Docs should use Unicode box-drawing, matching brain-status SKILL.md
    local skill_file="$REPO_ROOT/.claude/skills/brain-status/SKILL.md"
    local skill_content
    skill_content=$(cat "$skill_file")

    # Verify skill uses Unicode format
    assert_contains "$skill_content" "╔" "skill should use Unicode box top-left"
    assert_contains "$skill_content" "╚" "skill should use Unicode box bottom-left"

    # Check docs match
    for doc in QUICKSTART.md SKILLS-REFERENCE.md; do
        local doc_content
        doc_content=$(cat "$DOCS_DIR/$doc")
        assert_contains "$doc_content" "╔" "$doc should use Unicode box top-left"
        assert_contains "$doc_content" "╚" "$doc should use Unicode box bottom-left"
        assert_not_contains "$doc_content" "+======" "$doc should not use ASCII box format"
    done
}

test_docs_no_askuserquestion() {
    for doc in "$DOCS_DIR"/*.md; do
        local basename
        basename=$(basename "$doc")
        local content
        content=$(cat "$doc")
        assert_not_contains "$content" "AskUserQuestion" "$basename should not reference AskUserQuestion"
    done
}

test_spec_md_moved_to_legacy() {
    # SPEC.md should not be in repo root
    if [[ -f "$REPO_ROOT/SPEC.md" ]]; then
        TEST_FAILURES="${TEST_FAILURES}    FAIL: SPEC.md should be in docs/legacy/, not repo root\n"
        return 1
    fi
    assert_file_exists "$REPO_ROOT/docs/legacy/SPEC.md" "SPEC.md should be in docs/legacy/"
}

test_readme_references_legacy_spec() {
    local readme
    readme=$(cat "$REPO_ROOT/README.md")
    assert_contains "$readme" "docs/legacy/SPEC.md" "README should reference SPEC.md in docs/legacy/"
}

test_changelog_exists() {
    assert_file_exists "$REPO_ROOT/CHANGELOG.md" "CHANGELOG.md should exist"
}

test_license_exists() {
    assert_file_exists "$REPO_ROOT/LICENSE" "LICENSE should exist"
}

test_checksums_file_exists() {
    assert_file_exists "$REPO_ROOT/checksums.txt" "checksums.txt should exist"
}

test_checksums_covers_install_script() {
    local content
    content=$(cat "$REPO_ROOT/checksums.txt")
    assert_contains "$content" "install.sh" "checksums.txt should cover install.sh"
}

test_checksums_covers_all_skills() {
    local content
    content=$(cat "$REPO_ROOT/checksums.txt")
    assert_contains "$content" "brain-init/SKILL.md" "checksums should cover brain-init"
    assert_contains "$content" "brain-spec/SKILL.md" "checksums should cover brain-spec"
    assert_contains "$content" "brain-task/SKILL.md" "checksums should cover brain-task"
    assert_contains "$content" "brain-status/SKILL.md" "checksums should cover brain-status"
}

test_checksums_match_actual_files() {
    # Verify checksums.txt hashes match current file contents
    local result
    result=$(cd "$REPO_ROOT" && sha256sum -c checksums.txt 2>&1) || {
        TEST_FAILURES="${TEST_FAILURES}    FAIL: checksums.txt hashes do not match files\n      $result\n"
        return 1
    }
    return 0
}

test_changelog_not_stale() {
    # CHANGELOG should reference work done in recent commits
    local content
    content=$(cat "$REPO_ROOT/CHANGELOG.md")
    # Must document the senior review remediation and April 2026 update
    assert_contains "$content" "frontmatter" "CHANGELOG should document frontmatter changes"
    assert_contains "$content" "test suite" "CHANGELOG should document test suite addition"
}

test_no_stray_session_files() {
    # Session archive files should not be tracked in repo root
    local found
    found=$(find "$REPO_ROOT" -maxdepth 1 -name 'session_*.md' -type f 2>/dev/null || true)
    if [[ -n "$found" ]]; then
        TEST_FAILURES="${TEST_FAILURES}    FAIL: stray session file(s) in repo root: $found\n"
        return 1
    fi
    return 0
}
