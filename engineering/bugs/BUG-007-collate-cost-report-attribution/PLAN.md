# PLAN — BUG-007: collate COST_REPORT.md path fallback + (unknown) attribution

🌱 *Forge Engineer*

**Bug ID:** BUG-007
**Sprint:** bugs (virtual)
**Estimate:** S

---

## Objective

Fix two related bugs in `forge/tools/collate.cjs` that corrupt COST_REPORT.md
output for projects without `sprint.path` fields and produce `(unknown)`
attribution rows in the Per-Task and Per-Role breakdown tables. Both fixes are
targeted changes to a single file with no schema impact.

## Approach

**Bug 1 — resolveDir numeric glob fallback:**
Enhance the existing `resolveDir` helper (lines 57–66) to perform a numeric
scan of the base directory after all exact-match candidates fail. Extract the
first integer from the last candidate (e.g. `"S31"` → 31) and return the first
alphabetically-sorted directory whose own first integer matches. Fall back to
the last candidate when no match is found (existing behaviour preserved for all
current callers).

This fix applies uniformly to all four call sites — COST_REPORT block (line
318), MASTER_INDEX sprint task loop (line 167), task link fallback (line 176),
and bug loop (line 194) — with no per-call-site changes required.

**Bug 2 — loadSprintEvents attribution backfill:**
Extend `loadSprintEvents` (lines 272–279) to backfill `taskId`, `role`, and
`action` from the filename when those fields are absent in the parsed JSON.
Apply a strict regex guard against the compact-timestamp sidecar filename
pattern before attempting the parse; skip silently on non-match to preserve
graceful handling of any future filename formats.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/tools/collate.cjs` | Enhance `resolveDir` with numeric glob fallback; extend `loadSprintEvents` with filename attribution backfill | Both bugs are in this file; both fixes are self-contained |
| `forge/.claude-plugin/plugin.json` | Bump `version` from `0.6.11` to `0.6.12` | Bug fix to a Forge tool is a material change |
| `forge/migrations.json` | Add migration entry `"0.6.11"` → `"0.6.12"` | Required with every version bump |

## Plugin Impact Assessment

- **Version bump required?** Yes — bump `0.6.11` → `0.6.12`. Bug fix to `forge/tools/collate.cjs` is a material change per CLAUDE.md policy.
- **Migration entry required?** Yes — `regenerate: []`, `breaking: false`, `manual: []`. No user-facing regeneration needed; collate output is re-generated on demand.
- **Security scan required?** Yes — any change to `forge/` requires a scan. Run `/security-watchdog:scan-plugin forge:forge --source-path forge/` and save the full report to `docs/security/scan-v0.6.12.md`. Add a row to the Security Scan History table in `README.md`.
- **Schema change?** No — no changes to `.forge/store/` schemas or `forge/schemas/`. No schema doc updates needed.

## Implementation Steps

### Step 1 — Modify `forge/tools/collate.cjs`

**1a. Replace `resolveDir` (lines 57–66) with the numeric glob fallback version:**

```js
// Resolve a directory name under `base` by trying candidates in order.
// Returns the first candidate whose directory exists. If none exist,
// attempts a numeric glob: finds the first alphabetically-sorted dir
// in `base` whose first integer matches the first integer in the last
// candidate. Falls back to the last candidate if no match is found.
function resolveDir(base, ...candidates) {
  for (const c of candidates) {
    if (fs.existsSync(path.join(base, c))) return c;
  }
  // Numeric glob fallback
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

**1b. Replace the `loadSprintEvents` function body (lines 272–279) with the
attribution-backfill version:**

```js
function loadSprintEvents(sprintId) {
  const eventsDir = path.join(storeRoot, 'events', sprintId);
  if (!fs.existsSync(eventsDir)) return [];
  const USAGE_RE = /^\d{8}T\d{9}Z_[A-Z0-9-]+_[a-z-]+_[a-z_-]+$/;
  return fs.readdirSync(eventsDir)
    .filter(f => f.endsWith('.json') && !f.startsWith('_'))
    .map(f => {
      const ev = readJson(path.join(eventsDir, f));
      if (!ev) return null;
      // Backfill attribution from filename when absent in JSON
      if (!ev.taskId || !ev.role) {
        const base = f.replace(/(_usage)?\.json$/, '');
        if (USAGE_RE.test(base)) {
          const parts = base.split('_');
          // parts[0]=timestamp, parts[1]=taskId, parts[2]=role, rest=action
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

### Step 2 — Version bump `forge/.claude-plugin/plugin.json`

Change `"version"` from `"0.6.11"` to `"0.6.12"`.

### Step 3 — Add migration entry to `forge/migrations.json`

Add under the existing `"0.6.10"` key:

```json
"0.6.11": {
  "version": "0.6.12",
  "date": "2026-04-12",
  "notes": "Fix collate: resolveDir gains numeric glob fallback for sprint IDs without hyphens (e.g. S31 → sprint_31_slug/); loadSprintEvents backfills taskId/role/action from sidecar filename when JSON lacks attribution fields.",
  "regenerate": [],
  "breaking": false,
  "manual": []
}
```

### Step 4 — Syntax check

```bash
node --check forge/tools/collate.cjs
```

### Step 5 — Security scan

```
/security-watchdog:scan-plugin forge:forge --source-path forge/
```

Save full report to `docs/security/scan-v0.6.12.md` and add a row to the
Security Scan History table in `README.md`.

### Step 6 — Smoke test (manual, in a test project)

1. Remove `sprint.path` from a sprint JSON in `.forge/store/sprints/`.
2. Run `node forge/tools/collate.cjs` from the test project root.
3. Verify COST_REPORT.md appears in the correct descriptive sprint dir
   (not a stub `SNN/` dir).
4. Verify MASTER_INDEX.md sprint/task/bug links resolve to real dirs.
5. Place a sidecar usage file (e.g.
   `20260412T120000000Z_WI-S31-T06_engineer_implement_usage.json`) with
   only token fields into `.forge/store/events/{sprintId}/`.
6. Re-run collate and verify COST_REPORT Per-Task and Per-Role tables show
   the real taskId and role instead of `(unknown)`.

## Verification Plan

| Check | Command | Expected |
|---|---|---|
| Syntax check | `node --check forge/tools/collate.cjs` | Exit 0, no errors |
| Store validation | `node forge/tools/validate-store.cjs --dry-run` | Exit 0 (no schema change) |
| Security scan | `/security-watchdog:scan-plugin forge:forge --source-path forge/` | No new findings |

## Acceptance Criteria

- [ ] `node --check forge/tools/collate.cjs` exits 0
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0
- [ ] Running collate on a project with sprint IDs like `S31` (no hyphen, no `sprint.path`) writes COST_REPORT.md to the correct `sprint_31_*/` directory, not a stub `S31/` dir
- [ ] MASTER_INDEX.md task and bug links resolve to real directories when `path` fields are absent from store objects
- [ ] Running collate on a sprint with sidecar usage-only JSON files (no attribution fields) produces Per-Task and Per-Role tables with real IDs and roles, not `(unknown)`
- [ ] Sidecar files whose filenames do not match the expected pattern are silently skipped (no crash, no error output)
- [ ] `forge/.claude-plugin/plugin.json` version is `0.6.12`
- [ ] `forge/migrations.json` contains a `"0.6.11"` → `"0.6.12"` entry
- [ ] Security scan report saved to `docs/security/scan-v0.6.12.md`
- [ ] README.md Security Scan History table updated

## Operational Impact

- **Distribution:** Users do not need to run `/forge:update` to get the fix —
  collate is invoked on demand and always uses the installed plugin version.
  After update, re-running `/collate` in affected projects will write
  COST_REPORT.md to the correct dirs automatically. Stub dirs created by
  previous runs must be cleaned up manually (same guidance as BUG-006).
- **Backwards compatibility:** Fully preserved. The numeric glob fallback in
  `resolveDir` is only reached when no candidate matches on disk. The attribution
  backfill in `loadSprintEvents` only writes fields that are absent in the JSON;
  existing well-formed events are unchanged.
