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

# 🗻 Meta-Workflow: Approve Task

## Purpose

The Architect gives final sign-off on a completed task after Supervisor approval. This is the last gate before commit.

## Algorithm

```

0. Pre-flight Gate Check:
   - Resolve FORGE_ROOT (`node -e "console.log(require('./.forge/config.json').paths.forgeRoot)"`).
   - Run: `node "$FORGE_ROOT/tools/preflight-gate.cjs" --phase approve --task {taskId}`
   - Exit 1 (gate failed) → print stderr and HALT. Do not proceed; do not attempt to produce the artifact.
   - Exit 2 (misconfiguration) → print stderr and HALT.
   - Exit 0 → continue.
   - Run `/cost` to verify token reporting available.
   - If `/cost` succeeds → note for later (will use reported data)
   - If `/cost` fails or unavailable → note for later (will use estimates)

1. Load Context:
   - Read task prompt
   - Read final PLAN.md
   - Read approved CODE_REVIEW.md
   - Read PROGRESS.md

2. Architectural Review:
   - Verify implementation aligns with project architecture
   - Check for cross-cutting concerns (impact on other modules)
   - Assess operational impact (deployment changes, migrations)

3. Sign Off:
   - Write ARCHITECT_APPROVAL.md with:
     - Approval status
     - Deployment notes
     - Follow-up items for future sprints

4. Finalize:
   - Update task status via `/forge:store update-status task {taskId} status approved`
   - Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`
   - Execute Token Reporting (see Generation Instructions)
```

## Generation Instructions

- **Workflow Structure:** The generated `approve_task.md` must follow the strict "Algorithm" block format.
- **Context Isolation:** Forbid inline execution of complex architectural analysis; use the `Agent` tool for sub-tasks.
- **Project Specifics:**
  - Reference project's architecture docs.
  - Include project-specific deployment concerns.
- **Token Reporting:** The generated workflow MUST mandate the following before returning:
  1. Run `/cost` to retrieve session token usage.
  2. If `/cost` succeeds:
     - Parse: `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`.
     - Add `"source": "reported"` to sidecar JSON.
  3. If `/cost` fails or unavailable:
     - Set token fields to `null`: `"inputTokens": null, "outputTokens": null, "estimatedCostUSD": null`.
     - Add `"source": "missing"` to sidecar JSON.
     - Log: "Token data unavailable (/cost failed). Backfill later via estimate-usage.cjs."
  4. Write the usage sidecar via `/forge:store emit {sprintId} '{sidecar-json}' --sidecar`.
  5. **NEVER skip sidecar write.** Always emit (reported or placeholder with nulls).
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.
