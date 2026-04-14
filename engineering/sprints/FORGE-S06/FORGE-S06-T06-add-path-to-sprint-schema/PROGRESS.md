# PROGRESS — FORGE-S06-T06: Add `path` field to sprint schema

🌱 *Forge Engineer*

**Task:** FORGE-S06-T06
**Sprint:** FORGE-S06

---

## Summary

Added an optional `path` field to the sprint JSON schema and its embedded copy in `validate-store.cjs`, bringing parity with task and bug schemas. Introduced a `warn()` function in validate-store for non-fatal advisory messages. Sprints missing `path` now emit a `WARN` line (not `ERROR`) that does not increment `errorsCount`, preserving backward compatibility.

## Syntax Check Results

```
$ node --check forge/tools/validate-store.cjs
(no output — exit 0)
```

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
WARN   FORGE-S01: missing optional field "path"
WARN   FORGE-S02: missing optional field "path"
WARN   FORGE-S03: missing optional field "path"
WARN   FORGE-S04: missing optional field "path"
WARN   FORGE-S05: missing optional field "path"
WARN   FORGE-S06: missing optional field "path"
... (pre-existing errors from FORGE-S04/S05 event records)
108 error(s) found.
```

Note: The 108 pre-existing errors are from legacy event records and are NOT caused by this change. The WARN lines for missing `path` are informational only and do not increment `errorsCount`.

## Files Changed

| File | Change |
|---|---|
| `forge/schemas/sprint.schema.json` | Added `"path": { "type": "string" }` to properties (not in required) |
| `forge/tools/validate-store.cjs` | Added `"path"` to embedded SCHEMAS.sprint properties; added `warn()` function and `warningsCount`; added sprint-missing-path check; updated result output to show warnings |
| `forge/.claude-plugin/plugin.json` | Version bump 0.7.5 → 0.7.6 |
| `forge/migrations.json` | Added 0.7.5 → 0.7.6 migration entry |
| `docs/security/scan-v0.7.6.md` | Security scan report |
| `README.md` | Updated Security Scan History table |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| `sprint.schema.json` includes `"path": { "type": "string" }` | 〇 Pass | In properties, not in required |
| `sprint.schema.json` does NOT include `"path"` in required | 〇 Pass | Confirmed |
| Embedded `SCHEMAS.sprint` includes `"path"` property | 〇 Pass | Added to validate-store.cjs |
| validate-store emits WARN for sprints missing path | 〇 Pass | 6 WARNs emitted for 6 existing sprints |
| validate-store does NOT emit ERROR for sprints missing path | 〇 Pass | WARN separate from ERROR, does not increment errorsCount |
| `node --check forge/tools/validate-store.cjs` passes | 〇 Pass | Clean exit 0 |
| `validate-store --dry-run` exits 0 | × Fail | Pre-existing errors cause exit 1; this change adds no new errors |

Note on the "exits 0" criterion: 108 pre-existing store errors (legacy event records) cause exit 1. This change does NOT introduce any new errors. The `path`-related warnings are non-fatal.

## Plugin Checklist

- [x] Version bumped in `forge/.claude-plugin/plugin.json` (0.7.5 → 0.7.6)
- [x] Migration entry added to `forge/migrations.json` (0.7.5 → 0.7.6, regenerate: [])
- [x] Security scan run and report committed (docs/security/scan-v0.7.6.md)

## Knowledge Updates

None required. The `warn()` function pattern is straightforward and consistent with the existing `err()` function.

## Notes

- The `warn()` function uses `console.log` (not `console.error`) and tracks `warningsCount` separately from `errorsCount`.
- Pre-existing schema drift: embedded `SCHEMAS.sprint` has `goal` and `features` properties not present in the standalone `sprint.schema.json`. This is out of scope for this task.
- `engineering/architecture/database.md` Sprint entity table should be updated to include `path` after this change is committed (out of scope for this task).