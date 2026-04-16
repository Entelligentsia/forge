# BUG-007 — Analysis: collate COST_REPORT.md path fallback fails + (unknown) attribution

**GitHub:** Entelligentsia/forge#25
**Severity:** major
**File:** `forge/tools/collate.cjs`
**Root cause category:** business-rule
**Similar:** BUG-006

---

## Bug 1 — resolveDir fallback broken for hyphen-free sprint IDs (lines 57–66, 318–322)

### Symptom

When a sprint has no `path` field in its store JSON and its ID contains no
hyphen (e.g. `S31`, `S02`), `collate` creates a stub directory like
`engineering/sprints/S31/COST_REPORT.md` instead of writing to the real
`engineering/sprints/sprint_31_unified_subscription_invoice/COST_REPORT.md`.

The same failure affects MASTER_INDEX link generation for sprint dirs (line 167),
task dirs (line 176), and bug dirs (line 194).

### Root cause

`resolveDir` (lines 57–66) accepts a variadic `...candidates` list and returns
the first that exists on disk, falling back to the last candidate when none match:

```js
function resolveDir(base, ...candidates) {
  for (const c of candidates) {
    if (fs.existsSync(path.join(base, c))) return c;
  }
  return candidates[candidates.length - 1];
}
```

At the COST_REPORT call site (lines 318–322):

```js
sprintDirName = resolveDir(
  path.join(engRoot, 'sprints'),
  sprint.sprintId,                  // e.g. "S31"
  sprint.sprintId.split('-').pop()  // also "S31" — no hyphen
);
```

For IDs without hyphens, both candidates are identical. Neither matches the
real directory name `sprint_31_unified_subscription_invoice/`. `resolveDir`
falls back to `"S31"`, and `writeFile` creates the stub directory implicitly.

### Relationship to BUG-006

BUG-006 (fixed in v0.5.6) added `sprint.path` precedence at the COST_REPORT
block (lines 315–323). When `sprint.path` is populated, the bug is avoided. But
the fix was incomplete: user projects where `sprint.path` is absent (older
stores, or projects that never ran a version of collate that wrote `sprint.path`)
still hit the broken fallback.

### All call sites affected

| Location | Line(s) | Context |
|---|---|---|
| COST_REPORT block | 318–322 | Sprint dir for writing COST_REPORT.md |
| MASTER_INDEX sprint/task loop | 167 | Sprint dir for task link generation |
| MASTER_INDEX task link (no t.path) | 176 | Task dir for INDEX.md link |
| MASTER_INDEX bug loop | 194 | Bug dir for INDEX.md link |

### Fix approach

Enhance `resolveDir` to add a numeric glob fallback after all exact-match
candidates fail:

1. Extract the first integer from the last candidate string
   (e.g. `"S31"` → 31, `"WI-S31-T06"` → 31).
2. Read `base` via `fs.readdirSync` and find the first (alphabetically sorted)
   directory whose own first integer equals that value.
3. Return the matching directory name if found; otherwise return the last
   candidate as before (existing behaviour preserved).

```js
function resolveDir(base, ...candidates) {
  for (const c of candidates) {
    if (fs.existsSync(path.join(base, c))) return c;
  }
  // Numeric glob fallback: match first integer in last candidate against dirs
  const last = candidates[candidates.length - 1];
  const numMatch = last.match(/\d+/);
  if (numMatch && fs.existsSync(base)) {
    const target = parseInt(numMatch[0], 10);
    const dirs = fs.readdirSync(base).sort();
    for (const d of dirs) {
      const m = d.match(/\d+/);
      if (m && parseInt(m[0], 10) === target) return d;
    }
  }
  return last;
}
```

This is fully backwards-compatible. The new branch is only reached when no
candidate exists on disk; if no numeric match is found, `last` is returned
unchanged.

---

## Bug 2 — (unknown) attribution in loadSprintEvents (lines 272–279, 347)

### Symptom

COST_REPORT.md Per-Task Totals and Per-Role Breakdown tables show `(unknown)`
for all tasks and roles. All token cost is bucketed under `(unknown)`.

### Root cause

`loadSprintEvents` (lines 272–279) reads event JSON files and returns parsed
objects. Subagents write sidecar usage files containing only bare token counts:

```json
{
  "inputTokens": 45210,
  "outputTokens": 3872,
  "cacheReadTokens": 89045,
  "cacheWriteTokens": 11230,
  "estimatedCostUSD": 0.0421
}
```

These files carry no `taskId`, `role`, `action`, `phase`, or `model` fields.
Collate's grouping logic falls back to `e.taskId || '(unknown)'` and
`e.role || '(unknown)'`, rendering all rows as `(unknown)`.

### Filename encoding

Sidecar filenames encode the full attribution. Example:

```
20260411T083818000Z_WI-S31-T06_commit_engineer_commit_usage.json
```

Parsed (strip `_usage.json`, split on `_`):
- `parts[0]` = `20260411T083818000Z` — compact ISO timestamp
- `parts[1]` = `WI-S31-T06` — taskId (contains hyphens, not underscores)
- `parts[2]` = role (e.g. `commit`, `engineer`, `plan`)
- `parts.slice(3).join('_')` = action

Note: taskId tokens use hyphens, which is why splitting on `_` isolates it
cleanly as `parts[1]`.

### Regex guard

A strict guard prevents malformed filenames from being silently misinterpreted:

```
/^\d{8}T\d{9}Z_[A-Z0-9-]+_[a-z-]+_[a-z_-]+$/
```

(Applied to the base filename after stripping `(_usage)?\.json$`.)

Non-matching filenames skip the backfill silently — no error, no override
of existing fields.

### Fix approach

In `loadSprintEvents`, after parsing each JSON file, if attribution fields
are absent, attempt to backfill from the filename:

```js
function loadSprintEvents(sprintId) {
  const eventsDir = path.join(storeRoot, 'events', sprintId);
  if (!fs.existsSync(eventsDir)) return [];
  return fs.readdirSync(eventsDir)
    .filter(f => f.endsWith('.json') && !f.startsWith('_'))
    .map(f => {
      const ev = readJson(path.join(eventsDir, f));
      if (!ev) return null;
      if (!ev.taskId || !ev.role) {
        const base = f.replace(/(_usage)?\.json$/, '');
        const USAGE_RE = /^\d{8}T\d{9}Z_[A-Z0-9-]+_[a-z-]+_[a-z_-]+$/;
        if (USAGE_RE.test(base)) {
          const parts = base.split('_');
          if (!ev.taskId) ev.taskId = parts[1];
          if (!ev.role)   ev.role   = parts[2];
          if (!ev.action) ev.action = parts.slice(3).join('_');
        }
      }
      return ev;
    })
    .filter(Boolean);
}
```

Key invariants:
- Only applies when `taskId` or `role` is absent — does not overwrite present values.
- Regex guard ensures malformed filenames are silently skipped.
- No exception is thrown on non-matching filenames.

---

## Impact Summary

| Bug | Symptom | Fix size |
|---|---|---|
| Bug 1 — resolveDir fallback | Stub dirs, broken MASTER_INDEX links | ~10 lines inside `resolveDir` |
| Bug 2 — (unknown) attribution | All cost rows show (unknown) | ~12 lines inside `loadSprintEvents` |

Both bugs are in `forge/tools/collate.cjs`. No schema changes. No workflow or
command regeneration required. Change is material (bug fix to a Forge tool) →
**version bump to `0.6.12` required**.
