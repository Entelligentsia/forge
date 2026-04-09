#!/usr/bin/env bash
# scripts/bump-skillforge.sh [<git-ref>]
#
# Bumps the forge submodule inside Entelligentsia/skillforge to the given
# git ref (tag, SHA, or branch), patches plugin.json with the skillforge-
# specific updateUrl/migrationsUrl, and commits.
#
# Defaults to the current HEAD of this repo if no ref is given.
#
# Usage:
#   ./scripts/bump-skillforge.sh            # use current HEAD
#   ./scripts/bump-skillforge.sh v0.6.4
#   ./scripts/bump-skillforge.sh d343037

set -euo pipefail

SKILLFORGE_DIR="/home/boni/.claude/plugins/marketplaces/skillforge"
SKILLFORGE_RAW="https://raw.githubusercontent.com/Entelligentsia/skillforge/main/forge/forge"
PLUGIN_JSON="forge/forge/.claude-plugin/plugin.json"

# --- Resolve ref ---
ref="${1:-$(git rev-parse HEAD)}"

# If the ref looks like a short SHA or branch, resolve to the full SHA for the commit message.
resolved=$(git rev-parse --short "$ref" 2>/dev/null || echo "$ref")

echo "── Bumping skillforge/forge → $ref ($resolved)"

# --- Sanity checks ---
if [ ! -d "$SKILLFORGE_DIR" ]; then
  echo "✗ skillforge repo not found at $SKILLFORGE_DIR" >&2
  exit 1
fi

if [ ! -f "$SKILLFORGE_DIR/$PLUGIN_JSON" ]; then
  echo "✗ $PLUGIN_JSON not found in skillforge — is the submodule initialised?" >&2
  exit 1
fi

# --- Update submodule ---
git -C "$SKILLFORGE_DIR" submodule update --init forge
git -C "$SKILLFORGE_DIR/forge" fetch --tags
git -C "$SKILLFORGE_DIR/forge" checkout "$ref"

# --- Read version from checked-out forge ---
# No plugin.json patching needed: check-update.js/.sh derive the correct URL
# from the CLAUDE_PLUGIN_ROOT path pattern at runtime, so the installed
# plugin.json can always carry the canonical forge URLs.
version=$(node -e "process.stdout.write(require('$SKILLFORGE_DIR/$PLUGIN_JSON').version)")

# --- Commit ---
git -C "$SKILLFORGE_DIR" add forge
git -C "$SKILLFORGE_DIR" commit -m "chore: bump forge submodule to v${version} (${resolved})"

echo "〇 skillforge/forge → v${version} (${resolved})"
echo "   Run: git -C $SKILLFORGE_DIR push"
