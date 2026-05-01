---
requirements:
  reasoning: Medium
  context: Medium
  speed: Medium
audience: subagent
phase: update-impl
context:
  architecture: false
  prior_summaries: delta
  persona: summary
  master_index: false
  diff_mode: false
deps:
  personas: [engineer]
  skills: [engineer, generic]
  templates: [PROGRESS_TEMPLATE]
  sub_workflows: [review_code]
  kb_docs: [architecture/stack.md]
  config_fields: [commands.test, paths.engineering]
---

# Update Implementation

## Algorithm

```
1. Load Context:
   - Read current implementation (code)
   - Read the review artifact (CODE_REVIEW.md or VALIDATION_REPORT.md)
   - Read the approved PLAN.md

2. Analysis:
   - Map the "Revision Required" items to specific code locations
   - Determine if the required changes necessitate a plan update

3. Implementation:
   - Apply the necessary fixes/changes
   - Verify the changes using the project's test suite
   - Update PROGRESS.md with a summary of the revisions

4. Finalize:
   - Update task status via `/forge:store update-status task {taskId} status implemented`
   - Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`
   - Execute Token Reporting (see `_fragments/finalize.md`)
```
