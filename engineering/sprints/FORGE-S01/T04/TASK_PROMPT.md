# FORGE-S01-T04: estimate-usage.cjs — token estimation fallback tool

**Sprint:** FORGE-S01
**Estimate:** M
**Pipeline:** default

---

## Objective

Create a new deterministic Node.js tool that back-fills token usage estimates
on events that lack self-reported token data, using duration and model heuristics.

## Acceptance Criteria

1. `forge/tools/estimate-usage.cjs` exists and `node --check` exits 0
2. Single-event mode: `node estimate-usage.cjs --event <path>` updates one event file
3. Batch mode: `node estimate-usage.cjs --sprint <SPRINT_ID>` updates all events in that sprint
4. Only fills events that lack `inputTokens` (does not overwrite self-reported data)
5. Uses Node.js built-ins only (fs, path) — no npm dependencies
6. Contains a documented heuristic table mapping model names to estimated tokens/minute
7. Outputs summary: `N events updated, M skipped (already populated)`
8. Reads `.forge/config.json` for store path

## Context

Depends on T01 (schema fields). This tool is the fallback for when subagent
self-reporting (T03) fails or for back-filling historical events.

Follow the patterns in existing tools (`collate.cjs`, `validate-store.cjs`):
- Read config via `.forge/config.json`
- Use `process.argv` for CLI args
- Print summary to stdout
- Exit 0 on success, 1 on error

Heuristic approach: given `durationMinutes` and `model`, estimate total tokens
as `duration × tokensPerMinute[model]`. Split into input/output using a ratio
(e.g., 70/30 input/output for implementation phases, 50/50 for review phases).
Mark `estimatedCostUSD` using published pricing tiers.

## Plugin Artifacts Involved

- `forge/tools/estimate-usage.cjs` — new tool (distributed with plugin)

## Operational Impact

- **Version bump:** Required (bundled with T08)
- **Regeneration:** Users must run `/forge:update-tools`
- **Security scan:** Required (new executable code)
