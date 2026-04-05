# FORGE-S01-T05: collate.cjs — COST_REPORT.md generation

**Sprint:** FORGE-S01
**Estimate:** L
**Pipeline:** default

---

## Objective

Extend the collation tool to generate a `COST_REPORT.md` for each sprint that has
events with token data, providing four breakdown views of token consumption.

## Acceptance Criteria

1. `collate.cjs` generates `engineering/sprints/{SPRINT_DIR}/COST_REPORT.md` for sprints with token-bearing events
2. Report includes four sections:
   - **Per-task totals** — table with input/output/cache tokens and estimated cost per task
   - **Per-role breakdown** — aggregate by role (engineer, supervisor, architect)
   - **Revision waste** — tokens in iterations where `iteration > 1` for review phases
   - **Model split** — tokens and cost grouped by model identifier
3. Values labelled "(estimated)" when `estimatedCostUSD` present but `inputTokens` came from heuristic, "(reported)" when from subagent self-report
4. Sprints with zero token data across all events get a note instead of empty tables
5. `node --check forge/tools/collate.cjs` exits 0
6. Existing collation output (MASTER_INDEX.md) unchanged

## Context

Depends on T01 (schema fields). The collation tool already reads all events
per sprint. Extend the event-loading logic to aggregate token fields.

Follow the existing `padTable()` pattern for markdown table generation.
Load events from `.forge/store/events/{sprintId}/`, filter to non-sidecar files
(skip files starting with `_`).

Distinguishing "estimated" vs "reported": if an event has token fields but was
back-filled by `estimate-usage.cjs`, it won't have a distinguishing marker.
Add a boolean `tokenSourceEstimated` field to the schema (T01 addendum) or
infer from presence of the sidecar — simpler: add a `tokenSource` field
(`"reported"` | `"estimated"`) to the event schema.

## Plugin Artifacts Involved

- `forge/tools/collate.cjs` — the collation tool

## Operational Impact

- **Version bump:** Required (bundled with T08)
- **Regeneration:** Users must run `/forge:update-tools`
- **Security scan:** Not required for this task alone
