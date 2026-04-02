#!/usr/bin/env bash
# Forge skill query helper
#
# Usage:
#   list-skills.sh                  — print all available skill names
#   list-skills.sh <skill-name>     — exit 0 if available, 1 if not
#
# Sources (both checked):
#   ~/.claude/plugins/installed_plugins.json  — marketplace plugins
#     scope "user"  → always available
#     scope "local" → only if projectPath matches cwd
#   ~/.claude/skills/                          — personal skills (subdirs with SKILL.md)
#
# Output: one skill name per line
#
# On unexpected failure the script exits 1 (same as "skill not found") so
# callers degrade gracefully rather than seeing a crash.

set -euo pipefail

PLUGINS_FILE="${CLAUDE_PLUGIN_DATA_ROOT:-$HOME/.claude/plugins}/installed_plugins.json"
PERSONAL_SKILLS_DIR="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
CWD=$(pwd)

main() {
  # Source 1: marketplace plugins from installed_plugins.json
  PLUGIN_SKILLS=""
  if [ -f "$PLUGINS_FILE" ]; then
      PLUGIN_SKILLS=$(jq -r --arg cwd "$CWD" '
        .plugins
        | to_entries[]
        | .key as $key
        | .value[]
        | select(.scope == "user" or (.scope == "local" and .projectPath == $cwd))
        | ($key | split("@")[0])
      ' "$PLUGINS_FILE" 2>/dev/null || true)
  fi

  # Source 2: personal skills — any subdirectory containing a SKILL.md
  PERSONAL_SKILLS=""
  if [ -d "$PERSONAL_SKILLS_DIR" ]; then
      PERSONAL_SKILLS=$(find "$PERSONAL_SKILLS_DIR" -maxdepth 2 -name "SKILL.md" \
        | sed 's|/SKILL.md||' | xargs -I{} basename {} 2>/dev/null || true)
  fi

  # Merge and deduplicate
  INSTALLED=$(printf '%s\n%s\n' "$PLUGIN_SKILLS" "$PERSONAL_SKILLS" | grep -v '^$' | sort -u)

  if [ $# -eq 0 ]; then
      echo "$INSTALLED"
  else
      if echo "$INSTALLED" | grep -qx "$1"; then
          exit 0
      else
          exit 1
      fi
  fi
} # end main

main "$@" || exit 1
