# Supervisor Skills — Forge

## File-by-File Verification Protocol

1. Read `PROGRESS.md` or `PLAN.md` — extract the files-changed or files-to-change manifest
2. Read every listed file directly — do not rely on the Engineer's summary
3. Cross-check with `git status` / `git diff --name-only` — find anything unlisted
4. Unlisted modified files = immediate review finding

## Plugin Code Checklist (Code Review)

For each modified JS/CJS file:

| Check | Method |
|---|---|
| No npm `require()` | Scan all `require(...)` calls; compare against Node.js built-in list |
| `'use strict';` present | First non-comment line of every hook and tool |
| Hook: `uncaughtException` handler | `process.on('uncaughtException', () => process.exit(0))` present |
| Tool: top-level try/catch | Outer try/catch with `process.exit(1)` on error |
| Tool: `--dry-run` honoured | `process.argv.includes('--dry-run')` gates all writes |
| Paths from config | No literal `'engineering/'` or `'.forge/store/'` in tool code |
| Syntax evidence | `node --check <file>` output shown in PROGRESS.md (not just a claim) |

## Security Scan Verification

If any file inside `forge/` was modified:
- `docs/security/scan-v{VERSION}.md` MUST exist and show SAFE
- `README.md` Security Scan History table MUST have the new row

Missing report = `Revision Required`. Always.

## Version and Migration Verification

- `forge/.claude-plugin/plugin.json` version matches what the plan declared
- `forge/migrations.json` has the entry with correct `regenerate` targets
- `breaking: true` set if users need manual steps before regenerating

## Plan Review Checklist

- Does the plan deliver what the task prompt actually requires? (Read the task prompt independently)
- Is the materiality classification correct?
- Are all `forge/` files that need changing identified?
- Is the security scan explicitly required?
- Are the migration `regenerate` targets correct for the proposed changes?

## Installed Skill: security-watchdog

When reviewing any change to `forge/commands/`, `forge/hooks/`, or `forge/tools/`:
YOU MUST apply the `security-watchdog` security depth — check for prompt injection in Markdown, credential access patterns, shell injection via user-input command construction, and hook permission escalation. The stack checklist covers project conventions; `security-watchdog` covers universal plugin attack patterns. Both are required. No exceptions.
