# PROGRESS — FORGE-S12-T06: Deterministic model discovery for event records

*Forge Engineer*

**Task:** FORGE-S12-T06
**Sprint:** FORGE-S12

---

## Summary

Added `discoverModel()` function to store-cli.cjs that probes environment variables in priority order (`CLAUDE_CODE_SUBAGENT_MODEL` > `ANTHROPIC_MODEL` > `CLAUDE_MODEL`) to resolve the actual runtime model. Auto-populates the `model` field in `cmdEmit()` when missing or empty, and in `cmdRecordUsage()` when `--model` flag is not provided. Returns `"unknown"` instead of guessing an Anthropic model name when no env var is set. Exported for testability and reuse.

## Syntax Check Results

```
$ node --check forge/tools/store-cli.cjs
(no output — clean)
```

## Test Suite Results

```
$ node --test forge/tools/__tests__/*.test.cjs
tests 577
suites 95
pass 577
fail 0
```

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
Store validation passed (12 sprint(s), 85 task(s), 18 bug(s)).
```

## Lint Check Results

```
$ node --check forge/tools/collate.cjs forge/tools/validate-store.cjs forge/tools/seed-store.cjs forge/tools/manage-config.cjs forge/tools/estimate-usage.cjs forge/hooks/check-update.js forge/hooks/triage-error.js forge/hooks/list-skills.js
(no output — clean)
```

## Files Changed

| File | Change |
|---|---|
| `forge/tools/store-cli.cjs` | Added `discoverModel()` function with env var priority probing; auto-populate `model` in `cmdEmit()` when missing/empty; auto-populate `model` in `cmdRecordUsage()` when `--model` flag absent; export `discoverModel` |
| `forge/tools/__tests__/store-cli.test.cjs` | Added 13 tests: 6 for `discoverModel()` env var priority/trimming/fallback, 4 for `cmdEmit()` auto-population, 2 for `cmdRecordUsage()` auto-population, 1 for explicit model preservation |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| `discoverModel()` returns model from `CLAUDE_CODE_SUBAGENT_MODEL` when set | Pass | Test confirms |
| `discoverModel()` falls back to `ANTHROPIC_MODEL`, then `CLAUDE_MODEL` | Pass | Tests confirm priority order |
| `discoverModel()` returns `"unknown"` when no env var is set | Pass | Test confirms |
| `cmdEmit()` auto-populates missing/empty `model` field via `discoverModel()` | Pass | Tests for both missing and empty-string |
| `cmdEmit()` preserves an explicitly provided `model` value | Pass | Test confirms explicit model preserved |
| `cmdRecordUsage()` auto-populates missing `--model` flag via `discoverModel()` | Pass | Test confirms |
| `node --check` passes on all modified CJS files | Pass | Clean output |
| All existing and new tests pass | Pass | 577/577 |

## Plugin Checklist

- [ ] Version bumped in `forge/.claude-plugin/plugin.json` (if material change)
- [ ] Migration entry added to `forge/migrations.json` (if material change)
- [ ] Security scan run and report committed (if `forge/` was modified)

## Knowledge Updates

None required.

## Notes

Version bump, migration, and security scan are deferred to the sprint-level release engineering task. The implementation follows the same auto-population pattern as `_normalizeEventTimestamps` and `_normalizeBugTimestamps` — field normalization before validation, respecting explicit caller values.