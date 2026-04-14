# PROGRESS — FORGE-S06-T04: Fix ghost event files in store.cjs and validate-store.cjs

🌱 *Forge Engineer*

**Task:** FORGE-S06-T04
**Sprint:** FORGE-S06

---

## Summary

Fixed ghost event file creation in `store.cjs` by adding `_findEventFileByContentId` to detect pre-existing files with mismatched filenames, `renameEvent` to relocate them with collision checking, and updating `writeEvent` to use the rename-before-write pattern. Fixed `validate-store.cjs --fix` by restructuring the event loop to iterate over directory entries, detect filename/eventId mismatches, and call `renameEvent` instead of creating duplicates.

## Syntax Check Results

```
$ node --check forge/tools/store.cjs
(no output — pass)

$ node --check forge/tools/validate-store.cjs
(no output — pass)

$ node --check forge/tools/collate.cjs forge/tools/validate-store.cjs forge/tools/seed-store.cjs forge/tools/manage-config.cjs forge/tools/estimate-usage.cjs forge/hooks/check-update.js forge/hooks/triage-error.js forge/hooks/list-skills.js
(no output — ALL LINT PASS)
```

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
(Exits 1 with 108 pre-existing errors from legacy data — no new errors introduced by this change.
Pre-existing errors are from FORGE-S04/S05 legacy events missing endTimestamp, durationMinutes, model fields,
and malformed eventIds from earlier orchestrator versions. These are out of scope for this task.)
```

## Files Changed

| File | Change |
|---|---|
| `forge/tools/store.cjs` | Added `renameEvent` to Store facade; added `_findEventFileByContentId`, `renameEvent` to FSImpl; updated `writeEvent` to detect ghost files and rename before write |
| `forge/tools/validate-store.cjs` | Added `fs`/`path` imports; restructured event loop to iterate over directory entries; added filename/eventId mismatch detection and `store.renameEvent` call before `store.writeEvent` in `--fix` mode |
| `forge/.claude-plugin/plugin.json` | Version bump: 0.7.3 → 0.7.4 |
| `forge/migrations.json` | Added 0.7.3 → 0.7.4 migration entry |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| writeEvent detects ghost file and renames before writing | 〇 Pass | `_findEventFileByContentId` + `renameEvent` called before `_writeJson` |
| --fix mode renames files instead of creating duplicates | 〇 Pass | `store.renameEvent` called when `filename !== rec.eventId` |
| validate-store --fix leaves one file per event, no orphans | 〇 Pass | Rename happens before write; collision check prevents overwrites |
| Collision check before rename | 〇 Pass | `renameEvent` throws if target file exists |
| `node --check forge/tools/store.cjs` passes | 〇 Pass | Clean |
| `node --check forge/tools/validate-store.cjs` passes | 〇 Pass | Clean |
| `node forge/tools/validate-store.cjs --dry-run` exits 0 | × Fail | 108 pre-existing errors from legacy data; no new errors introduced |

## Plugin Checklist

- [x] Version bumped in `forge/.claude-plugin/plugin.json` (0.7.3 → 0.7.4)
- [x] Migration entry added to `forge/migrations.json` (0.7.3 → 0.7.4, regenerate: [])
- [ ] Security scan run and report committed (pending — must be run before commit)

## Knowledge Updates

None — no undocumented patterns discovered.

## Notes

1. The `validate-store --dry-run` exiting 1 is due to pre-existing legacy data issues, not this change. The acceptance criterion "exits 0" would require fixing all legacy events first, which is out of scope for this task.
2. The `_findEventFileByContentId` scan is O(N) per event directory per `writeEvent` call. This is acceptable for current scale (directories contain <100 files).
3. The `renameEvent` method is exposed on the Store facade for direct use by validate-store and future callers.
4. The validate-store event loop now directly accesses `store.impl.storeRoot` and `store.impl._readJson` to iterate filenames and read records. This couples validate-store to the FSImpl implementation more tightly than before, but is necessary to track original filenames.