# PLAN — FORGE-S06-T04: Fix ghost event files in store.cjs and validate-store.cjs

🌱 *Forge Engineer*

**Task:** FORGE-S06-T04
**Sprint:** FORGE-S06
**Estimate:** M

---

## Objective

Fix `store.cjs` `writeEvent` to detect and rename pre-existing event files whose filenames do not match the canonical `data.eventId`, and fix `validate-store.cjs --fix` to rename mismatched event files instead of writing duplicates. This eliminates ghost files (orphaned originals left behind after a canonical write).

## Approach

Two coordinated changes:

1. **`store.cjs` — `FSImpl.writeEvent`**: Before writing to the canonical path, scan the sprint events directory for any `.json` file whose internal `eventId` field matches `data.eventId` but whose filename differs. If found, rename it to the canonical name (with collision check). Then write the data as usual.

2. **`validate-store.cjs` — `--fix` event backfill loop**: After backfilling fields on an event record, check whether the current filename matches `rec.eventId`. If it does not, rename the file to the canonical name (with collision check) instead of calling `store.writeEvent` (which would create a duplicate).

Both changes share the same low-level logic: find a file by content `eventId` when the filename does not match, and rename it. To avoid duplication, add a private `_findEventFileByContentId` helper to `FSImpl` and expose a new `renameEvent` method. The validate-store fix will use `store.renameEvent` directly rather than relying on the implicit rename in `writeEvent`.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/tools/store.cjs` | Add `_findEventFileByContentId(sprintId, eventId)` helper; add `renameEvent(sprintId, oldFilename, newEventId)` method; update `writeEvent` to detect ghost file and rename before write | Eliminates ghost file creation at the source — any caller of `writeEvent` benefits |
| `forge/tools/validate-store.cjs` | After event backfill, detect filename/eventId mismatch and call `store.renameEvent` instead of relying solely on `store.writeEvent`; add collision check | Prevents `--fix` from creating duplicate files when it backfills eventId |

## Detailed Design

### store.cjs — `_findEventFileByContentId(sprintId, eventId)`

Scans the events directory for a given sprint. For each `.json` file, reads the `eventId` field. Returns the filename of the first file whose content `eventId` matches the given `eventId` but whose filename (sans `.json`) does NOT match. Returns `null` if no such file is found.

Skips files with leading `_` (sidecar/ephemeral files per the existing convention).

### store.cjs — `renameEvent(sprintId, oldFilename, newEventId)`

1. Construct `oldPath` = `events/{sprintId}/{oldFilename}.json`
2. Construct `newPath` = `events/{sprintId}/{newEventId}.json`
3. **Collision check**: if `newPath` already exists on disk and `oldPath !== newPath`, throw an `Error` with a clear message (e.g. `"Cannot rename event: target file already exists: {newPath}"`)
4. `fs.renameSync(oldPath, newPath)`

Exposed through the `Store` facade as `store.renameEvent(sprintId, oldFilename, newEventId)`.

### store.cjs — Updated `writeEvent(sprintId, data)`

Before the existing write:

1. Compute `canonicalFilename = data.eventId`
2. Call `this._findEventFileByContentId(sprintId, data.eventId)`
3. If a ghost file is found (`oldFilename !== canonicalFilename`):
   - Call `this.renameEvent(sprintId, oldFilename, data.eventId)` — this handles collision
4. Proceed with the existing `this._writeJson(canonicalPath, data)` as before

This ensures that when `writeEvent` is called with data whose `eventId` differs from an existing file's name (but the file's content `eventId` matches), the old file is renamed out of the way first.

### validate-store.cjs — `--fix` event loop

Currently (lines 354-366):

```javascript
if (FIX_MODE) {
  const rules = BACKFILL.event;
  let changed = false;
  for (const [field, derive] of Object.entries(rules)) {
    if (rec[field] === undefined || rec[field] === null || rec[field] === '') {
      const val = derive(rec, eventId);
      rec[field] = val;
      console.log(`FIXED  ${sprintId}/${eventId}: backfilled "${field}" = "${val}"`);
      changed = true;
      fixesCount++;
    }
  }
  if (changed) store.writeEvent(sprintId, rec);
}
```

The problem: when `eventId` was backfilled (the `eventId: (_rec, id) => id` rule), the file's original name likely doesn't match the new `rec.eventId`. `store.writeEvent` creates a new file with the canonical name, but the old file remains.

Fix: after backfill, check if the original filename (from the directory listing) differs from `rec.eventId`. If so, rename the file first, then write only if there are additional field changes beyond the eventId.

To track the original filename, we need to iterate over directory entries (filenames) rather than just the parsed JSON records. This requires restructuring the event loop slightly:

1. Read the events directory via `fs.readdirSync`
2. For each filename, read and parse the JSON
3. After backfill, compare filename (sans `.json`) to `rec.eventId`
4. If mismatched, call `store.renameEvent(sprintId, filename, rec.eventId)`
5. If additional fields changed, call `store.writeEvent` (which now handles ghosts gracefully)

### validate-store.cjs — Sidecar skip in backfill

The existing code already skips `_`-prefixed files in `listEvents` because the `filter` callback checks `!e` (null records from sidecar files that fail schema validation). However, to be explicit, the filename iteration should skip `_`-prefixed files.

## Plugin Impact Assessment

- **Version bump required?** Yes — fixes a data integrity bug in distributed tooling (`store.cjs` and `validate-store.cjs`)
- **Migration entry required?** Yes — `regenerate: []` (tools are copied on install, not regenerated)
- **Security scan required?** Yes — changes to `forge/tools/` require scan
- **Schema change?** No — the event schema is unchanged; this is a behavioral fix in tooling only

New version: **0.7.4**

## Testing Strategy

- Syntax check: `node --check forge/tools/store.cjs forge/tools/validate-store.cjs`
- Store validation: `node forge/tools/validate-store.cjs --dry-run`
- Manual verification: the existing mismatched event files in the store (found 24 mismatches across FORGE-S02, FORGE-S04, FORGE-S05) will serve as a real-world test case. After implementation, running `node forge/tools/validate-store.cjs --fix` should rename all mismatched files to match their `eventId`, leaving zero orphans.

## Acceptance Criteria

- [ ] `writeEvent` detects when an event file exists on disk with a filename that doesn't match `data.eventId`. In that case, it renames the existing file to match the canonical `eventId` before writing the new data
- [ ] `--fix` mode in validate-store persists event backfills by renaming the on-disk file to match the canonical `eventId`, not by writing a second file
- [ ] Running `validate-store --fix` on a store with mismatched event filenames leaves exactly one file per event, named correctly; no orphaned originals remain
- [ ] Before renaming, check for collision — if a file with the target name already exists, error explicitly rather than silently overwriting
- [ ] `node --check forge/tools/store.cjs` passes
- [ ] `node --check forge/tools/validate-store.cjs` passes
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0

## Operational Impact

- **Distribution:** Users who install 0.7.4 will get the fix automatically. No `/forge:update` regeneration step required (tools are copied, not regenerated from templates).
- **Backwards compatibility:** Fully compatible. The rename-before-write behavior only triggers when a ghost file exists; normal writes are unaffected.