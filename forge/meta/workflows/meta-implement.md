---
requirements:
  reasoning: Medium
  context: Medium
  speed: Medium
deps:
  personas: [engineer]
  skills: [engineer, generic]
  templates: [PROGRESS_TEMPLATE]
  sub_workflows: [review_code]
  kb_docs: [architecture/stack.md, architecture/routing.md]
  config_fields: [commands.test, paths.engineering]
---

# 🌱 Meta-Workflow: Implement Plan

## Purpose

The Engineer implements the approved plan: write code, run tests, verify, and document progress.

## Algorithm

```

0. Pre-flight Gate Check:
   - Resolve FORGE_ROOT (`node -e "console.log(require('./.forge/config.json').paths.forgeRoot)"`).
   - Run: `node "$FORGE_ROOT/tools/preflight-gate.cjs" --phase implement --task {taskId}`
   - Exit 1 (gate failed) → print stderr and HALT. Do not proceed; do not attempt to produce the artifact.
   - Exit 2 (misconfiguration) → print stderr and HALT.
   - Exit 0 → continue.

1. Load Context:
   - Consult the architecture context summary injected in your prompt (under
     "Architecture context"). If no summary was injected, read
     `engineering/architecture/stack.md` directly.
   - Read full architecture docs (paths listed in the injected context) only
     when the summary is insufficient for your decision.
   - Read business domain docs relevant to the task
   - Read the approved PLAN.md

2. Implementation:
   - Execute plan steps incrementally
   - Perform "compile/check" after each significant change
   - Ensure all new code follows established project patterns

3. Verification:
   - Run syntax verification: {SYNTAX_CHECK}
   - Run test suite: {TEST_COMMAND}
   - Run build if frontend assets modified: {BUILD_COMMAND}

4. Documentation:
   - Write PROGRESS.md containing:
     - Summary of changes
     - Test evidence (copy of output)
     - Files changed manifest

5. Knowledge Writeback:
   - Update architecture/domain/stack-checklist if discoveries were made
   - Tag updates: `<!-- Discovered during {TASK_ID} — {date} -->`

6. Finalize:
   - Update task status via `/forge:store update-status task {taskId} status implemented`
   - Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`
   - Execute Token Reporting (see Generation Instructions)

7. Emit Summary Sidecar:
   - Write `IMPLEMENTATION-SUMMARY.json` to the task directory with the following shape:
     ```json
     {
       "objective":   "<one sentence — what this implementation delivered>",
       "key_changes": ["<up to 12 bullets, 200 chars each — files changed, key decisions>"],
       "verdict":     "n/a",
       "written_at":  "<current ISO 8601 timestamp>",
       "artifact_ref":"PROGRESS.md"
     }
     ```
   - Call:
     ```
     node "$FORGE_ROOT/tools/store-cli.cjs" set-summary {task_id} implementation \
       engineering/sprints/{sprint}/{task}/IMPLEMENTATION-SUMMARY.json
     ```
   - If set-summary exits non-zero, fix the sidecar JSON and retry. Do not proceed without a valid summary.
```

## Generation Instructions

- **Workflow Structure:** The generated `implement_plan.md` must follow the strict "Algorithm" block format.
- **Context Isolation:** Forbid inline execution of complex logic; use the `Agent` tool for sub-tasks.
- **Project Specifics:**
  - Replace {SYNTAX_CHECK}, {TEST_COMMAND}, and {BUILD_COMMAND} with actual project commands.
  - Reference project-specific architecture docs by name.
- **Token Reporting:** The generated workflow MUST mandate the following before returning:
  1. Run `/cost` to retrieve session token usage.
  2. Parse: `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`.
  3. Write the usage sidecar via `/forge:store emit {sprintId} '{sidecar-json}' --sidecar`.
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.
