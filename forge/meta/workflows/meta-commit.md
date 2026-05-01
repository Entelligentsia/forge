---
requirements:
  reasoning: Low
  context: Low
  speed: High
audience: subagent
phase: commit
context:
  architecture: false
  prior_summaries: none
  persona: summary
  master_index: false
  diff_mode: false
deps:
  personas: [engineer]
  skills: [engineer, generic]
  templates: [PROGRESS_TEMPLATE]
  sub_workflows: []
  kb_docs: []
  config_fields: [commands.test, paths.engineering]
---

# 🌱 Meta-Workflow: Commit Task

## Purpose

Seal a completed and approved task by committing its artifacts to the VCS and updating the store.

## Algorithm

```

0. Pre-flight Gate Check:
   - Resolve FORGE_ROOT (`node -e "console.log(require('./.forge/config.json').paths.forgeRoot)"`).
   - Run: `node "$FORGE_ROOT/tools/preflight-gate.cjs" --phase commit --task {taskId}`
   - Exit 1 (gate failed) → print stderr and HALT. Do not proceed; do not attempt to produce the artifact.
   - Exit 2 (misconfiguration) → print stderr and HALT.
   - Exit 0 → continue.

1. Load Context:
   - Read task manifest
   - Read ARCHITECT_APPROVAL.md

2. Staging:
   - Stage all task-related artifacts: PLAN.md, PROGRESS.md, REVIEW files, and code changes
   - Verify no unrelated files are staged

3. Commit:
   - Create a commit with a message following project conventions
   - Include task ID in the commit message
   - Co-author with "Claude Opus 4.6 <noreply@anthropic.com>"

4. Store Finalization:
   - Update task status via `/forge:store update-status task {taskId} status committed`

5. Finalize:
   - Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`
   - Execute Token Reporting (see Generation Instructions)
```

## Generation Instructions

- **Workflow Structure:** The generated `commit_task.md` must follow the strict "Algorithm" block format.
- **Context Isolation:** Forbid inline execution of commit operations; use the `Agent` tool for sub-tasks.
- **Project Specifics:**
  - Embed project's commit message conventions.
- **Token Reporting:** See `_fragments/finalize.md` — wire via `file_ref:`.
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.
