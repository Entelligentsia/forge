# VALIDATION REPORT — FORGE-S07-T04: Refactor validate-store.cjs — remove embedded schemas and fix facade bypass

🍵 *Forge QA Engineer*

**Task:** FORGE-S07-T04

---

**Verdict:** Approved

---

## Acceptance Criteria Checklist

| # | Criterion | Evidence | Result |
|---|---|---|---|
| 1 | Embedded schema literals removed entirely | `grep "const SCHEMAS\|SCHEMAS =" validate-store.cjs` returns no matches; `loadSchemas()` function at line 50 replaces them | PASS |
| 2 | Reads `*.schema.json` from `.forge/schemas/` first; falls back to `forge/schemas/` | `loadSchemas()` at line 50 tries `projectDir` then `inTreeDir`; verified by temporarily removing `.forge/schemas/` — tool used `forge/schemas/` silently | PASS |
| 3 | Missing schemas: stderr warning + minimal fallback | Temporarily removed both schema dirs: 5 stderr `WARN:` lines emitted; tool ran with minimal fallback (required-field checks only); no crash | PASS |
| 4 | Event loop uses `store.listEventFilenames()` and `store.getEvent()` | Lines 287-292: `store.listEventFilenames(sprintId)` for iteration, `store.getEvent(filename, sprintId)` for reading; `grep "store.impl"` returns no matches | PASS |
| 5 | Nullable-FK handling preserved | Line 97: `NULLABLE_FK` set unchanged; line 107: null-check logic unchanged | PASS |
| 6 | `--fix` mode still works | All write paths use store facade (`store.writeSprint`, `store.writeTask`, `store.writeBug`, `store.writeEvent`); `FIX_MODE` flag checked before all writes; `--dry-run` blocks `--fix` | PASS |
| 7 | `node --check` passes | `node --check forge/tools/validate-store.cjs` — exit 0 | PASS |
| 8 | Same advisory summary as before | `node forge/tools/validate-store.cjs --dry-run` produces 2 errors (pre-existing), same warnings; no new false errors | PASS |

## Edge Case Checks

| Check | Result |
|---|---|
| No npm dependencies introduced | PASS — `require()` calls: `./store.cjs`, `fs`, `path` only |
| Hook exit discipline | N/A — this is a tool |
| Schema `additionalProperties: false` | N/A — no schemas modified |
| Backwards compatibility | PASS — no version bump; previous version users unaffected |

## Regression Check

```
$ node --check forge/tools/validate-store.cjs
REGRESSION CHECK: PASS
```

No schema files were modified — `validate-store --dry-run` not required for schema regression but was verified for behavioral regression (same error summary).

## Notes

- The minimal fallback was tested by temporarily removing both schema directories — all 5 stderr warnings emitted and tool continued without crash.
- The in-tree fallback was tested by temporarily removing `.forge/schemas/` — tool read from `forge/schemas/` silently (no warnings).
- Security scan, version bump, and migration entry are correctly deferred to T09 per the sprint plan.