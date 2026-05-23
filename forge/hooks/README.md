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

<!-- Placeholder: T15 will document the swallowed-error log policy here -->
<!-- See FORGE-S25-T15 for the swallowed-error log design and hook policy. -->
