# CODE REVIEW — FORGE-S01-T02: validate-store — handle new event token fields

**Reviewer:** Supervisor
**Task:** FORGE-S01-T02

---

**Verdict:** Approved

---

## Review Summary

The implementation is a comment-only change: a 5-line clarifying comment added above the
generic property loop in `validateRecord` (lines 51-55 of `forge/tools/validate-store.cjs`).
The comment accurately documents that the five optional token fields added in T01 are
handled automatically by the existing generic loop with no special-casing needed. All claims
in PROGRESS.md were independently verified.

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | ✅ | Only `fs` and `path` (Node.js built-ins) |
| Hook exit discipline (exit 0 on error, not non-zero) | N/A | Not a hook file |
| Tool top-level try/catch + exit 1 on error | ✅ | Already present (pre-existing) |
| `--dry-run` supported where writes occur | ✅ | Already present (pre-existing) |
| Reads `.forge/config.json` for paths (no hardcoded paths) | ✅ | Store path read from config with `.forge/store` as fallback default only |
| Version bumped if material change | N/A | Comment-only change; deferred to T08 per plan |
| Migration entry present and correct | N/A | No functional change |
| Security scan report committed | N/A | No executable logic changed; deferred to T08 |
| `additionalProperties: false` preserved in schemas | ✅ | Verified in `event.schema.json` line 30 |
| `node --check` passes on modified JS/CJS files | ✅ | Independently confirmed: exit 0 |
| `validate-store --dry-run` exits 0 | ✅ | 5 pre-existing errors (same baseline as T01); no new errors from token fields |
| No prompt injection in modified Markdown files | N/A | No Markdown instruction files modified in `forge/` |

## Issues Found

None.

---

## If Approved

### Advisory Notes

1. The 5 pre-existing store validation errors (missing `endTimestamp`, `durationMinutes`,
   `model` on T01 event records) should be addressed separately, either via `--fix` backfill
   rules or by cleaning up the in-flight event records.
2. The fallback `FALLBACK.event` list (line 83) correctly omits token fields, preserving
   backward compatibility when schemas are not installed.
