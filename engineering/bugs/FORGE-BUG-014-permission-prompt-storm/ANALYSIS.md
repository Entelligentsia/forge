# FORGE-BUG-014: Permission Prompt Storm — Analysis

**Severity:** Critical — blocks all Forge usage without `--dangerously-skip-permissions`
**Reported:** 2026-04-22
**GitHub Issue:** #68 (partial — covers update + report-bug; full scope is all commands)

## Summary

Forge plugin ships zero permission allow rules. Every Bash tool call, Write/Edit, and WebFetch triggers an individual Claude Code approval prompt. A typical `/forge:update` run generates 80+ prompts. `/forge:report-bug` fails entirely on its first shell command.

## Root Cause

Claude Code's permission system prompts for approval on every non-read-only tool call unless an allow rule matches it. Forge has ~900 distinct permission triggers across its plugin source but no allow rules in any settings file or hook output.

## Surface Area

### Category 1: `node` tool calls (256 total in source)

Every `node "$FORGE_ROOT/tools/*.cjs"` invocation is a separate Bash approval.

| Tool | Approx count | Used in |
|------|-------------|---------|
| `banners.cjs` | 50+ | Almost every command + persona |
| `manage-config.cjs` | 30+ | update, config, health, calibrate |
| `store-cli.cjs` | 20+ | workflows, add-task, store-repair |
| `generation-manifest.cjs` | 15+ | regenerate, update |
| `validate-store.cjs` | 10+ | store-repair, health, update |
| `preflight-gate.cjs` | 5 | workflows |
| `collate.cjs` | 3 | workflows |
| `verify-integrity.cjs` | 2 | health |
| `build-persona-pack.cjs` | 3 | init, materialize |
| `build-context-pack.cjs` | 3 | init, materialize |
| `build-init-context.cjs` | 4 | init |
| `ensure-ready.cjs` | 1 | materialize |
| `parse-verdict.cjs` | 3 | orchestrate |
| `check-structure.cjs` | 3 | update |
| `list-skills.js` | 2 | init |
| `node -e "..."` inline | 53 | config reads, one-liners |

**Double-prompt pattern:** `FORGE_ROOT=$(node -e "...") && node "$FORGE_ROOT/tools/..."` — 14 occurrences across persona and workflow files. Each line triggers 3 separate prompts (subshell + `&&` compound + `node` call).

### Category 2: Shell commands (~65 total in source)

| Command | Count | Files |
|---------|-------|-------|
| `mkdir -p` | 8 | update, init, add-task, add-pipeline, sdldc-init |
| `cp` | 2 | update-tools, generate-tools |
| `ls` | 8 | add-pipeline, update, sdldc-init |
| `cat` | 10 | init, add-task, report-bug, tomoshibi, sdldc-init |
| `rm -rf / rm -f` | 6 | remove, init, sdldc-init |
| `jq` | 13 | sdldc-init |
| `cd ... &&` | 15 | health, calibrate |
| `date` | 2 | calibrate, sdldc-init |
| `grep` | 1 | add-pipeline |
| `touch` | 1 | sdldc-init |
| `uname` | 1 | report-bug |

### Category 3: Compound operations (~80+ triggers)

Every compound command triggers "multiple operations" rejection:

| Pattern | Count | Impact |
|---------|-------|--------|
| `2>/dev/null \|\| echo "..."` | 35+ | Every fallback in update, config, health |
| `2>/dev/null \|\| true` | 8+ | regenerate, remove, workflows |
| `cd ... && node ...` | 15 | health, calibrate |
| `\|\|` / `&&` in frontmatter | 6 | remove, report-bug |
| `cat ... \| grep ... \| sed ...` | 2 | report-bug frontmatter |
| `gh auth status 2>&1 \| head -3` | 1 | report-bug frontmatter |
| `ls ... \| wc -l` | 1 | sdldc-init |

### Category 4: Variable expansion (429 total)

| Variable | Count | Effect |
|----------|-------|--------|
| `$FORGE_ROOT` | 429 | Every Bash block with tool calls |
| `$CLAUDE_PLUGIN_ROOT` | 35 | Frontmatter `!` fields |
| `$PROJECT_ROOT` | 20+ | health, calibrate |
| `$ARGUMENTS` | 15+ | Most command files |
| `$KB_PATH` | 10+ | init, remove |
| Other sprint/task/bug vars | 30+ | Workflows |

Note: The 0.25.0 fix (`ec2f5c7`) eliminated `$FORGE_ROOT` from `!`-prefixed frontmatter. But `$FORGE_ROOT` still appears 429 times in Bash **body** blocks — those still trigger expansion prompts.

### Category 5: Frontmatter `!` dynamic fields (35 total)

One prompt per slash command invocation:

| File | Count |
|------|-------|
| remove.md | 6 |
| report-bug.md | 5 |
| add-task.md | 4 |
| add-pipeline.md | 3 |
| update.md | 3 |
| calibrate.md | 2 |
| regenerate.md | 2 |
| Other commands (9 files) | 1 each |
| refresh-kb-links SKILL.md | 1 |

### Category 6: Write/Edit targets (~35)

Workflow artifacts written to `.forge/`, `.claude/commands/`, `engineering/` during execution.

### Category 7: WebFetch (1)

`update.md` fetches remote `plugin.json` for version check.

### Category 8: `gh` commands (3)

All in `report-bug.md` — `gh auth status`, `gh auth login`, `gh issue create`.

## Worst Files

| File | Trigger lines | Notes |
|------|--------------|-------|
| `init/sdlc-init.md` | 99 | Init orchestrator — heaviest single file |
| `commands/regenerate.md` | 60 | ~34 node calls + shell + writes |
| `commands/update.md` | 55 | ~35 node calls + 20 writes + WebFetch |
| `commands/health.md` | 20 | 20 node calls |
| `commands/calibrate.md` | 32 | 12 node + 10 `cd &&` compounds |

## Proposed Fix Architecture (3 prongs)

### Prong 1: Ship permission allow rules via SessionStart hook (P0 — eliminates ~90% of prompts)

Extend `check-update.js` (already runs at SessionStart) to write Forge-specific allow rules into `.claude/settings.local.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(node ~/.claude/plugins/cache/forge/forge/*/tools/*)",
      "Bash(node -e *)",
      "Bash(mkdir -p .forge/*)",
      "Bash(cp */schemas/*.schema.json .forge/schemas/)",
      "Bash(ls *)",
      "Bash(cat .forge/*)",
      "Bash(date -u *)",
      "Bash(gh auth status *)",
      "Bash(gh issue create *)",
      "Bash(jq *)",
      "Write(.forge/**)",
      "Write(.claude/commands/**)",
      "Edit(.forge/**)",
      "Edit(.claude/commands/**)",
      "WebFetch(domain:raw.githubusercontent.com)"
    ]
  }
}
```

**Concern:** The `node` glob `~/.claude/plugins/cache/forge/forge/*/tools/*` may not match if Forge is installed via skillforge (different cache path) or project-scoped. Need to resolve `$CLAUDE_PLUGIN_ROOT` at hook runtime and inject the actual path.

### Prong 2: Fix compound shell commands in frontmatter (P1)

Replace `2>&1 |`, `cat | grep | sed`, `[ -d ] && ||` patterns with single-operation alternatives:
- `gh auth status 2>&1 | head -3` → `gh auth status` alone
- `cat ... | grep | sed` → `node -e` with `JSON.parse`
- `[ -d ... ] && echo YES || echo NO` → separate conditional steps

### Prong 3: PermissionRequest hook for dynamic approval (P2 — optional optimization)

A `PermissionRequest` hook in `hooks/forge-permissions.js` that matches Forge tool call patterns and returns `{ decision: { behavior: "allow" } }` with `updatedPermissions` to persist allow rules. More surgical than Prong 1 but harder to maintain.

## Related Fix: v0.25.0 (commit ec2f5c7)

The 0.25.0 release partially addressed this bug by eliminating `$FORGE_ROOT` from `!`-prefixed frontmatter. Changed 5 frontmatter fields from `!`node "$FORGE_ROOT/tools/manage-config.cjs" get ... 2>/dev/null || echo "..."`` to `!`node -e "try{console.log(require('./.forge/config.json').X)}catch{console.log('default')}"``.

This fixed 5 specific frontmatter prompts but did NOT address the 900+ other triggers in command/workflow bodies. The `2>/dev/null || echo` compound pattern is still present (just hidden inside `node -e` try/catch).

## Resolved Design Questions

1. **Can plugin settings.json declare permission allow rules?** No. Plugin `settings.json` only supports `agent` and `subagentStatusLine` keys. The `permissions` key is not recognized in plugin settings context. Must use `PermissionRequest` hook or `userConfig` instead.
2. **SessionStart hook vs PermissionRequest hook?** PermissionRequest hook is the correct mechanism. It fires per-call, can auto-approve and persist rules via `updatedPermissions`, and respects deny rule precedence. SessionStart writing to settings.json is fragile (race conditions, no merge logic, no user consent).
3. **Allow rule path resolution?** Use `$CLAUDE_PLUGIN_ROOT` env var (available in hooks) to resolve actual installed path. Don't hardcode `~/.claude/plugins/cache/forge/forge/*/tools/*` globs — different distributions install to different paths.
4. **`node -e *` scope?** Acceptable for Forge projects. Inline Node.js is already used extensively by Forge. The alternative (listing every individual tool) would be brittle.
5. **Write/Edit to `engineering/`?** Yes, include `engineering/**` in allow rules. Workflow artifacts are legitimate Forge output.
6. **Security model?** `PermissionRequest` hook can only `allow`, never `deny`. User `deny` rules take precedence. Rules persist to `localSettings` (`.claude/settings.local.json`, gitignored). User can inspect/remove via `/permissions`. No install-time consent flow exists for permissions — this is a gap in the Claude Code plugin system.