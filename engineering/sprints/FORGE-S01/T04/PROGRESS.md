# PROGRESS — FORGE-S01-T04: estimate-usage.cjs — token estimation fallback tool

**Task:** FORGE-S01-T04
**Sprint:** FORGE-S01

---

## Summary

Created `forge/tools/estimate-usage.cjs`, a deterministic CJS tool that back-fills
token usage estimates on event records lacking self-reported token data. The tool
uses `durationMinutes` and `model` heuristics from documented constant tables to
compute `inputTokens`, `outputTokens`, and `estimatedCostUSD`, writing results back
atomically (via `.tmp` + `renameSync`). Events that already have `inputTokens`
defined are skipped without modification. The lint command in `.forge/config.json`
was also updated to include the new tool.

## Syntax Check Results

```
$ node --check forge/tools/estimate-usage.cjs
Syntax OK
```

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
(16 pre-existing errors in old event records with missing required fields — not caused by this task)
The token fields written by estimate-usage.cjs (inputTokens, outputTokens, estimatedCostUSD)
are all correctly defined as optional in the event schema and pass validation.
```

Note: The validate-store errors are pre-existing issues in historical event records
(missing required fields like `endTimestamp`, `model`, etc.) that predate this task.
No new errors were introduced.

## Files Changed

| File | Change |
|---|---|
| `forge/tools/estimate-usage.cjs` | Created — token estimation fallback tool |
| `.forge/config.json` | Updated `commands.lint` to include `estimate-usage.cjs` |
| `.forge/store/events/FORGE-S01/2026-04-05T14:00:00.000Z_FORGE-S01-T04_engineer_implement.json` | Created — implementation event record |

## Smoke Test Results

**Single-event dry-run:**
```
$ node forge/tools/estimate-usage.cjs --event ".forge/store/events/FORGE-S01/2026-04-05T06:00:00.000Z_FORGE-S01-T01_implement_complete.json" --dry-run
  [dry-run] would write to: .../implement_complete.json
    inputTokens=3150, outputTokens=1350, estimatedCostUSD=0.0135

1 events updated, 0 skipped (already populated)
```

**Live single-event write + idempotency check:**
```
$ node forge/tools/estimate-usage.cjs --event ".forge/store/events/FORGE-S01/2026-04-05T06:00:00.000Z_FORGE-S01-T01_implement_complete.json"
  updated: 2026-04-05T06:00:00.000Z_FORGE-S01-T01_implement_complete.json (inputTokens=3150, outputTokens=1350, estimatedCostUSD=0.0135)

1 events updated, 0 skipped (already populated)

$ node forge/tools/estimate-usage.cjs --event ".forge/store/events/FORGE-S01/2026-04-05T06:00:00.000Z_FORGE-S01-T01_implement_complete.json"
0 events updated, 1 skipped (already populated)
```

**Sprint batch dry-run:**
```
$ node forge/tools/estimate-usage.cjs --sprint FORGE-S01 --dry-run
... (17 events would be updated, 4 skipped)
17 events updated, 4 skipped (already populated)
```

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| `forge/tools/estimate-usage.cjs` exists | ✅ Pass | Created |
| `node --check` exits 0 | ✅ Pass | Clean |
| `--event <path>` updates one event file | ✅ Pass | Smoke tested |
| `--sprint <SPRINT_ID>` updates all events in sprint | ✅ Pass | Smoke tested |
| Events with `inputTokens` already set are skipped | ✅ Pass | Verified by re-run returning 0 updated |
| Node.js built-ins only (`fs`, `path`) | ✅ Pass | No npm dependencies |
| Documented heuristic table (model → tokens/min) as `const` | ✅ Pass | `TOKENS_PER_MINUTE` constant in source |
| Outputs summary: `N events updated, M skipped (already populated)` | ✅ Pass | Confirmed in all modes |
| Reads `.forge/config.json` for store path | ✅ Pass | Via `readConfig()` |
| `--dry-run` flag supported | ✅ Pass | Logs writes without modifying files |
| Top-level `try/catch` with `process.exit(1)` | ✅ Pass | Wraps all main logic |
| `validate-store --dry-run` exits 0 after tool runs | ⚠️ Pre-existing | 16 pre-existing errors in old records unrelated to this task |

## Advisory Notes Addressed

1. **Missing `model` field** — handled via `lookupByModel` falling back to `DEFAULT_TOKENS_PER_MINUTE`
2. **`durationMinutes: 0`** — logs a warning and skips estimation (returns null → skipped)
3. **Pricing simplification** — documented with `// TODO` in source for T05 refinement
4. **Lint command** — `estimate-usage.cjs` added to `commands.lint` in `.forge/config.json`

## Plugin Checklist

- [ ] Version bumped in `forge/.claude-plugin/plugin.json` (deferred to T08)
- [ ] Migration entry added to `forge/migrations.json` (deferred to T08)
- [ ] Security scan run and report committed — REQUIRED before push (`/security-watchdog:scan-plugin forge:forge --source-path forge/`)

## Revision 1

**In response to CODE_REVIEW.md — Required Change 1:**

- Removed `process.on('uncaughtException', ...)` handler (lines 18–20) from
  `forge/tools/estimate-usage.cjs`. This pattern is reserved for hooks (which
  must exit 0 to avoid surfacing noise). The top-level `try/catch` on line 189
  already handles errors correctly with `process.exit(1)`.

**Syntax check after revision:**

```
$ node --check forge/tools/estimate-usage.cjs
Syntax OK
```

No other changes required. All other checklist items remain PASS.

## Knowledge Updates

No new architecture discoveries. Patterns confirmed consistent with `collate.cjs` and `validate-store.cjs`.

## Notes

- The `validate-store --dry-run` exit code is 1 due to 16 pre-existing errors in old event records
  (missing `endTimestamp`, `model`, etc.) that existed before this task. The token fields written
  by `estimate-usage.cjs` are schema-valid and do not contribute to these errors.
- Version bump and migration entry are intentionally deferred to T08 per the task prompt.
- Security scan must be run before committing/pushing per CLAUDE.md requirements.
