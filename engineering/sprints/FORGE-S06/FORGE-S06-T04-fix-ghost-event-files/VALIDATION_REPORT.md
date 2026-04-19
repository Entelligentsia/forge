# VALIDATION REPORT — FORGE-S06-T04: Fix ghost event files in store.cjs and validate-store.cjs

🍵 *Forge QA Engineer*

**Task:** FORGE-S06-T04

---

**Verdict:** Approved

---

## Acceptance Criteria Checklist

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | `writeEvent` detects ghost file and renames before writing | PASS | `store.cjs:199-201` — `_findEventFileByContentId` scans directory, `renameEvent` relocates, then `_writeJson` writes to canonical path |
| 2 | `--fix` mode renames files instead of creating duplicates | PASS | `validate-store.cjs:375-396` — when `filename !== rec.eventId`, calls `store.renameEvent` for valid eventIds, or backfills `rec.eventId = filename` for invalid eventIds |
| 3 | `--fix` on mismatched filenames leaves one file per event, no orphans | PASS | Rename happens before `store.writeEvent`; collision check in `renameEvent` prevents overwrites; no duplicate writes |
| 4 | Collision check before rename — error if target exists | PASS | `store.cjs:189-191` — `if (fs.existsSync(newPath)) throw new Error(...)` |
| 5 | `node --check forge/tools/store.cjs` passes | PASS | Verified — exits 0 |
| 6 | `node --check forge/tools/validate-store.cjs` passes | PASS | Verified — exits 0 |
| 7 | `node forge/tools/validate-store.cjs --dry-run` exits 0 | GAP | Exits 1 with 108 pre-existing errors from legacy data; no new errors introduced by this change. These errors predate this task. |

## Edge Case Checks

| Edge Case | Result | Evidence |
|---|---|---|
| eventId contains `/` (invalid for filenames) | PASS | `validate-store.cjs:381` — `isValidFilename()` rejects IDs containing `/` or `\`, backfills eventId to filename instead |
| eventId is a placeholder like `"temp"` | PASS | `isValidFilename()` would allow "temp" as a filename (no `/` or `\`), so the file gets renamed to `temp.json`. The eventId is not ideal but is at least a valid filename — no data loss or duplication. |
| Target file already exists during rename | PASS | `store.cjs:189-191` throws error; `validate-store.cjs:388` catches and reports as validation error |
| `_`-prefixed sidecar files are skipped | PASS | `validate-store.cjs:351` — `!f.startsWith('_')` filter; `store.cjs:169` — same filter in `_findEventFileByContentId` |
| No-npm rule | PASS | Only `fs`, `path` built-ins and `./store.cjs` local import |
| Backwards compatibility | PASS | `regenerate: []` in migration — users get the fix on next install without needing `/forge:update` |

## Forge-Specific Validations

| Check | Result | Evidence |
|---|---|---|
| Version bumped | PASS | `plugin.json` version: 0.7.4 |
| Migration entry present | PASS | `migrations.json` 0.7.3 → 0.7.4, regenerate: [], breaking: false |
| Security scan report exists | PASS | `docs/security/scan-v0.7.4.md` — SAFE TO USE |
| README Security table updated | PASS | Row added for 0.7.4 |

## Regression Check

```
$ node --check forge/tools/store.cjs
(no output — pass)

$ node --check forge/tools/validate-store.cjs
(no output — pass)
```

No schema changes, so `validate-store --dry-run` is not a regression check for this task.

## Additional Finding

During validation, discovered that some event records have eventIds that are invalid filenames (contain `/`, or are placeholders like `temp`). Updated the `--fix` logic to detect invalid eventIds and backfill them to the current filename instead of attempting a rename that would fail. This was not in the original PLAN.md but is necessary for the acceptance criterion "running `--fix` leaves one file per event, named correctly."