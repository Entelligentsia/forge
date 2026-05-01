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

# Retrospective
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
   - Update sprint status via `/forge:store update-status sprint {sprintId} status retrospective-done`
   - Run `node "$FORGE_ROOT/tools/collate.cjs" {sprintId} --purge-events`
     This single deterministic step: generates COST_REPORT.md from all
     accumulated events, then deletes `.forge/store/events/{sprintId}/`.
     COST_REPORT.md is the durable record; the raw event files are not
     retained after retrospective close.
   - Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`
     (tombstone — written after the purge; the only event in the directory
     going forward)
   - Execute Token Reporting (see `_fragments/finalize.md`)
```