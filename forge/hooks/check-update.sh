#!/usr/bin/env bash
# Forge session-start hook — runs on SessionStart
# 1. Injects Forge-awareness context if this project has a .forge/ directory.
# 2. Checks once per day whether a newer version is available.
#
# This hook must never exit non-zero — a hook failure surfaces as noise to the
# user and blocks session start context. All logic runs inside main(); any
# unexpected error exits 0 silently via the fallback trap.
set -euo pipefail

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-.}"
DATA_DIR="${CLAUDE_PLUGIN_DATA:-/tmp/forge-plugin-data}"
# Plugin-level cache: throttle only (lastCheck, remoteVersion) — shared across all projects.
PLUGIN_CACHE_FILE="$DATA_DIR/update-check-cache.json"
# Project-level cache: migration state (migratedFrom, localVersion) — per project.
HAS_FORGE=false
PROJECT_CACHE_FILE=".forge/update-check-cache.json"
[ -d ".forge" ] && [ -f ".forge/config.json" ] && HAS_FORGE=true
# Read update URL from plugin.json — allows each distribution (forge, skillforge, etc.)
# to point to its own mother repo rather than hardcoding a single URL.
FALLBACK_UPDATE_URL="https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json"
REMOTE_URL=$(jq -r '.updateUrl // ""' "$PLUGIN_ROOT/.claude-plugin/plugin.json" 2>/dev/null || echo "")
[ -z "$REMOTE_URL" ] && REMOTE_URL="$FALLBACK_UPDATE_URL"
CHECK_INTERVAL=86400  # 24 hours in seconds

main() {

mkdir -p "$DATA_DIR"

# --- Forge-awareness context injection ---
# Always runs, regardless of update-check cache state.
FORGE_CONTEXT=""
if [ "$HAS_FORGE" = true ]; then
    FORGE_CONTEXT="This project uses Forge AI-SDLC. Engineering knowledge base: engineering/. Generated workflows: .forge/workflows/. Sprint and task store: .forge/store/. Use the project slash commands (/plan, /implement, /sprint-plan) to drive development. Run /forge:health to check knowledge base currency."
fi

# --- Update check ---
LOCAL_VERSION=$(jq -r '.version // "0.0.0"' "$PLUGIN_ROOT/.claude-plugin/plugin.json" 2>/dev/null || echo "0.0.0")
UPDATE_MSG=""

# Read plugin-level throttle cache.
LAST_CHECK=0
CACHED_REMOTE=""
if [ -f "$PLUGIN_CACHE_FILE" ]; then
    LAST_CHECK=$(jq -r '.lastCheck // 0' "$PLUGIN_CACHE_FILE" 2>/dev/null || echo "0")
    CACHED_REMOTE=$(jq -r '.remoteVersion // ""' "$PLUGIN_CACHE_FILE" 2>/dev/null || echo "")
fi

NOW=$(date +%s)
ELAPSED=$((NOW - LAST_CHECK))

if [ "$ELAPSED" -lt "$CHECK_INTERVAL" ]; then
    # Plugin cache still fresh — check for post-install version change in project cache.
    if [ "$HAS_FORGE" = true ] && [ -f "$PROJECT_CACHE_FILE" ]; then
        PROJ_LOCAL=$(jq -r '.localVersion // ""' "$PROJECT_CACHE_FILE" 2>/dev/null || echo "")
        if [ -n "$PROJ_LOCAL" ] && [ "$PROJ_LOCAL" != "$LOCAL_VERSION" ]; then
            # Plugin was updated — record pre-install version as baseline.
            printf '{"migratedFrom":"%s","localVersion":"%s"}\n' "$PROJ_LOCAL" "$LOCAL_VERSION" > "$PROJECT_CACHE_FILE"
            # Reset plugin cache so we fetch fresh remote version next session.
            printf '{"lastCheck":0,"remoteVersion":"%s"}\n' "$CACHED_REMOTE" > "$PLUGIN_CACHE_FILE"
            UPDATE_MSG="Forge was updated to $LOCAL_VERSION (was $PROJ_LOCAL). Run /forge:update to apply changes to this project."
        fi
    fi
    if [ -z "$UPDATE_MSG" ] && [ -n "$CACHED_REMOTE" ] && [ "$CACHED_REMOTE" != "$LOCAL_VERSION" ]; then
        UPDATE_MSG="Forge $CACHED_REMOTE available (you have $LOCAL_VERSION). Run /forge:update to review changes and update."
    fi
else
    # Cache expired or missing — fetch fresh remote version.
    REMOTE_VERSION=$(curl -sf --max-time 5 "$REMOTE_URL" 2>/dev/null | jq -r '.version // ""' 2>/dev/null || echo "")
    if [ -n "$REMOTE_VERSION" ]; then
        NOW=$(date +%s)
        # Update plugin-level throttle cache (no migration state here).
        printf '{"lastCheck":%d,"remoteVersion":"%s"}\n' "$NOW" "$REMOTE_VERSION" > "$PLUGIN_CACHE_FILE"
        # Seed project-level cache on first run if not yet present.
        if [ "$HAS_FORGE" = true ] && [ ! -f "$PROJECT_CACHE_FILE" ]; then
            printf '{"migratedFrom":"%s","localVersion":"%s"}\n' "$LOCAL_VERSION" "$LOCAL_VERSION" > "$PROJECT_CACHE_FILE"
        fi
        if [ "$REMOTE_VERSION" != "$LOCAL_VERSION" ]; then
            UPDATE_MSG="Forge $REMOTE_VERSION available (you have $LOCAL_VERSION). Run /forge:update to review changes and update."
        fi
    fi
fi

# --- Output additionalContext for Claude Code session injection ---
# Use printf (not heredoc) to avoid bash 5.3+ hang on >512 bytes.
if [ -n "$UPDATE_MSG" ] || [ -n "$FORGE_CONTEXT" ]; then
    COMBINED=""
    [ -n "$FORGE_CONTEXT" ] && COMBINED="$FORGE_CONTEXT"
    if [ -n "$UPDATE_MSG" ]; then
        [ -n "$COMBINED" ] && COMBINED="$COMBINED "
        COMBINED="${COMBINED}${UPDATE_MSG}"
    fi
    ESCAPED=$(printf '%s' "$COMBINED" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\n' ' ')
    printf '{"additionalContext":"%s"}\n' "$ESCAPED"
fi

} # end main

main || exit 0
