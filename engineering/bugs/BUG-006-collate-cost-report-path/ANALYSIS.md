# BUG-006 — Analysis: collate COST_REPORT.md written to SNN/ stub dirs

**GitHub:** Entelligentsia/forge#21
**Severity:** Major
**File:** `forge/tools/collate.cjs`, lines 246–251

## Root Cause

```js
const sprintDirName = resolveDir(
  path.join(engRoot, 'sprints'),
  sprint.sprintId,                    // e.g. 'S30'
  sprint.sprintId.split('-').pop()    // also 'S30' — no hyphen in sprint IDs
);
```

`resolveDir` checks candidates in order and returns the first that exists on
disk; if none exists it returns the last candidate as fallback — creating the
directory if the caller then writes to it.

For IDs without hyphens (all standard sprint IDs: `S01`, `S02`, …, `S30`),
`sprintId.split('-').pop()` is identical to `sprintId`. Both candidates are the
same non-existent string. `resolveDir` falls back to that string. The caller
writes `COST_REPORT.md` there, implicitly creating `sprints/S30/`.

The sprint JSON already has the correct path:

```json
{
  "sprintId": "S30",
  "path": "engineering/sprints/sprint_30_panohost_archival_recovery/",
  ...
}
```

This `path` field is used correctly for MASTER_INDEX task link generation
(line 162: `if (t.path) { ... }`) but is completely ignored in the
COST_REPORT block.

## Fix

Derive the sprint directory from `sprint.path` when present — same pattern
already used for tasks. Fall back to `resolveDir` only when `path` is absent.

```js
// forge/tools/collate.cjs, replace lines 246-251:
let sprintDirName;
if (sprint.path) {
  sprintDirName = path.basename(sprint.path.replace(/\/$/, ''));
} else {
  sprintDirName = resolveDir(
    path.join(engRoot, 'sprints'),
    sprint.sprintId,
    sprint.sprintId.split('-').pop()
  );
}
const reportPath = path.join(engRoot, 'sprints', sprintDirName, 'COST_REPORT.md');
```

## Scope

- Targeted 6-line change. No schema changes, no regeneration required.
- Projects without `sprint.path` (older stores) are unaffected — fallback
  path remains the same as before.
- Spurious `SNN/` dirs created by previous `/collate` runs must be cleaned up
  manually by affected users.

## Linked

- BUG-005 (combined version bump: v0.5.5 → v0.5.6)
