# FORGE-S06-T04: Fix ghost event files in store.cjs and validate-store.cjs

**Sprint:** FORGE-S06
**Estimate:** M
**Pipeline:** default

---

## Objective

Fix `store.cjs` `writeEvent` to handle filename mismatches and fix `validate-store.cjs --fix` to rename files instead of creating duplicates. This closes SPRINT_REQUIREMENTS item 2 (ghost event files).

## Acceptance Criteria

1. `writeEvent` detects when an event file exists on disk with a filename that doesn't match `data.eventId`. In that case, it renames the existing file to match the canonical `eventId` before writing the new data
2. `--fix` mode in validate-store persists event backfills by renaming the on-disk file to match the canonical `eventId`, not by writing a second file
3. Running `validate-store --fix` on a store with mismatched event filenames leaves exactly one file per event, named correctly; no orphaned originals remain
4. Before renaming, check for collision — if a file with the target name already exists, error explicitly rather than silently overwriting
5. `node --check forge/tools/store.cjs` passes
6. `node --check forge/tools/validate-store.cjs` passes
7. `node forge/tools/validate-store.cjs --dry-run` exits 0

## Context

**The bug:** When `writeEvent` is called with data that has `eventId = "X"`, but a file named `Y.json` already exists on disk containing that same event (perhaps from a prior write when eventId was different), `writeEvent` creates a new file `X.json` alongside the old `Y.json`. This leaves a ghost file.

**Current code in store.cjs (FSImpl.writeEvent):**
```javascript
writeEvent(sprintId, data) {
  const p = path.join(this.storeRoot, 'events', sprintId, `${data.eventId}.json`);
  return this._writeJson(p, data);
}
```

It writes to the canonical path but never checks for or cleans up the old file.

**Current code in validate-store.cjs (--fix for events):**
```javascript
if (changed) store.writeEvent(sprintId, rec);
```

This calls `writeEvent` which creates a new file. If the existing file's name doesn't match `rec.eventId` (because the eventId was backfilled), the old file remains.

**Fix approach:**

For `writeEvent`:
1. Before writing, scan the events directory for any JSON file whose `eventId` field matches `data.eventId` but whose filename doesn't
2. If found, rename the old file to match the canonical name
3. Check for collision before rename

For `--fix` in validate-store:
1. When backfilling an event's `eventId`, check if the file's current name doesn't match
2. If mismatched, rename the file instead of writing a second one

## Plugin Artifacts Involved

- `forge/tools/store.cjs` — `writeEvent` method in FSImpl class
- `forge/tools/validate-store.cjs` — event backfill section in `--fix` mode

## Operational Impact

- **Version bump:** required — fixes a data integrity bug in distributed tooling
- **Regeneration:** no user action needed (tools are copied, not regenerated)
- **Security scan:** required