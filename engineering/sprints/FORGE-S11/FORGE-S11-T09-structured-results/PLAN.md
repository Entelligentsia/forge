# PLAN — FORGE-S11-T09: Structured Result returns for CJS module APIs (#49)

🌱 *Forge Engineer*

**Task:** FORGE-S11-T09
**Sprint:** FORGE-S11
**Estimate:** XL

---

## Objective

Refactor two exported functions in `forge/tools/*.cjs` from null-return failure patterns
to structured `{ ok: true, value }` / `{ ok: false, code, message }` Results.
A shared `forge/tools/lib/result.js` library provides `ok()`, `fail()`, and `RESULT_CODES`
constants so callers can branch on `result.code` rather than null-checking or string-matching.

Scope is intentionally narrow: only `resolveTaskDir` (collate.cjs) and `estimateTokens`
(estimate-usage.cjs) are changed. Both have exactly one internal call site each, making
the refactor bounded and safe. All 512 existing tests must pass; 14 new tests added.

## Approach

1. TDD: write failing tests for the new `result.js` lib and for the updated return shapes
   of `resolveTaskDir` and `estimateTokens`.
2. Create `forge/tools/lib/result.js` with `ok(value)`, `fail(code, message)`, and `RESULT_CODES`.
3. Update `resolveTaskDir` in `collate.cjs`: replace `return null` with `return fail(...)`;
   replace bare `return dir` with `return ok(dir)`. Update the one internal call site.
4. Update `estimateTokens` in `estimate-usage.cjs`: replace `return null` with `return fail(...)`;
   wrap the success return in `ok(...)`. Update the one internal call site in `processEvent`.
5. Run full test suite — all 526 tests pass.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/tools/lib/result.js` | NEW — `ok()`, `fail()`, `RESULT_CODES` | Shared Result helpers |
| `forge/tools/collate.cjs` | Import result.js; refactor `resolveTaskDir` + update call site | Structured error returns |
| `forge/tools/estimate-usage.cjs` | Import result.js; refactor `estimateTokens` + update call site | Structured error returns |
| `forge/tools/__tests__/result.test.cjs` | NEW — 14 tests for `ok()`, `fail()`, `RESULT_CODES` | TDD |
| `forge/tools/__tests__/collate.test.cjs` | Update `resolveTaskDir` tests to assert Result shape | TDD |
| `forge/tools/__tests__/estimate-usage.test.cjs` | Update `estimateTokens` tests to assert Result shape | TDD |

## Plugin Impact Assessment

- **Version bump required?** Yes — changes to `forge/tools/*.cjs` exports are material
- **Migration entry required?** Yes — regenerate: [tools] — callers of these exports must update
- **Security scan required?** Yes — changes to `forge/` source always require scan
- **Schema change?** No — no `.forge/schemas/*.schema.json` files changed

## Testing Strategy

- Syntax check: `node --check forge/tools/collate.cjs forge/tools/estimate-usage.cjs forge/tools/lib/result.js`
- Full suite: `node --test forge/tools/__tests__/*.test.cjs` — must show 526 pass, 0 fail
- No `validate-store --dry-run` needed (no schema change)

## Acceptance Criteria

- [x] `forge/tools/lib/result.js` created with `ok()`, `fail()`, `RESULT_CODES`
- [x] `resolveTaskDir` returns `{ ok: true, value }` on success and `{ ok: false, code: 'MISSING_DIR', message }` on miss
- [x] `estimateTokens` returns `{ ok: true, value }` on success and `{ ok: false, code: 'E_ZERO_DURATION'/'E_MISSING_DURATION', message }` on miss
- [x] Internal call sites in `collate.cjs` and `estimate-usage.cjs` updated to use `.ok` and `.value`
- [x] CLI exit-code contract unchanged (processEvent still returns 'skipped' on failure)
- [x] All 526 tests pass (512 original + 14 new)
- [x] `node --check` passes on all modified files

## Operational Impact

- **Distribution:** Users running `/forge:update` after the version bump will get the refactored exports.
  Any downstream code calling `resolveTaskDir` or `estimateTokens` and checking for `null` will
  need to be updated to check `result.ok`.
- **Backwards compatibility:** Breaking change to module API — callers must migrate.
  All internal call sites have been updated; no external known callers in the plugin itself.
