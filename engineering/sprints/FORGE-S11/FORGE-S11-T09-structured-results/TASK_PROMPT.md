# FORGE-S11-T09: Structured Result returns for CJS module APIs (#49) [nice-to-have]

**Sprint:** FORGE-S11
**Estimate:** XL
**Pipeline:** default
**Depends on:** FORGE-S11-T08

---

## Objective

Exported functions in `forge/tools/*.cjs` currently throw or return `null` silently. LLM consumers cannot branch on error type without string-matching exceptions. Refactor module exports to return structured Results: `{ ok: true, value }` on success or `{ ok: false, code, message }` on failure — so callers can branch on `result.code`.

**Only begin this task if T01–T08 are all committed.** If must-haves are not all done, skip this task entirely.

## Acceptance Criteria

1. All modified CJS module exports return `{ ok: true, value }` or `{ ok: false, code, message }` instead of throwing or returning null.
2. CLI exit-code contract is unchanged (wrapper around the Result in main() still calls `process.exit(N)`).
3. Shared error codes defined in a constants file or inline enum (not magic strings).
4. All 241+ existing tests pass; new tests added for each modified export.
5. `node --check` passes on all modified `.cjs` files.
6. Scope: module exports only — internal helper functions, CLI parsing, and hook files are out of scope.

## Context

- GitHub issue: #49
- This is XL scope — do not start until T01–T08 are all committed and version bump is done.
- Write tests FIRST for each export being changed (TDD per CLAUDE.md).
- Target files: `store-cli.cjs`, `collate.cjs`, `validate-store.cjs`, `seed-store.cjs`, `estimate-usage.cjs`, and any others with exported APIs.
- Check each file's `module.exports` to determine scope.

## Plugin Artifacts Involved

- `forge/tools/store-cli.cjs`
- `forge/tools/collate.cjs`
- `forge/tools/validate-store.cjs`
- `forge/tools/seed-store.cjs`
- `forge/tools/estimate-usage.cjs`
- `forge/tools/__tests__/*.test.cjs` — new tests for each modified export

## Operational Impact

- **Version bump:** required (separate from T08 — this is a further bump after T08)
- **Regeneration:** users must run `/forge:update-tools`
- **Security scan:** required
