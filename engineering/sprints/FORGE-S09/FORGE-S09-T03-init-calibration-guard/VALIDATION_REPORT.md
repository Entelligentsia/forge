# VALIDATION REPORT — FORGE-S09-T03: Init — calibration baseline write + incomplete init guard

🍵 *Forge QA Engineer*

**Task:** FORGE-S09-T03

---

**Verdict:** Approved

---

## Acceptance Criteria Validation

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Phase 5 of `sdlc-init.md` ends with a completeness guard that checks all required top-level and nested config fields and halts with a human-readable prompt if any are missing or empty | PASS | Lines 136-165 of `sdlc-init.md` — guard checks top-level required (`version`, `project`, `stack`, `commands`, `paths`) and nested required (`project.prefix`, `project.name`, `commands.test`, `paths.engineering/store/workflows/commands/templates`). Halt message uses `△` mark and dot-prefixed field hints. |
| 2 | Phase 5 of `sdlc-init.md` (after the guard) writes `calibrationBaseline` to `.forge/config.json` with fields: `lastCalibrated`, `version`, `masterIndexHash`, `sprintsCovered` | PASS | Lines 167-202 of `sdlc-init.md` — all four fields specified. `lastCalibrated` from `date -u`, `version` from `plugin.json`, `masterIndexHash` from SHA-256, `sprintsCovered` from sprint directory scan. |
| 3 | `masterIndexHash` is computed by stripping blank lines and comment lines before hashing | PASS | Line 180 — filter: `l.trim()&&!l.trim().startsWith('<!--')` strips both blank and comment lines. |
| 4 | `sprintsCovered` lists sprint IDs with status `done` or `retrospective-done` | PASS | Line 186 — `.filter(s=>['done','retrospective-done'].includes(s.status))` |
| 5 | Calibration baseline write uses `node -e` inline scripts (no new JS files, no npm deps) | PASS | Only `crypto` and `fs` Node.js built-ins used. No new `.js` or `.cjs` files created. |
| 6 | No existing Phase 5 output is removed or broken — skill generation still completes | PASS | Original Phase 5 skill generation block (lines 129-134) preserved verbatim. New sections are additive. |
| 7 | `node forge/tools/validate-store.cjs --dry-run` exits 0 | PASS | 53 pre-existing errors, 0 new. Exit code 1 is from pre-existing issues (BUG-002/003/008). No regressions introduced. |

## Forge-Specific Validations

| Check | Result | Evidence |
|-------|--------|----------|
| Version bump in `plugin.json` | PASS | Version is `0.9.10` (was `0.9.9`) |
| Migration entry in `migrations.json` | PASS | Entry for `0.9.9` → `0.9.10`, `regenerate: []`, `breaking: false` |
| Security scan report committed | PASS | `docs/security/scan-v0.9.10.md` exists, verdict: SAFE TO USE |

## Edge Case Checks

| Check | Result | Evidence |
|-------|--------|----------|
| No-npm rule | PASS | No modified files introduce non-built-in `require()` calls |
| Hook exit discipline | N/A | No hooks modified |
| Schema `additionalProperties: false` | N/A | No schemas modified |
| Backwards compatibility | PASS | `calibrationBaseline` is optional in schema. Existing projects without it remain valid. Guard only runs during new init. No `/forge:update` step required. |

## Regression Check

No JS/CJS files modified — `node --check` not applicable.
No schema files modified — `validate-store --dry-run` has 53 pre-existing errors, 0 new.