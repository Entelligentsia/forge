# Bug Fixer Skills — Forge

## Triage & Root Cause Analysis

Before fixing anything, reproduce the bug:
1. Read `.forge/store/bugs/{BUG_ID}.json` for the bug record
2. Read `engineering/bugs/{BUG_DIR}/` for any existing analysis files
3. Check the linked GitHub issue (if any) at `Entelligentsia/forge`
4. Use `git log --oneline -20` to find recent commits that may have introduced the regression
5. Use `Grep` to find the exact file and line where the bug manifests
6. Classify root cause: `validation` | `auth` | `business-rule` | `data-integrity` | `race-condition` | `integration` | `configuration` | `regression`

## Forge-Specific Bug Patterns

- **Two-layer confusion:** Bug in `.forge/` instance is actually a regeneration issue — fix in `forge/meta/`, then regenerate
- **Stale generated file:** Generated workflow/persona/skill file out of sync with meta source — fix is to regenerate, not edit directly
- **Missing `regenerate` target:** Migration entry lists wrong or incomplete targets — users can't get the fix until corrected
- **Version bump omitted:** Material change to `forge/` shipped without version bump — users' instances diverge silently

## Verification Sequence

After implementing any fix to `forge/`:
```bash
# 1. Syntax check every modified JS/CJS file
node --check <modified-file>

# 2. Store integrity check (if schemas or store tools changed)
node forge/tools/validate-store.cjs --dry-run

# 3. Security scan (required for any forge/ change)
# /security-watchdog:scan-plugin forge:forge --source-path forge/
```

## Fix Documentation

`PROGRESS.md` for a bug fix must include:
- Root cause statement (one paragraph)
- Files modified list
- Literal output of every `node --check` command
- Literal output of `validate-store --dry-run`
- Link to security scan report (if applicable)
- Version bump confirmation

## Knowledge Writeback

After fixing a bug:
- Add a stack-checklist item if this bug class should be caught in future reviews
- Tag similar bugs in `.forge/store/bugs/` with `similarBugs` field
- Update `rootCauseCategory` in bug store JSON if refined

## Skill Invocations

When fixing security-related bugs or any change to `forge/`:
- YOU MUST invoke `security-watchdog:scan-plugin forge:forge --source-path forge/` before committing
- Save the full report to `docs/security/scan-v{VERSION}.md`
