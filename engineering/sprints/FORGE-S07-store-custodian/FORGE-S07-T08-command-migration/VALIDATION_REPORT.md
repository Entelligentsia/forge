# VALIDATION REPORT — FORGE-S07-T08: Update migrate.md command — replace direct store writes with custodian references

🍵 *Forge QA Engineer*

**Task:** FORGE-S07-T08

---

**Verdict:** Approved

---

## Acceptance Criteria Validation

| # | Criterion | Evidence | Result |
|---|---|---|---|
| 1 | `migrate.md` write step uses `/forge:store write <entity> '{updated-json}'` | Line 93: `node "$FORGE_ROOT/tools/store-cli.cjs" write <entity> '{updated-json}'` | PASS |
| 2 | Read step may use Read tool or `/forge:store read` | Lines 98-99: "using the Read tool or `/forge:store read <entity> <id>`" | PASS |
| 3 | `grep '.forge/store' migrate.md` returns zero write-path instructions | Only match: line 21 (read config path in Step 1) | PASS |
| 4 | Command reads as clear step-by-step guide | Steps 1-7 intact; Step 5 has clear custodian invocation + error handling | PASS |

## Edge Case Checks

| Check | Result | Notes |
|---|---|---|
| No-npm rule | N/A | No JS/CJS files modified |
| Hook exit discipline | N/A | No hooks modified |
| Schema additionalProperties | N/A | No schemas modified |
| Backwards compatibility | PASS | Existing stores unaffected; custodian writes same format |

## Regression Check

- No JS/CJS files modified -- `node --check` N/A
- No schema changes -- `validate-store --dry-run` not required for schema regression
- `node forge/tools/validate-store.cjs --dry-run` executed as sanity check: exits 0

## Forge-Specific Validations

- **Version bump:** Deferred to T09 (correct per plan)
- **Migration entry:** Deferred to T09 (correct per plan)
- **Security scan:** Deferred to T09 (correct per plan)