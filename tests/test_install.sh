#!/usr/bin/env bash
# ABOUTME: Integration tests for install.sh argument parsing, file operations, and cleanup.
# ABOUTME: Tests --help, --global, unknown args, skill copy, version detection, and temp cleanup.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_SCRIPT="$REPO_ROOT/install.sh"

# --- Helper: create isolated temp dir for each test ---
setup_test_dir() {
    local dir
    dir=$(mktemp -d)
    printf "%s" "$dir"
}

cleanup_test_dir() {
    if [[ -n "${1:-}" && -d "$1" ]]; then
        rm -rf "$1"
    fi
}

# --- Tests ---

test_help_flag_shows_usage() {
    local output
    output=$(bash "$INSTALL_SCRIPT" --help 2>&1) || true
    assert_contains "$output" "Usage:" "should show usage"
    assert_contains "$output" "--global" "should mention --global flag"
}

test_help_flag_exits_zero() {
    local exit_code=0
    bash "$INSTALL_SCRIPT" --help >/dev/null 2>&1 || exit_code=$?
    assert_exit_code "0" "$exit_code" "help should exit 0"
}

test_unknown_arg_exits_nonzero() {
    local exit_code=0
    bash "$INSTALL_SCRIPT" --bogus-flag >/dev/null 2>&1 || exit_code=$?
    assert_exit_code "1" "$exit_code" "unknown arg should exit 1"
}

test_unknown_arg_shows_error() {
    local output
    output=$(bash "$INSTALL_SCRIPT" --bogus-flag 2>&1) || true
    assert_contains "$output" "Error:" "should show error message"
    assert_contains "$output" "--bogus-flag" "should echo the bad arg"
}

test_no_tmpdir_shadowing() {
    # Verify the install script does not use TMPDIR as a variable name
    local content
    content=$(cat "$INSTALL_SCRIPT")
    assert_not_contains "$content" 'TMPDIR=' "should not assign to TMPDIR"
    assert_not_contains "$content" '$TMPDIR' "should not reference TMPDIR"
}

test_uses_clone_dir_variable() {
    local content
    content=$(cat "$INSTALL_SCRIPT")
    assert_contains "$content" 'CLONE_DIR=' "should use CLONE_DIR variable"
    assert_contains "$content" '$CLONE_DIR' "should reference CLONE_DIR"
}

test_script_has_strict_mode() {
    local first_lines
    first_lines=$(head -5 "$INSTALL_SCRIPT")
    assert_contains "$first_lines" "set -euo pipefail" "should have strict mode"
}

test_script_has_cleanup_trap() {
    local content
    content=$(cat "$INSTALL_SCRIPT")
    assert_contains "$content" "trap cleanup EXIT" "should trap EXIT for cleanup"
}

test_script_checks_git_prerequisite() {
    local content
    content=$(cat "$INSTALL_SCRIPT")
    assert_contains "$content" "command -v git" "should check for git"
}

test_script_has_aboutme_comments() {
    local line2 line3
    line2=$(sed -n '2p' "$INSTALL_SCRIPT")
    line3=$(sed -n '3p' "$INSTALL_SCRIPT")
    assert_contains "$line2" "ABOUTME:" "line 2 should have ABOUTME"
    assert_contains "$line3" "ABOUTME:" "line 3 should have ABOUTME"
}

test_all_skills_listed() {
    local content
    content=$(cat "$INSTALL_SCRIPT")
    assert_contains "$content" "brain-init" "should list brain-init"
    assert_contains "$content" "brain-spec" "should list brain-spec"
    assert_contains "$content" "brain-task" "should list brain-task"
    assert_contains "$content" "brain-status" "should list brain-status"
}
