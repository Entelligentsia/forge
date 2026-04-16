# VALIDATION REPORT — FORGE-S07-T05: Implement store-cli.cjs — deterministic store custodian CLI

🍵 *Forge QA Engineer*

**Task:** FORGE-S07-T05

---

**Verdict:** Approved

---

## Acceptance Criteria Verification

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | Tool exists at `forge/tools/store-cli.cjs` and is executable | PASS | `node forge/tools/store-cli.cjs --help` exits 0 with usage info |
| 2 | All 11 commands implemented: write, read, list, delete, update-status, emit, merge-sidecar, purge-events, write-collation-state, validate, emit --sidecar | PASS | Each command tested; dispatch table at line 721-735 covers all 10 command strings plus --sidecar variant |
| 3 | Entity types: sprint, task, bug, event, feature | PASS | `ENTITY_TYPES` array at line 25; validated `read sprint`, `validate bug`, `validate feature`, `write task`, `validate sprint` |
| 4 | Schema validation (R3): required, type, enum, additionalProperties: false, minimum | PASS | `write task '{"taskId":"X"}'` exits 1 with 4 missing-field errors; `validate sprint '{}'` exits 1 with 5 errors; `validate task '...extraField:1...'` exits 1 with "undeclared field" error |
| 5 | Status transition enforcement (R4): illegal blocked, --force bypasses | PASS | `update-status task ... status committed` on draft state exits 1; `--force` bypasses with stderr warning |
| 6 | Exit codes: 0 success, 1 failure; stderr errors; JSON stdout | PASS | Verified: success exits 0 with JSON on stdout; failure exits 1 with human-readable stderr |
| 7 | No npm dependencies | PASS | Only `require('fs')`, `require('path')`, `require('./store.cjs')` — all built-in or internal |
| 8a | `write task '{"taskId":"X"}'` exits 1 with validation errors | PASS | Exits 1; stderr: "sprintId: missing required field", "title: missing required field", "status: missing required field", "path: missing required field" |
| 8b | `validate sprint '{}'` exits 1 | PASS | Exits 1; stderr: 5 missing-field errors |
| 8c | `read sprint FORGE-S07` exits 0 and prints sprint record | PASS | Exits 0; stdout: complete JSON sprint record |
| 9 | `node --check forge/tools/store-cli.cjs` passes | PASS | Clean exit 0, no output |

## Edge Case Verification

| Case | Result | Evidence |
|---|---|---|
| Unknown entity type | PASS | `write unknown '{}'` exits 1 with "Unknown entity type: unknown" |
| Malformed JSON | PASS | `write task '{invalid json}'` exits 1 with "Invalid JSON: ..." |
| Unknown command | PASS | `unknown-command` exits 1 with "Unknown command" and help hint |
| Legal sprint transition (active → abandoned, a failed state) | PASS | `--dry-run` test shows preview; actual test confirms write succeeds |
| `--dry-run` on write prevents store mutation | PASS | `write sprint ... --dry-run` does not create file; `update-status ... --dry-run` does not change status |
| `--dry-run` on purge-events previews count | PASS | `[dry-run] would purge 34 event(s) for FORGE-S07` |
| Sidecar emit + merge lifecycle | PASS | Emit sidecar creates `_`-prefixed file; emit canonical event; merge-sidecar merges token fields and deletes sidecar |
| Entity not found on read | PASS | `read sprint NONEXISTENT` exits 1 |
| Field not found on update-status | PASS | `update-status task ... nonexistentField value` exits 1 |
| --json flag on read | PASS | `read sprint FORGE-S07 --json` outputs compact JSON |

## Forge-Specific Checks

| Check | Result | Evidence |
|---|---|---|
| `node --check forge/tools/store-cli.cjs` | PASS | Clean exit 0 |
| `validate-store --dry-run` (no schema changes) | N/A | No schemas modified by this task; pre-existing errors unchanged |
| Version bump (deferred to T09) | N/A | Task prompt: "Version bump: Required (included in T09)" |
| Security scan (deferred to T09) | N/A | Task prompt: "Security scan: Required (included in T09)" |
| No npm dependencies | PASS | Verified via `require()` scan |
| `additionalProperties: false` preserved | PASS | Enforced at write time; tested with `extraField` |

## Regression Check

- `node --check forge/tools/store-cli.cjs` — clean ✅
- Existing tools unchanged — no regression risk ✅
- `validate-store --dry-run` — same pre-existing errors, no new errors introduced ✅