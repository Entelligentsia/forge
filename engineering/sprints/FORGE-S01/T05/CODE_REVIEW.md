# CODE REVIEW — FORGE-S01-T05: collate.cjs — COST_REPORT.md generation

**Reviewer:** Supervisor
**Task:** FORGE-S01-T05

---

**Verdict:** Approved

---

## Review Summary

The implementation is well-structured and follows established patterns in the codebase. All four
cost report sections (per-task totals, per-role breakdown, revision waste, model split) are
correctly implemented using the existing `padTable()` and `writeFile()` helpers. The `tokenSource`
schema addendum is additive and non-breaking, the mirror copy in `.forge/schemas/` matches
exactly, and `estimate-usage.cjs` correctly writes `tokenSource: "estimated"` when back-filling.
The handling of missing `tokenSource` as `"(unknown)"` via the `sourceLabel()` helper is a clean
solution that addresses the plan review advisory note.

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | ✅ | Only `fs` and `path` (Node.js built-ins) in both modified tools |
| Hook exit discipline (exit 0 on error, not non-zero) | N/A | No hooks modified |
| Tool top-level try/catch + exit 1 on error | ❌ | Pre-existing: `collate.cjs` lacks top-level try/catch (not introduced by T05) |
| `--dry-run` supported where writes occur | ✅ | `DRY_RUN` flag checked in `writeFile()` helper; verified with independent run |
| Reads `.forge/config.json` for paths (no hardcoded paths) | ✅ | Uses `config.paths.store` and `config.paths.engineering` with sensible fallbacks |
| Version bumped if material change | N/A | Deferred to T08 per sprint plan |
| Migration entry present and correct | N/A | Deferred to T08 per sprint plan |
| Security scan report committed | N/A | Deferred to T08; no version bump in this task |
| `additionalProperties: false` preserved in schemas | ✅ | Verified in both `forge/schemas/event.schema.json` and `.forge/schemas/event.schema.json` |
| `node --check` passes on modified JS/CJS files | ✅ | Independently verified: both `collate.cjs` and `estimate-usage.cjs` exit 0 |
| `validate-store --dry-run` exits 0 | ✅ | Independently verified: exits 0 with 23 pre-existing errors (none introduced by T05) |
| No prompt injection in modified Markdown files | ✅ | `COST_REPORT.md` is generated output with no instruction patterns |

## Issues Found

1. **Low / Pre-existing / `forge/tools/collate.cjs`** — Missing top-level `try/catch` wrapping
   all logic. The stack checklist requires "Top-level `try/catch` with `process.exit(1)` wrapping
   all tool logic." The tool `estimate-usage.cjs` follows this pattern (lines 184-256) but
   `collate.cjs` runs at module scope without error wrapping. This is a pre-existing gap, not
   introduced by T05. **Recommendation:** File as a follow-up improvement or address in T08.

2. **Info / `forge/tools/estimate-usage.cjs:235`** — Sidecar filter uses `!f.includes('_sidecar')`
   (substring match) while `collate.cjs:208` uses `!f.startsWith('_')` (prefix check). The
   plan review advisory note #1 flagged this inconsistency. The prefix check in collate is more
   forward-compatible. Consider aligning `estimate-usage.cjs` in a future task.

---

## If Approved

### Advisory Notes

1. The pre-existing missing try/catch in `collate.cjs` should be addressed. Consider wrapping
   the main logic block (lines 80-401) in a try/catch with `process.exit(1)` during T08 or as
   a separate fix. This would align it with the pattern used by all other CJS tools.

2. The `REVIEW_PHASES` set (line 238) includes `'review-implementation'` in addition to the
   three phases listed in the plan (`review`, `review-plan`, `review-code`). This is a correct
   and forward-compatible enhancement -- no issue, just noting the deviation from plan.

3. Token formatting uses `toLocaleString('en-US')` which is environment-dependent in Node.js.
   In minimal environments without ICU data, this may not produce comma-separated output.
   Non-blocking -- the values remain correct, just potentially unformatted.
