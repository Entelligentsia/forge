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
CACHE_FILE="$DATA_DIR/update-check-cache.json"
REMOTE_URL="https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json"
CHECK_INTERVAL=86400  # 24 hours in seconds

main() {

mkdir -p "$DATA_DIR"

# --- Forge-awareness context injection ---
# Always runs, regardless of update-check cache state.
FORGE_CONTEXT=""
if [ -d ".forge" ] && [ -f ".forge/config.json" ]; then
    FORGE_CONTEXT="This project uses Forge AI-SDLC. Engineering knowledge base: engineering/. Generated workflows: .forge/workflows/. Sprint and task store: .forge/store/. Use the project slash commands (/plan, /implement, /sprint-plan) to drive development. Run /forge:health to check knowledge base currency."
fi

# --- Update check ---
LOCAL_VERSION=$(jq -r '.version // "0.0.0"' "$PLUGIN_ROOT/.claude-plugin/plugin.json" 2>/dev/null || echo "0.0.0")
UPDATE_MSG=""

if [ -f "$CACHE_FILE" ]; then
    LAST_CHECK=$(jq -r '.lastCheck // 0' "$CACHE_FILE" 2>/dev/null || echo "0")
    NOW=$(date +%s)
    ELAPSED=$((NOW - LAST_CHECK))
    if [ "$ELAPSED" -lt "$CHECK_INTERVAL" ]; then
        # Already checked recently — use cached result
        CACHED_REMOTE=$(jq -r '.remoteVersion // ""' "$CACHE_FILE" 2>/dev/null || echo "")
        if [ -n "$CACHED_REMOTE" ] && [ "$CACHED_REMOTE" != "$LOCAL_VERSION" ]; then
            UPDATE_MSG="Forge $CACHED_REMOTE available (you have $LOCAL_VERSION). Run /forge:update to review changes and update."
        fi
    else
        # Cache expired — fetch fresh
        REMOTE_VERSION=$(curl -sf --max-time 5 "$REMOTE_URL" 2>/dev/null | jq -r '.version // ""' 2>/dev/null || echo "")
        if [ -n "$REMOTE_VERSION" ]; then
            NOW=$(date +%s)
            printf '{"lastCheck":%d,"remoteVersion":"%s","localVersion":"%s"}\n' "$NOW" "$REMOTE_VERSION" "$LOCAL_VERSION" > "$CACHE_FILE"
            if [ "$REMOTE_VERSION" != "$LOCAL_VERSION" ]; then
                UPDATE_MSG="Forge $REMOTE_VERSION available (you have $LOCAL_VERSION). Run /forge:update to review changes and update."
            fi
        fi
    fi
else
    # No cache yet — fetch
    REMOTE_VERSION=$(curl -sf --max-time 5 "$REMOTE_URL" 2>/dev/null | jq -r '.version // ""' 2>/dev/null || echo "")
    if [ -n "$REMOTE_VERSION" ]; then
        NOW=$(date +%s)
        printf '{"lastCheck":%d,"remoteVersion":"%s","localVersion":"%s"}\n' "$NOW" "$REMOTE_VERSION" "$LOCAL_VERSION" > "$CACHE_FILE"
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
