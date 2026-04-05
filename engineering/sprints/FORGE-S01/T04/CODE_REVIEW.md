# CODE REVIEW — FORGE-S01-T04: estimate-usage.cjs — token estimation fallback tool

**Reviewer:** Supervisor
**Task:** FORGE-S01-T04
**Iteration:** 2

---

**Verdict:** Approved

---

## Review Summary

Iteration 2 re-review confirms the previous finding (removal of
`process.on('uncaughtException', ...)` handler) has been cleanly addressed.
The implementation follows established patterns from `collate.cjs` and
`validate-store.cjs`, meets all acceptance criteria, and introduces no new
issues. The tool is well-structured with documented heuristic tables, correct
atomic-write semantics, and robust argument handling.

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | PASS | Only `fs` and `path` (Node.js built-ins) |
| Hook exit discipline (exit 0 on error, not non-zero) | N/A | This is a tool, not a hook |
| Tool top-level try/catch + exit 1 on error | PASS | Lines 184-256 — outer try/catch calls `process.exit(1)` on error |
| `--dry-run` supported where writes occur | PASS | Line 186 — `args.includes('--dry-run')` |
| Reads `.forge/config.json` for paths (no hardcoded paths) | PASS | `readConfig()` resolves `paths.store`; fallback to `'.forge/store'` matches established pattern in `collate.cjs` and `validate-store.cjs` |
| Version bumped if material change | N/A | Deferred to T08 per approved plan |
| Migration entry present and correct | N/A | Deferred to T08 per approved plan |
| Security scan report committed | N/A | Deferred to T08 per approved plan — no version bump in this task |
| `additionalProperties: false` preserved in schemas | N/A | No schema changes in this task |
| `node --check` passes on modified JS/CJS files | PASS | Verified independently — exit 0 |
| `validate-store --dry-run` exits 0 | PASS | 16 pre-existing errors in old event records (missing `endTimestamp`, `model`, etc.) predate this task; no new errors introduced by token estimation fields |
| No prompt injection in modified Markdown files | N/A | No Markdown instruction files modified |

## Revision 1 Verification

The `process.on('uncaughtException', ...)` handler that was present at lines
18-20 in the original submission has been removed. Grep confirms no
`process.on(` calls remain in the file. The top-level `try/catch` at lines
184-256 handles all error paths correctly with `process.exit(1)`.

## Issues Found

None.

---

## If Approved

### Advisory Notes

1. **Lint command updated** -- `.forge/config.json` `commands.lint` now includes
   `estimate-usage.cjs`. This was a plan review advisory item and has been
   correctly addressed during implementation.

2. **`durationMinutes: 0` handling** -- The tool returns `null` (causing a skip)
   when `durationMinutes` is 0, which means zero-duration events get no token
   estimate at all rather than getting an estimate of 0 tokens. This is a
   reasonable defensive choice, but note it means those events will remain
   unfilled. The warn log on line 113 ensures visibility.

3. **Pricing simplification** -- The single-price-for-both-directions approach is
   documented with a `// TODO` on line 38 for T05 refinement. Acceptable for the
   estimation use case.
