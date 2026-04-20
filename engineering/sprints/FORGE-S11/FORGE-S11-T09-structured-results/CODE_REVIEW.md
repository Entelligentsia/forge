# CODE REVIEW — FORGE-S11-T09: Structured Result returns for CJS module APIs (#49)

🌿 *Forge Supervisor*

**Task:** FORGE-S11-T09

---

**Verdict:** Approved

---

## Review Summary

Implementation is clean and correct. Three files modified (collate.cjs, estimate-usage.cjs,
lib/result.js) plus two test files updated and one new test file added. All 526 tests pass.
TDD discipline was followed: tests written first (12 failing), implementation applied,
then all tests green. Internal call sites updated correctly; CLI exit-code contract unchanged.

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | 〇 | `lib/result.js` uses Node.js built-ins only |
| Hook exit discipline (exit 0 on error, not non-zero) | 〇 | No hooks modified |
| Tool top-level try/catch + exit 1 on error | 〇 | Unchanged in collate.cjs and estimate-usage.cjs |
| `--dry-run` supported where writes occur | 〇 | processEvent dry-run unchanged |
| Reads `.forge/config.json` for paths (no hardcoded paths) | 〇 | No path logic changed |
| Version bumped if material change | N/A | Version bump is commit-phase task |
| Migration entry present and correct | N/A | Commit-phase task |
| Security scan report committed | N/A | Commit-phase task |
| `additionalProperties: false` preserved in schemas | N/A | No schema changes |
| `node --check` passes on modified JS/CJS files | 〇 | Verified: collate.cjs, estimate-usage.cjs, lib/result.js |
| `validate-store --dry-run` exits 0 | N/A | No schema changes |
| No prompt injection in modified Markdown files | N/A | No new Markdown files |

## Issues Found

None. All implementation correct.

Key observations:
- `collate.cjs` call site at line ~524 correctly uses `dirResult.ok` and `dirResult.value`
- `estimate-usage.cjs` `processEvent` correctly switches from `if (!estimates)` to `if (!estimatesResult.ok)`
- `RESULT_CODES` constants are imported and used (no magic strings)
- Both `resolveTaskDir` and `estimateTokens` return the same structural envelope on every code path

---

## If Approved

### Advisory Notes

- Commit phase should bump version to 0.21.0 and add migration entry with `regenerate: ["tools"]`
- Security scan required as part of commit phase (any `forge/` change)
- The `RESULT_CODES` export from `lib/result.js` is available to callers who need to branch on code
