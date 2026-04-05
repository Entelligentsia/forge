# Sprint FORGE-S01 — Token Usage Tracking

## Goals

Give Forge users transparent, per-phase token usage metrics. Establish cost
baselines for continuous improvement. Enable opt-in token data in bug reports.

## Task Breakdown

| Task | Title | Est. | Deps | Wave |
|------|-------|------|------|------|
| T01 | Event schema — add optional token fields | S | — | 1 |
| T02 | validate-store — handle new event token fields | S | T01 | 2 |
| T03 | Orchestrator meta-workflow — subagent self-reporting + sidecar merge | M | T01 | 2 |
| T04 | estimate-usage.cjs — token estimation fallback tool | M | T01 | 2 |
| T05 | collate.cjs — COST_REPORT.md generation | L | T01 | 2 |
| T06 | Retrospective meta-workflow — cost analysis and baselines | M | T05 | 3 |
| T07 | Bug report opt-in — token data with user prompt | S | T05 | 3 |
| T08 | Version bump + migration entry + security scan | S | All | 4 |

## Dependency Graph

```
T01 (schema)
 ├── T02 (validate-store)
 ├── T03 (orchestrator)
 ├── T04 (estimate-usage)
 └── T05 (collate COST_REPORT)
      ├── T06 (retrospective + baselines)
      └── T07 (bug report opt-in)
           └── T08 (version bump)
```

## Execution Order (Sequential)

T01 → T02 → T03 → T04 → T05 → T06 → T07 → T08

## Design Decisions

1. **Subagent `/cost` self-reporting is primary** — each phase is isolated, so
   `/cost` reflects exactly that phase. Sidecar JSON pattern (read from disk)
   is consistent with how Forge handles verdicts.

2. **Heuristic estimation is fallback** — `estimate-usage.cjs` back-fills events
   that lack self-reported data using duration × model throughput heuristics.

3. **`tokenSource` field** — events carry `"reported"` or `"estimated"` so
   COST_REPORT.md can label values honestly.

4. **Cost baselines live in store** — `.forge/store/COST_BASELINES.json` updated
   per retrospective, used for anomaly detection in future sprints.

5. **Bug report opt-in respects user choice** — prompt per-report or config default.

## Files Touched (Distributed)

| File | Change Type |
|------|------------|
| `forge/schemas/event.schema.json` | Modified — add optional fields |
| `forge/tools/validate-store.cjs` | Modified — handle new fields |
| `forge/tools/collate.cjs` | Modified — generate COST_REPORT.md |
| `forge/tools/estimate-usage.cjs` | **New** — fallback estimation tool |
| `forge/meta/workflows/meta-orchestrate.md` | Modified — subagent self-reporting |
| `forge/meta/workflows/meta-retrospective.md` | Modified — cost analysis + baselines |
| `forge/commands/report-bug.md` | Modified — opt-in token data |
| `forge/sdlc-config.schema.json` | Modified — new config field |
| `forge/.claude-plugin/plugin.json` | Modified — version bump |
| `forge/migrations.json` | Modified — new migration entry |
