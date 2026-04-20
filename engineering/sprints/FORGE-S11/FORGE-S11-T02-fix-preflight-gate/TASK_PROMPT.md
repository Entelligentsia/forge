# FORGE-S11-T02: Fix preflight-gate: wrong gate selection + ReferenceError crash (#58/#59)

**Sprint:** FORGE-S11
**Estimate:** M
**Pipeline:** default

---

## Objective

Two bugs in `forge/tools/preflight-gate.cjs`:

1. **#58 — Wrong gate:** When multiple workflow files exist, the gate resolves using the alphabetically-first match (`fix_bug.md`) instead of the caller's explicitly passed workflow name. This applies wrong gate conditions.

2. **#59 — Crash:** `ReferenceError: Cannot access '<variable>' before initialization` when evaluating the `implement` phase gate, causing the tool to crash (instead of returning exit code 2 for misconfiguration).

## Acceptance Criteria

1. Gate resolution uses the explicitly passed workflow name; alphabetical ordering cannot override it.
2. `implement` phase gate evaluates without crash; returns exit code 0 (pass), 1 (fail), or 2 (misconfigured) — never throws.
3. All existing `preflight-gate.test.cjs` tests pass.
4. New tests cover both regressions: one for wrong-gate selection, one for the implement-phase crash.
5. `node --check forge/tools/preflight-gate.cjs` exits 0.

## Context

- GitHub issues: #58, #59
- Read the full `preflight-gate.cjs` before touching anything — understand the scan/match logic and the variable initialization order.
- Write a failing test for EACH bug before fixing. Both regressions must have test coverage.
- Run full suite: `node --test forge/tools/__tests__/*.test.cjs` — all 241 tests must pass.

## Plugin Artifacts Involved

- `forge/tools/preflight-gate.cjs` — primary fix
- `forge/tools/__tests__/preflight-gate.test.cjs` — two new regression tests

## Operational Impact

- **Version bump:** required (addressed in T08)
- **Regeneration:** users must run `/forge:update-tools` after installing (tools target)
- **Security scan:** required (addressed in T08)
