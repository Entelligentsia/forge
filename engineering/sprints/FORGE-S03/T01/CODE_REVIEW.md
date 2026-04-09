# CODE REVIEW — FORGE-S03-T01: Eliminate tools regenerate target and embed store schemas

🌿 *Forge Supervisor*

**Task:** FORGE-S03-T01

---

**Verdict:** Approved

---

## Review Summary

Implementation is correct and complete. All nine files listed in the PROGRESS.md manifest were modified as specified. The embedded `SCHEMAS` constant in `validate-store.cjs` is correct — all five schemas include `additionalProperties: false`, the field definitions match the authoritative schema sources, and the tool is fully self-contained (confirmed by smoke test without `.forge/schemas/`). The Markdown edits are surgical and contain no prompt injection patterns. Security scan is deferred to T03 per the approved sprint architecture; no changes in this task introduce new security surface.

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | 〇 | Only `fs` and `path` (built-ins) |
| Hook exit discipline (exit 0 on error, not non-zero) | N/A | No hook files modified |
| Tool top-level try/catch + exit 1 on error | 〇 | `process.on('uncaughtException', ...)` + `process.exit(1)` present |
| `--dry-run` supported where writes occur | 〇 | `DRY_RUN` flag present; tool is read-only on `--dry-run` |
| Reads `.forge/config.json` for paths (no hardcoded paths) | 〇 | `config.paths?.store` with fallback string |
| Version bumped if material change | N/A | Deferred to T03 per task spec |
| Migration entry present and correct | N/A | Deferred to T03 per task spec |
| Security scan report committed | N/A | Deferred to T03 per sprint architecture (T03 is the gating task before release) |
| `additionalProperties: false` preserved in schemas | 〇 | All 5 embedded schemas verified |
| `node --check` passes on modified JS/CJS files | 〇 | Verified |
| `validate-store --dry-run` exits 0 | 〇 | Verified; also confirmed without `.forge/schemas/` present |
| No prompt injection in modified Markdown files | 〇 | Grep scan: no injection patterns found |

## Issues Found

None blocking.

---

## If Approved

### Advisory Notes

1. The embedded `SCHEMAS.sprint` includes `goal` and `features` fields that are not in the `sprint.schema.md` JSON Schema block. This is a pre-existing discrepancy between the markdown spec and the actual store records — the markdown was never updated when these fields were added. The embedded schema is correct (sourced from live store records). T02 or a follow-up task should bring `sprint.schema.md` in sync.

2. The `FALLBACK` object in `validate-store.cjs` is now dead code (the `schema` argument is always provided). It was retained as a safety net per the plan advisory. It is harmless and could be removed in a future cleanup task.

3. `forge/schemas/` files still exist in both `forge/schemas/` (plugin-shipped source) and `.forge/schemas/` (project copy). The `.forge/schemas/` copy is now orphaned — validate-store no longer reads from it. Users can safely delete `.forge/schemas/` after updating. T03's migration notes should mention this.
