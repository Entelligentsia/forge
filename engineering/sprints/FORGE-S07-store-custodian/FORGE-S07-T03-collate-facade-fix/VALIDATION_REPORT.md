# VALIDATION REPORT — FORGE-S07-T03: Fix collate.cjs facade bypasses — writeCollationState and purgeEvents

🍵 *Forge QA Engineer*

**Task:** FORGE-S07-T03

---

**Verdict:** Approved

---

## Acceptance Criteria Checklist

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | Line ~509: `writeFile(path.join(storeRoot, 'COLLATION_STATE.json'), ...)` replaced with `store.writeCollationState(stateData)` | PASS | Grep confirms `store.writeCollationState(stateData)` at line 512; no `writeFile(path.join(storeRoot` found in file |
| 2 | Line ~532: `fs.rmSync(eventsDir, ...)` replaced with `store.purgeEvents(SPRINT_ARG, { dryRun: DRY_RUN })` | PASS | Grep confirms `store.purgeEvents(SPRINT_ARG, { dryRun: DRY_RUN })` at line 522; no `fs.rmSync` found in file |
| 3 | `node --check forge/tools/collate.cjs` passes | PASS | Verified independently: exit 0 |
| 4 | Running `node forge/tools/collate.cjs` produces the same output as before | PASS | Normal mode outputs: "Collated: 7 sprint(s), 14 bug(s) -> MASTER_INDEX.md updated, 7 COST_REPORT(s) written". MASTER_INDEX.md and COST_REPORT.md generated correctly. DRY_RUN mode correctly suppresses COLLATION_STATE.json write. |
| 5 | `--purge-events` flag still works end-to-end | PASS | `--purge-events --dry-run` with FORGE-S01 reports "would purge: .forge/store/events/FORGE-S01/ (52 file(s))" without deleting. Non-existent sprint ID gives "nothing to delete". All 52 event files still present after dry-run. |

## Edge Case Checks

| Check | Result | Evidence |
|---|---|---|
| No-npm rule | PASS | No new `require()` calls introduced. Existing requires: `fs`, `path`, `./store.cjs` — all built-ins or internal. |
| Path-traversal guard | PASS | `store.purgeEvents()` implements the guard internally. Verified: passing `../../etc` as sprintId throws Error with "escapes store root" message. The try/catch in collate.cjs catches this and exits with code 1. |
| Dry-run mode | PASS | `--dry-run` correctly suppresses writeCollationState (logs "would write" message) and passes `dryRun: true` to purgeEvents. No files written or deleted in dry-run mode. |
| Missing events directory | PASS | Non-existent sprint ID produces "nothing to delete" message without error. |

## Regression Check

```
$ node --check forge/tools/collate.cjs
PASS (exit 0)
```

No schema changes — `validate-store.cjs --dry-run` not required for this task.

## Forge-Specific Validations

- **Version bump:** Deferred to T09 per task prompt. Not validated in this task.
- **Migration entry:** Deferred to T09. Not validated in this task.
- **Security scan:** Deferred to T09 per task prompt. Not validated in this task.
- **Schema change:** No schemas modified. N/A.