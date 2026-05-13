---
requirements:
  reasoning: High
  context: Medium
  speed: Low
deps:
  personas: [architect]
  skills: [architect, generic]
  templates: [RETROSPECTIVE_TEMPLATE]
  sub_workflows: []
  kb_docs: [architecture/stack.md]
  config_fields: [paths.engineering]
---

# 🗻 Meta-Workflow: Retrospective

## Purpose

Close a sprint by reviewing learnings, updating the knowledge base, and improving workflows.

## Algorithm

```
1. Load Context:
   - Read all task manifests for the sprint
   - Read all event logs (including token usage)
   - Read all retrospective notes gathered during the sprint

2. Analysis:
   - Calculate total sprint cost (tokens/USD)
   - Identify "bottleneck" tasks (high iteration counts or long duration)
   - Analyze common failure modes in reviews

3. Knowledge Update:
   - Update architecture/domain docs with "lessons learned"
   - Propose improvements to meta-workflows based on analysis
   - Update stack-checklist with new verification steps

4. Finalize:
   - Write SPRINT_RETROSPECTIVE.md
   - Update sprint status via `node "$FORGE_ROOT/tools/store-cli.cjs" update-status sprint {sprintId} status retrospective-done`
   - Run `node "$FORGE_ROOT/tools/collate.cjs" {sprintId} --purge-events`
     This single deterministic step: generates COST_REPORT.md from all
     accumulated events, then deletes `.forge/store/events/{sprintId}/`.
     COST_REPORT.md is the durable record; the raw event files are not
     retained after retrospective close.
   - Emit the complete event (canonical shape — required fields: `eventId, taskId, sprintId, role, action, phase, iteration, startTimestamp, endTimestamp, durationMinutes, model`; see `_fragments/event-emission-schema.md`. Do NOT invent `{type:"complete", verdict, timestamp}` — that shape is rejected. Run `node "$FORGE_ROOT/tools/store-cli.cjs" describe event` if unsure) via `node "$FORGE_ROOT/tools/store-cli.cjs" emit {sprintId} '{event-json}'`
     (tombstone — written after the purge; the only event in the directory
     going forward)
   - Execute Token Reporting (see Generation Instructions)
```

## Generation Instructions

- **Persona Self-Load:** The generated workflow MUST begin by reading `.forge/personas/architect.md` as its first step (before any other tool use). This replaces the former inline `## Persona` section. The persona identity line (emoji, name, tagline) should be printed to stdout after reading the file.
- **Workflow Structure:** The generated `retrospective.md` must follow the strict "Algorithm" block format.
- **Context Isolation:** Forbid inline execution of cost analysis or doc updates; use the `Agent` tool for sub-tasks.
- **Project Specifics:**
  - Reference project's cost reporting templates.
- **Token Reporting:** The generated workflow MUST mandate the following before returning:
  1. Probe session token usage: invoke `/cost` if the host runtime supports it
     (Claude Code only); on any other runtime treat as unavailable and proceed.
     Do NOT shell out to a `cost-cli.cjs` — there is no such tool.
  2. Parse: `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`.
  3. Write the usage sidecar via `node "$FORGE_ROOT/tools/store-cli.cjs" emit {sprintId} '{sidecar-json}' --sidecar`.
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.
