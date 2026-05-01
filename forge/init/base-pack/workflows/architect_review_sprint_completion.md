---
requirements:
  reasoning: High
  context: Medium
  speed: Low
deps:
  personas: [architect]
  skills: [architect, generic]
  templates: []
  sub_workflows: []
  kb_docs: [architecture/stack.md]
  config_fields: [paths.engineering]
---

# Review Sprint Completion
## Algorithm

```
1. Load Context:
   - Read sprint manifest
   - Read all task manifests in the sprint
   - Check VCS for all expected commit hashes

2. Verification:
   - Confirm every task is in `committed` status
   - Verify all `approved` tasks have a corresponding commit
   - Check for any lingering "escalated" tasks

3. Verdict:
   - Write SPRINT_COMPLETION_REVIEW.md using the format:
     **Verdict:** [Approved | Revision Required]
     - If Revision Required: list missing commits or unresolved tasks
     - If Approved: confirm sprint is ready for retrospective

4. Finalize:
   - Update sprint status via `/forge:store update-status sprint {sprintId} status completed`
   - Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`
   - Execute Token Reporting (see `_fragments/finalize.md`)
```