# PLAN — FORGE-S01-T05: collate.cjs — COST_REPORT.md generation

**Task:** FORGE-S01-T05
**Sprint:** FORGE-S01
**Estimate:** L

---

## Objective

Extend `forge/tools/collate.cjs` to generate a `COST_REPORT.md` for each sprint
that has events with token data. The report provides four views of token
consumption: per-task totals, per-role breakdown, revision waste, and model split.
A `tokenSource` field (`"reported"` | `"estimated"`) is also added to the event
schema so the report can label values accurately.

## Approach

### Schema addendum (`tokenSource` field)

The task prompt requires distinguishing self-reported vs. heuristically estimated
token data. The simplest, most explicit approach is to add a `tokenSource` field
(`"reported"` | `"estimated"`) to `forge/schemas/event.schema.json`. This must
also be mirrored to `.forge/schemas/event.schema.json`.

The orchestrator (T03) writes self-reported events — it will include
`"tokenSource": "reported"` when merging sidecar data. The `estimate-usage.cjs`
tool (T04) back-fills missing token data — it will write `"tokenSource": "estimated"`.
Both tools need a one-line update alongside the schema change.

Note: the `estimate-usage.cjs` update (adding `tokenSource: "estimated"` to the
back-filled fields) is a minor addendum to a completed task. It is included in
this task's scope since T05 depends on the field for labelling.

### Event loading in `collate.cjs`

The collation tool already loads sprint records from `.forge/store/`. Event
loading is currently absent. The plan:

1. For each target sprint, read `.forge/store/events/{sprintId}/` using
   `fs.readdirSync`, filter to files ending in `.json` that do **not** start with
   `_` (skip sidecars), and parse each record.
2. Collect only events with at least one token field present
   (`inputTokens !== undefined`). If no such events exist for a sprint, emit the
   "no token data" note and skip all four tables.

### COST_REPORT.md generation

For each sprint with token-bearing events, write
`engineering/sprints/{SPRINT_DIR}/COST_REPORT.md`.

**Section 1 — Per-task totals**

Aggregate all events for each unique `taskId`:
- Sum `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`,
  `estimatedCostUSD`.
- Determine the label suffix: if all events for the task have
  `tokenSource === "reported"` → "(reported)"; if all are `"estimated"` →
  "(estimated)"; if mixed → "(mixed)".
- Emit `padTable()` with columns: Task, Input Tokens, Output Tokens, Cache Read,
  Cache Write, Est. Cost USD, Source.

**Section 2 — Per-role breakdown**

Aggregate by `role` field. Same sums. Same `padTable()` pattern with columns:
Role, Input Tokens, Output Tokens, Cache Read, Cache Write, Est. Cost USD.

**Section 3 — Revision waste**

Filter to events where `iteration > 1` AND `phase` is a review phase
(`review`, `review-plan`, `review-code`). Aggregate by task. Emit a table with
columns: Task, Revision Iterations, Input Tokens, Output Tokens, Est. Cost USD.
If no revision events exist, emit a note: `_No revision waste in this sprint._`

**Section 4 — Model split**

Aggregate by `model` field. Columns: Model, Input Tokens, Output Tokens, Cache
Read, Cache Write, Est. Cost USD.

### `padTable()` usage

Reuse the existing `padTable(rows)` helper without modification — it already
handles variable-width columns correctly.

### `writeFile()` usage

Reuse the existing `writeFile(filePath, content)` helper — it handles `--dry-run`
transparently.

### Resolving sprint directories for output path

Use the existing `resolveDir(base, ...candidates)` helper to locate the sprint
directory under `engineering/sprints/`, supporting both `FORGE-S01` and `S01`
naming conventions.

### Event directory path

Events live at:
```
{storeRoot}/events/{sprintId}/
```
The `storeRoot` is already resolved from `config.paths.store` at the top of the
file. The events directory is filtered to exclude sidecar files (prefix `_`).

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/tools/collate.cjs` | Add event loading + COST_REPORT.md generation | Primary deliverable |
| `forge/schemas/event.schema.json` | Add optional `tokenSource` field (`"reported"` \| `"estimated"`) | Needed for per-source labelling in the report |
| `.forge/schemas/event.schema.json` | Mirror `tokenSource` field addition | Local schema used by validate-store.cjs in this repo |
| `forge/tools/estimate-usage.cjs` | Write `"tokenSource": "estimated"` when back-filling token fields | Back-filled events must be labelled so the report can distinguish them |

## Plugin Impact Assessment

- **Version bump required?** Yes — bundled with T08. Changes to `forge/tools/collate.cjs`,
  `forge/schemas/event.schema.json`, and `forge/tools/estimate-usage.cjs` are all
  material (affect every installed project).
- **Migration entry required?** Yes (in T08) — `regenerate: ["tools"]` so users run
  `/forge:update-tools` to receive the updated `collate.cjs`, `estimate-usage.cjs`,
  and schema. New version is `0.4.0` (as planned in T01).
- **Security scan required?** Yes — any change to `forge/` requires a scan. Bundled
  with T08.
- **Schema change?** Yes — `forge/schemas/event.schema.json` adds one optional field
  (`tokenSource`). No existing events become invalid (additive, not required).

## Testing Strategy

- Syntax check: `node --check forge/tools/collate.cjs`
- Syntax check: `node --check forge/tools/estimate-usage.cjs`
- Store validation: `node forge/tools/validate-store.cjs --dry-run`
- Manual smoke test: run `node forge/tools/collate.cjs FORGE-S01` and verify
  `engineering/sprints/FORGE-S01/COST_REPORT.md` is created with four sections.
- Dry-run test: `node forge/tools/collate.cjs FORGE-S01 --dry-run` logs the write
  without creating the file.
- Zero-token sprint: add a sprint with no token events and confirm the "no data"
  note is emitted instead of empty tables.
- Existing output unchanged: after running collate, diff `MASTER_INDEX.md` against
  its previous content to confirm no unintended changes.

## Acceptance Criteria

- [ ] `collate.cjs` generates `engineering/sprints/{SPRINT_DIR}/COST_REPORT.md`
  for sprints with at least one token-bearing event
- [ ] Report includes four sections: Per-task totals, Per-role breakdown,
  Revision waste, Model split
- [ ] Values are labelled "(reported)", "(estimated)", or "(mixed)" in the
  Per-task totals section based on `tokenSource` fields
- [ ] Sprints with zero token data produce a note instead of empty tables
- [ ] Sidecar files (prefix `_`) are excluded from event loading
- [ ] `node --check forge/tools/collate.cjs` exits 0
- [ ] `node --check forge/tools/estimate-usage.cjs` exits 0
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0
- [ ] Existing `MASTER_INDEX.md` output is unchanged
- [ ] `forge/schemas/event.schema.json` includes `tokenSource` as an optional
  `string` enum (`"reported"`, `"estimated"`)
- [ ] `forge/tools/estimate-usage.cjs` writes `"tokenSource": "estimated"` when
  back-filling

## Operational Impact

- **Distribution:** Users must run `/forge:update-tools` after the T08 version bump
  to receive the updated `collate.cjs`, `estimate-usage.cjs`, and schema files in
  their project. Running collate before updating will produce reports without
  source labels (graceful — `tokenSource` is optional).
- **Backwards compatibility:** Fully preserved. The `tokenSource` field is optional;
  events without it validate fine. Reports on events lacking `tokenSource` omit the
  source label column gracefully (treated as unlabelled).
