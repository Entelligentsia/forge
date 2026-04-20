# FORGE-BUG-011 Implementation Progress

## Status: COMPLETE

## Files Changed

| File | Change |
|---|---|
| `forge/agents/tomoshibi.md` | Sub-issue 1: Added PREFIX_LOWER derivation in Setup; updated impact table to use `{old_lower}`/`{new_lower}`; added clarifying note; updated Config change step 3 to derive and show lowercased paths |
| `forge/tools/store-cli.cjs` | Sub-issue 2: `cmdProgress()` now emits a human-readable persona heartbeat line to stdout after writing the log entry |
| `forge/tools/ensure-ready.cjs` | Sub-issue 3: `_renderAnnouncement()` replaced multi-line framed block with single-line summary |
| `forge/tools/__tests__/store-cli.test.cjs` | Sub-issue 2: Added 2 new tests for progress stdout IPC |
| `forge/tools/__tests__/ensure-ready.test.cjs` | Sub-issue 3: Added 4 new tests; updated 3 old tests to match single-line contract |
| `forge/.claude-plugin/plugin.json` | Version bump 0.18.1 → 0.19.0 |
| `forge/migrations.json` | Added 0.18.1 → 0.19.0 migration entry |
| `CHANGELOG.md` | Added [0.19.0] entry |
| `forge/integrity.json` | Regenerated for v0.19.0 |

## node --check output

```
node --check forge/tools/store-cli.cjs   → SYNTAX OK
node --check forge/tools/ensure-ready.cjs → SYNTAX OK
```

(tomoshibi.md is a .md file — no syntax check applicable)

## Test Run Results

**Baseline:** 494 tests, 0 fail (pre-implementation)

**After implementation:**
```
ℹ tests 500
ℹ suites 80
ℹ pass 500
ℹ fail 0
ℹ duration_ms ~456ms
```

Net new tests: +6 (2 for store-cli progress IPC, 4 for ensure-ready single-line; 3 old ensure-ready tests updated)

## Version Bump

- `forge/.claude-plugin/plugin.json`: `"version": "0.18.1"` → `"version": "0.19.0"` ✓
- `forge/migrations.json`: entry `"0.18.1"` → `"0.19.0"` added ✓
- `CHANGELOG.md`: `[0.19.0] — 2026-04-19` prepended ✓
- `forge/integrity.json`: regenerated, version 0.19.0, 20 files ✓

## Integrity

Hash of `verify-integrity.cjs` matched existing `EXPECTED=` in `forge/commands/health.md` — no update needed.

## Deviations from Plan

None. All steps executed in exact TDD order specified.

## Security Scan

- Security scan completed: `docs/security/scan-v0.19.0.md` written
- Scan verdict: SAFE TO USE — 166 files, 0 critical, 3 warnings (all accepted carry-forward), 4 info
- `docs/security/index.md` updated — v0.19.0 row prepended at top of table
- `README.md` Security table updated — v0.19.0 prepended, v0.17.1 removed (exactly 3 rows remain)
