# FORGE-S01-T03: Orchestrator meta-workflow — subagent self-reporting and sidecar merge

**Sprint:** FORGE-S01
**Estimate:** M
**Pipeline:** default

---

## Objective

Update the orchestrator meta-workflow so that each phase subagent captures its own
token usage via `/cost` before returning, writes a sidecar JSON file, and the
orchestrator merges that data into the event record.

## Acceptance Criteria

1. `forge/meta/workflows/meta-orchestrate.md` includes instructions for subagents to:
   - Run `/cost` to capture session token usage before returning
   - Write a sidecar file at `.forge/store/events/{sprintId}/_{eventId}_usage.json`
   - Sidecar format: `{ inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, estimatedCostUSD }`
2. Orchestrator `emit_event` section updated to:
   - After subagent returns, check for sidecar file existence
   - If found: read, merge token fields into the event JSON, delete sidecar
   - If missing: emit event without token fields (graceful fallback, no error)
3. The Event Emission table includes the new optional token fields
4. The generation instructions mention the sidecar merge pattern

## Context

Depends on T01 (schema fields must exist). This is the primary token tracking
mechanism. Each phase already runs as an isolated subagent (BUG-001 fix), so
`/cost` at subagent end reflects exactly that phase's consumption.

The sidecar file pattern is consistent with how Forge handles review verdicts —
results read from disk, not from conversation context.

## Plugin Artifacts Involved

- `forge/meta/workflows/meta-orchestrate.md` — the orchestrator meta-definition

## Operational Impact

- **Version bump:** Required (bundled with T08)
- **Regeneration:** Users must regenerate workflows (`/forge:regenerate`) after update
- **Security scan:** Not required for this task alone
