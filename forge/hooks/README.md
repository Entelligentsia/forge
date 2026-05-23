# Forge Hooks

Claude Code hooks that extend Forge's session behavior.

## Hook files

| File | Event | Purpose |
|------|-------|---------|
| `check-update.cjs` | SessionStart | Injects Forge context and checks for updates once per day |
| `validate-write.cjs` | PreToolUse (Write/Edit/MultiEdit) | Enforces Forge schemas at the filesystem write boundary |
| `triage-error.cjs` | PostToolUse (Bash) | Offers to file a bug report when a Forge command exits non-zero |
| `forge-permissions.cjs` | PermissionRequest | Auto-approves known Forge tool patterns to reduce prompt noise |
| `post-init.cjs` | PostToolUse (Bash) | Runs after `/forge:init` to finalize project setup |
| `post-sprint.cjs` | PostToolUse (Bash) | Runs after sprint completion for cleanup and telemetry |

## lib/ modules

Helper modules shared across hooks. Bundled separately from the hook entry points.

| File | Exports | Source |
|------|---------|--------|
| `lib/plugin-detection.cjs` | `detectDistribution`, `isPluginEnabled`, `scanPluginInstallations` | Extracted from `check-update.cjs` (H-2a, FORGE-S25-T14) |
| `lib/update-url.cjs` | `FALLBACK_UPDATE_URL`, `ALLOWED_DOMAINS`, `validateUpdateUrl`, `getUpdateUrl` | Extracted from `check-update.cjs` (H-2b, FORGE-S25-T14) |
| `lib/update-msg.cjs` | `buildUpdateMsg`, `emit` | Extracted from `check-update.cjs` (H-2c, FORGE-S25-T14) |
| `lib/write-registry.cjs` | `matchRegistry` | Write-boundary path registry (REGISTRY is private — H-3) |
| `lib/common.cjs` | `FORGE_COMMAND_PATTERNS` | Shared command pattern recognition (H-1d, FORGE-S25-T08) |

## Swallowed-error log policy

Hook files are fail-open by design: any internal error emits a warning to stderr
and exits 0 so that the underlying Forge command is never blocked. To make these
"swallowed" errors visible for diagnostics, hook code calls
`logSwallowedError(tag, err, dataDir)` from `hooks/lib/common.cjs` instead of
silently discarding the error.

### Log location

`$CLAUDE_PLUGIN_DATA/logs/forge-hooks.log`

When `CLAUDE_PLUGIN_DATA` is not set, the helper falls back to:

`$TMPDIR/forge-plugin-data/logs/forge-hooks.log`

### Format

One line per swallowed error:

```
<ISO-8601-timestamp> [<hook-tag>] <error message>
```

Example:

```
2026-05-23T08:30:00.000Z [post-init:emit] ENOENT: no such file or directory, open '.forge/config.json'
```

### Rotation

There is no automatic rotation. The log grows indefinitely until removed or
truncated by the user. To clear it:

```bash
truncate -s 0 "$CLAUDE_PLUGIN_DATA/logs/forge-hooks.log"
# or
rm "$CLAUDE_PLUGIN_DATA/logs/forge-hooks.log"
```

The file is recreated automatically on the next swallowed error.

### Invariant

**Hook code never reads this log.** It is append-only, diagnostic output only.
The log is never consulted by any hook or Forge tool during normal operation.
