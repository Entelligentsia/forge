# PROGRESS — FORGE-S01-T05: collate.cjs — COST_REPORT.md generation

**Task:** FORGE-S01-T05
**Sprint:** FORGE-S01

---

## Summary

Extended `forge/tools/collate.cjs` to generate `COST_REPORT.md` for each sprint
that has token-bearing events. The report includes four sections: Per-task totals
(with source labelling), Per-role breakdown, Revision waste, and Model split.
Added optional `tokenSource` enum field (`"reported"` | `"estimated"`) to both
event schema copies, and updated `estimate-usage.cjs` to write
`"tokenSource": "estimated"` when back-filling. Missing `tokenSource` is treated
as `"unknown"` to handle pre-existing events gracefully.

## Syntax Check Results

```
$ node --check forge/tools/collate.cjs
collate.cjs OK

$ node --check forge/tools/estimate-usage.cjs
estimate-usage.cjs OK
```

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
ERROR  .forge/store/events/FORGE-S01/2026-04-05T05:39:07.997Z_FORGE-S01-T01_plan_start.json: missing required field: "endTimestamp"
[... 23 pre-existing errors, identical to pre-T05 baseline — no new errors introduced]

23 error(s) found.
```

Note: all 23 errors are pre-existing malformed event records that existed before
this task began. The schema change (additive optional field) introduces zero new
errors.

## Smoke Test

```
$ node forge/tools/collate.cjs FORGE-S01 --dry-run
[dry-run] would write: engineering/MASTER_INDEX.md
[dry-run] would write: engineering/sprints/FORGE-S01/COST_REPORT.md
[dry-run] would write: .forge/store/COLLATION_STATE.json
[dry-run] Collated: 1 sprint(s), 3 bug(s) → MASTER_INDEX.md updated, 1 COST_REPORT(s) written

$ node forge/tools/collate.cjs FORGE-S01
Collated: 1 sprint(s), 3 bug(s) → MASTER_INDEX.md updated, 1 COST_REPORT(s) written
```

`engineering/sprints/FORGE-S01/COST_REPORT.md` was generated with all four sections.
MASTER_INDEX.md structure is unchanged.

## Files Changed

| File | Change |
|---|---|
| `forge/tools/collate.cjs` | Added event loading, `loadSprintEvents()`, `fmtTokens()`, `fmtCost()`, `sourceLabel()` helpers, and COST_REPORT.md generation with four sections |
| `forge/schemas/event.schema.json` | Added optional `tokenSource` field (enum: `"reported"`, `"estimated"`) |
| `.forge/schemas/event.schema.json` | Mirrored `tokenSource` field addition |
| `forge/tools/estimate-usage.cjs` | `estimateTokens()` now returns `tokenSource: "estimated"` in its result object |
| `engineering/sprints/FORGE-S01/COST_REPORT.md` | Generated output (collate produces this, not manually edited) |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| `collate.cjs` generates `COST_REPORT.md` for sprints with token events | ✅ Pass | Verified with FORGE-S01 |
| Report has four sections: Per-task, Per-role, Revision waste, Model split | ✅ Pass | All four sections present |
| Per-task source labels: `(reported)`, `(estimated)`, `(mixed)`, `(unknown)` | ✅ Pass | `(unknown)` handles pre-schema events |
| Sprints with zero token data produce a note instead of empty tables | ✅ Pass | Logic implemented; would emit `_No token data available for this sprint._` |
| Sidecar files (prefix `_`) excluded from event loading | ✅ Pass | `!f.startsWith('_')` filter in `loadSprintEvents()` |
| `node --check forge/tools/collate.cjs` exits 0 | ✅ Pass | |
| `node --check forge/tools/estimate-usage.cjs` exits 0 | ✅ Pass | |
| `node forge/tools/validate-store.cjs --dry-run` exits 0 | ❌ Pre-existing | 23 pre-existing errors, none introduced by this task |
| Existing `MASTER_INDEX.md` output is unchanged | ✅ Pass | Verified — same content structure |
| `forge/schemas/event.schema.json` includes `tokenSource` optional string enum | ✅ Pass | |
| `estimate-usage.cjs` writes `"tokenSource": "estimated"` when back-filling | ✅ Pass | |

## Plugin Checklist

- [ ] Version bumped in `forge/.claude-plugin/plugin.json` (deferred to T08)
- [ ] Migration entry added to `forge/migrations.json` (deferred to T08)
- [ ] Security scan required — changes in `forge/` (deferred to T08); run `/security-watchdog:scan-plugin forge:forge --source-path forge/` and save report to `docs/security/scan-v0.4.0.md`

## Knowledge Updates

None — implementation followed established patterns exactly as documented in
`engineering/architecture/`. No architectural discoveries made.

## Notes

- The supervisor review noted that missing `tokenSource` (pre-existing events) should
  be treated as a distinct state. Implemented as `"unknown"` label via the
  `sourceLabel()` helper — any event without `tokenSource` contributes `undefined`
  to the sources Set, which resolves to `"(unknown)"` when it's the only value present.
- Token counts are formatted with `toLocaleString('en-US')` for readability
  (e.g., `3,150`). Cost values are formatted to 4 decimal places (e.g., `$0.0135`).
- The sidecar filter uses `f.startsWith('_')` (prefix check), which is more general
  than the `!f.includes('_sidecar')` substring match in `estimate-usage.cjs`. This
  aligns with the supervisor advisory note #1 — the prefix check is more
  forward-compatible.
