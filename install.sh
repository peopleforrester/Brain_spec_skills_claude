#!/usr/bin/env bash
# ABOUTME: Brain Spec Skills installer for Claude Code.
# ABOUTME: Copies brain-* skill directories into .claude/skills/ (project or global).

set -euo pipefail

REPO_URL="https://github.com/peopleforrester/Brain_spec_skills_claude.git"
SKILLS=("brain-init" "brain-spec" "brain-task" "brain-status")
CLONE_DIR=""

# --- Parse arguments ---
GLOBAL=false
TARGET_DIR=".claude/skills"
VERSION_TAG=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --global)
      GLOBAL=true
      TARGET_DIR="$HOME/.claude/skills"
      shift
      ;;
    --version)
      if [[ -z "${2:-}" ]]; then
        echo "Error: --version requires a tag argument (e.g. --version v1.1.1)"
        exit 1
      fi
      VERSION_TAG="$2"
      shift 2
      ;;
    --help|-h)
      echo "Usage: install.sh [--global] [--version <tag>]"
      echo ""
      echo "Install Brain Spec Skills into your Claude Code project."
      echo ""
      echo "Options:"
      echo "  --global           Install to ~/.claude/skills/ (available in all projects)"
      echo "  --version <tag>    Pin to a specific release tag (e.g. v1.1.1)."
      echo "                     Default: clone the default branch."
      echo "  --help             Show this help message"
      echo ""
      echo "Default: installs to .claude/skills/ in the current directory."
      exit 0
      ;;
    *)
      echo "Error: unknown argument '$1'. Use --help for usage."
      exit 1
      ;;
  esac
done

# --- Cleanup on exit ---
cleanup() {
  if [[ -n "$CLONE_DIR" && -d "$CLONE_DIR" ]]; then
    rm -rf "$CLONE_DIR"
  fi
}
trap cleanup EXIT

# --- Check prerequisites ---
if ! command -v git &>/dev/null; then
  echo "Error: git is required but not found."
  exit 1
fi

# --- Report install target ---
if [[ "$GLOBAL" == true ]]; then
  echo "Installing Brain Spec Skills globally to $TARGET_DIR"
else
  echo "Installing Brain Spec Skills to $TARGET_DIR"
fi

# --- Check for existing installation ---
OLD_VERSION=""
for skill in "${SKILLS[@]}"; do
  if [[ -f "$TARGET_DIR/$skill/VERSION" ]]; then
    OLD_VERSION=$(cat "$TARGET_DIR/$skill/VERSION")
    echo "  Existing installation detected: v$OLD_VERSION"
    break
  fi
done

# --- Clone repo to temp directory ---
CLONE_DIR=$(mktemp -d)
if [[ -n "$VERSION_TAG" ]]; then
  echo "Fetching skills at $VERSION_TAG..."
  git clone --depth 1 --quiet --branch "$VERSION_TAG" "$REPO_URL" "$CLONE_DIR"
else
  echo "Fetching latest skills..."
  git clone --depth 1 --quiet "$REPO_URL" "$CLONE_DIR"
fi

# --- Read version ---
NEW_VERSION="unknown"
if [[ -f "$CLONE_DIR/VERSION" ]]; then
  NEW_VERSION=$(tr -d '[:space:]' < "$CLONE_DIR/VERSION")
fi

# --- Create target directory ---
mkdir -p "$TARGET_DIR"

# --- Copy skills ---
INSTALLED=0
for skill in "${SKILLS[@]}"; do
  SRC="$CLONE_DIR/.claude/skills/$skill"
  DEST="$TARGET_DIR/$skill"

  if [[ ! -d "$SRC" ]]; then
    echo "  Warning: $skill not found in repo, skipping."
    continue
  fi

  # Remove old version of this specific skill
  if [[ -d "$DEST" ]]; then
    rm -rf "$DEST"
  fi

  cp -r "$SRC" "$DEST"

  # Stamp version into each skill directory
  echo "$NEW_VERSION" > "$DEST/VERSION"

  echo "  Installed: $skill"
  INSTALLED=$((INSTALLED + 1))
done

# --- Summary ---
echo ""
if [[ -n "$OLD_VERSION" && "$OLD_VERSION" != "$NEW_VERSION" ]]; then
  echo "Brain Spec Skills updated: v$OLD_VERSION -> v$NEW_VERSION ($INSTALLED skills)"
elif [[ -n "$OLD_VERSION" ]]; then
  echo "Brain Spec Skills reinstalled: v$NEW_VERSION ($INSTALLED skills)"
else
  echo "Brain Spec Skills v$NEW_VERSION installed ($INSTALLED skills)"
fi
echo "  Location: $TARGET_DIR"
echo ""

if [[ "$GLOBAL" == true ]]; then
  echo "Skills are now available in all Claude Code projects."
else
  echo "Next steps:"
  echo "  1. Open Claude Code in this project"
  echo "  2. Run /brain-init to create your workspace"
fi
