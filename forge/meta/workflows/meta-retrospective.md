---
requirements:
  reasoning: High
  context: Medium
  speed: Low
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
   - Update sprint status to `retrospective-done`
   - Run `node "$FORGE_ROOT/tools/collate.cjs" {sprintId} --purge-events`
     This single deterministic step: generates COST_REPORT.md from all
     accumulated events, then deletes `.forge/store/events/{sprintId}/`.
     COST_REPORT.md is the durable record; the raw event files are not
     retained after retrospective close.
   - Emit "complete" event to `.forge/store/events/{sprintId}/`
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
  1. Run `/cost` to retrieve session token usage.
  2. Parse: `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`.
  3. Write a sidecar file at `.forge/store/events/{sprintId}/_{eventId}_usage.json`.
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.
