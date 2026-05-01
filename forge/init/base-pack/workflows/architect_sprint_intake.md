---
requirements:
  reasoning: High
  context: Medium
  speed: Low
deps:
  personas: [product-manager]
  skills: [architect, generic]
  templates: [SPRINT_REQUIREMENTS_TEMPLATE, SPRINT_MANIFEST_TEMPLATE]
  sub_workflows: []
  kb_docs: [MASTER_INDEX.md, architecture/stack.md]
  config_fields: [project.prefix, paths.engineering]
---

# Sprint Intake
## Algorithm

```
0. Pre-flight Gate Check:
   - Run `/cost` to verify token reporting available
   - If `/cost` succeeds → note for later (will use reported data)
   - If `/cost` fails or unavailable → note for later (will use estimates)

1. Load Context:
   - Read project vision and current MASTER_INDEX.md
   - Read any pending feature requests or bug reports

2. Requirements Interview:
   - Conduct a structured interview with the user
   - Capture: Objectives, Constraints, Deliverables, and Success Criteria
   - Clarify ambiguous requirements through iterative questioning

3. Document Requirements:
   - Generate SPRINT_REQUIREMENTS.md
   - Map requirements to existing Features if applicable
   - Ensure all deliverables are measurable and testable

4. Finalize:
   - Update sprint status via `/forge:store update-status sprint {sprintId} status planning`
   - Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`
   - Execute Token Reporting (see `_fragments/finalize.md`)
```