# VALIDATION REPORT — FORGE-S11-T05: Fix calibrationBaseline missing from fast-mode init and update (#55)

🍵 *Forge QA Engineer*

**Task:** FORGE-S11-T05

---

**Verdict:** Approved

---

## Acceptance Criteria Validation

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | After `/forge:init --fast`, `config.json` contains valid `calibrationBaseline` with fields `lastCalibrated`, `version`, `masterIndexHash`, `sprintsCovered` | PASS | Sub-step 7-fast-b in `forge/init/sdlc-init.md` writes all 4 fields via Node.js inline at line 604 |
| 2 | After `/forge:update` with regeneration targets, `calibrationBaseline` refreshed in `config.json` | PASS | "Refresh calibrationBaseline" sub-section added to Step 4 of `forge/commands/update.md`, conditional on non-empty targets |
| 3 | `/forge:calibrate` runs without "no calibrationBaseline" abort for fast-mode projects | PASS | `forge/commands/calibrate.md` Step 2 aborts on absent field; sub-step 7-fast-b ensures the field is always written |
| 4 | Phase 7-fast numbering NOT changed | PASS | New content is sub-step "7-fast-b", not a new numbered phase; all existing phase numbers unchanged |
| 5 | `validate-store --dry-run` exits 0 | PASS | `Store validation passed (11 sprint(s), 71 task(s), 17 bug(s)).` |
| 6 | Sub-step algorithm matches Step 5/6-b verbatim | PASS | Steps 1–5 in 7-fast-b identical to Steps 1–5 in Step 5/6-b (verified character-by-character via diff) |

## Edge Case Checks

- **No-npm rule:** The inline Node.js blocks reference only `fs` and `crypto` — both built-ins. PASS.
- **Hook exit discipline:** No hook files modified. N/A.
- **Schema `additionalProperties: false`:** No schema changes. N/A.
- **Backwards compatibility:** Changes are additive instruction additions to Markdown files. Existing
  projects without `calibrationBaseline` can run `/forge:update` to get the refreshed workflows and
  then run `/forge:calibrate` which will still abort (correctly) until they re-init or run
  `/forge:calibrate` to establish one — this is correct existing behavior. Existing full-mode
  projects already have `calibrationBaseline` and are unaffected.

## Regression Check

```
$ node forge/tools/validate-store.cjs --dry-run
Store validation passed (11 sprint(s), 71 task(s), 17 bug(s)).
```

No JS/CJS files modified — `node --check` not applicable.

## Version Bump / Migration / Security Scan

All deferred to T08 (release engineering task) per sprint plan. No blocking issues.
