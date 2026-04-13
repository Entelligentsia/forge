---
requirements:
  reasoning: High
  context: Medium
  speed: Low
---

# Meta-Workflow: Retrospective

## Persona

🎓 **{Project} Analyst** — I turn experience into wisdom.

See `meta-analyst.md` for the full persona definition.

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
   - Emit "complete" event to `.forge/store/events/{sprintId}/`
   - Execute Token Reporting (see Generation Instructions)
```

## Generation Instructions

- **Workflow Structure:** The generated `retrospective.md` must follow the strict "Algorithm" block format.
- **Context Isolation:** Forbid inline execution of cost analysis or doc updates; use the `Agent` tool for sub-tasks.
- **Project Specifics:**
  - Reference project's cost reporting templates.
- **Token Reporting:** The generated workflow MUST mandate the following before returning:
  1. Run `/cost` to retrieve session token usage.
  2. Parse: `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`.
  3. Write a sidecar file at `.forge/store/events/{sprintId}/_{eventId}_usage.json`.
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.
