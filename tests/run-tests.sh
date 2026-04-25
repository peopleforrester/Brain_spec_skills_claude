#!/usr/bin/env bash
# ABOUTME: Test runner for Brain Spec Skills. Discovers and runs all test_*.sh files.
# ABOUTME: Provides pass/fail counts, colored output, and exit code for CI integration.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- Colors (only if terminal) ---
if [[ -t 1 ]]; then
    GREEN='\033[0;32m'
    RED='\033[0;31m'
    YELLOW='\033[0;33m'
    BOLD='\033[1m'
    RESET='\033[0m'
else
    GREEN='' RED='' YELLOW='' BOLD='' RESET=''
fi

# --- Counters ---
TOTAL=0
PASSED=0
FAILED=0

# --- Test assertion functions (sourced by test files) ---
export TEST_CURRENT=""
export TEST_FAILURES=""

assert_equals() {
    local expected="$1"
    local actual="$2"
    local msg="${3:-assert_equals}"
    if [[ "$expected" != "$actual" ]]; then
        TEST_FAILURES="${TEST_FAILURES}    FAIL: ${msg}\n      expected: '${expected}'\n      actual:   '${actual}'\n"
        return 1
    fi
    return 0
}

assert_contains() {
    local haystack="$1"
    local needle="$2"
    local msg="${3:-assert_contains}"
    if [[ "$haystack" != *"$needle"* ]]; then
        TEST_FAILURES="${TEST_FAILURES}    FAIL: ${msg}\n      expected to contain: '${needle}'\n      in: '${haystack}'\n"
        return 1
    fi
    return 0
}

assert_not_contains() {
    local haystack="$1"
    local needle="$2"
    local msg="${3:-assert_not_contains}"
    if [[ "$haystack" == *"$needle"* ]]; then
        TEST_FAILURES="${TEST_FAILURES}    FAIL: ${msg}\n      expected NOT to contain: '${needle}'\n      in: '${haystack}'\n"
        return 1
    fi
    return 0
}

assert_file_exists() {
    local filepath="$1"
    local msg="${2:-assert_file_exists}"
    if [[ ! -f "$filepath" ]]; then
        TEST_FAILURES="${TEST_FAILURES}    FAIL: ${msg}\n      file not found: '${filepath}'\n"
        return 1
    fi
    return 0
}

assert_dir_exists() {
    local dirpath="$1"
    local msg="${2:-assert_dir_exists}"
    if [[ ! -d "$dirpath" ]]; then
        TEST_FAILURES="${TEST_FAILURES}    FAIL: ${msg}\n      directory not found: '${dirpath}'\n"
        return 1
    fi
    return 0
}

assert_exit_code() {
    local expected="$1"
    local actual="$2"
    local msg="${3:-assert_exit_code}"
    if [[ "$expected" != "$actual" ]]; then
        TEST_FAILURES="${TEST_FAILURES}    FAIL: ${msg}\n      expected exit code: ${expected}\n      actual exit code:   ${actual}\n"
        return 1
    fi
    return 0
}

assert_match() {
    local pattern="$1"
    local actual="$2"
    local msg="${3:-assert_match}"
    if ! [[ "$actual" =~ $pattern ]]; then
        TEST_FAILURES="${TEST_FAILURES}    FAIL: ${msg}\n      pattern: '${pattern}'\n      actual:  '${actual}'\n"
        return 1
    fi
    return 0
}

# Export functions for subshells
export -f assert_equals assert_contains assert_not_contains
export -f assert_file_exists assert_dir_exists assert_exit_code assert_match

# --- Run a single test function ---
run_test() {
    local test_func="$1"
    local test_file="$2"
    TOTAL=$((TOTAL + 1))
    TEST_FAILURES=""

    printf "  %-50s " "$test_func"

    # Run the test in a subshell to isolate failures
    local output
    local exit_code=0
    output=$(
        export TEST_FAILURES=""
        source "$test_file"
        "$test_func" 2>&1
        printf "\n__TEST_FAILURES__\n%s" "$TEST_FAILURES"
    ) || exit_code=$?

    # Extract failures from output
    local failures=""
    if [[ "$output" == *"__TEST_FAILURES__"* ]]; then
        failures="${output##*__TEST_FAILURES__}"
        output="${output%%__TEST_FAILURES__*}"
    fi

    if [[ $exit_code -eq 0 && -z "$failures" ]]; then
        printf "${GREEN}PASS${RESET}\n"
        PASSED=$((PASSED + 1))
    else
        printf "${RED}FAIL${RESET}\n"
        FAILED=$((FAILED + 1))
        if [[ -n "$failures" ]]; then
            printf "%b" "$failures"
        fi
        if [[ -n "$output" && $exit_code -ne 0 ]]; then
            printf "    exit code: %s\n" "$exit_code"
            printf "    output: %s\n" "$output" | head -5
        fi
    fi
}

# --- Discover and run test files ---
printf "${BOLD}Brain Spec Skills — Test Suite${RESET}\n\n"

test_files=()
while IFS= read -r -d '' file; do
    test_files+=("$file")
done < <(find "$SCRIPT_DIR" -name 'test_*.sh' -print0 | sort -z)

if [[ ${#test_files[@]} -eq 0 ]]; then
    printf "${YELLOW}No test files found in %s${RESET}\n" "$SCRIPT_DIR"
    exit 0
fi

for test_file in "${test_files[@]}"; do
    rel_path="${test_file#"$SCRIPT_DIR"/}"
    printf "${BOLD}%s${RESET}\n" "$rel_path"

    # Extract test function names (functions starting with test_)
    test_funcs=$(grep -oP '^test_\w+(?=\s*\(\))' "$test_file" || true)

    if [[ -z "$test_funcs" ]]; then
        printf "  ${YELLOW}(no test functions found)${RESET}\n"
        continue
    fi

    while IFS= read -r func; do
        run_test "$func" "$test_file"
    done <<< "$test_funcs"

    printf "\n"
done

# --- Summary ---
printf "${BOLD}Results: %d total, ${GREEN}%d passed${RESET}${BOLD}, " "$TOTAL" "$PASSED"
if [[ $FAILED -gt 0 ]]; then
    printf "${RED}%d failed${RESET}\n" "$FAILED"
else
    printf "0 failed${RESET}\n"
fi

if [[ $FAILED -gt 0 ]]; then
    exit 1
fi
exit 0
