---
requirements:
  reasoning: High
  context: Medium
  speed: Low
deps:
  personas: [architect]
  skills: [architect, generic]
  templates: [PLAN_TEMPLATE, TASK_PROMPT_TEMPLATE]
  sub_workflows: [review_plan]
  kb_docs: [architecture/stack.md, MASTER_INDEX.md]
  config_fields: [commands.test, paths.engineering]
---

# 🌱 Meta-Workflow: Plan Task

## Purpose

The Engineer reads the task prompt, researches the codebase, and produces an implementation plan.

## Algorithm

```

0. Pre-flight Gate Check:
   - Resolve FORGE_ROOT (`node -e "console.log(require('./.forge/config.json').paths.forgeRoot)"`).
   - Run: `node "$FORGE_ROOT/tools/preflight-gate.cjs" --phase plan --task {taskId}`
   - Exit 1 (gate failed) → print stderr and HALT. Do not proceed; do not attempt to produce the artifact.
   - Exit 2 (misconfiguration) → print stderr and HALT.
   - Exit 0 → continue.
   - Run `/cost` to verify token reporting available.
   - If `/cost` succeeds → note for later (will use reported data)
   - If `/cost` fails or unavailable → note for later (will use estimates)

1. Load Context:
   - Read task prompt (source of truth)
   - Consult the architecture context summary injected in your prompt (under
     "Architecture context"). If no summary was injected, read
     `engineering/architecture/stack.md` directly.
   - Read full architecture docs (paths listed in the injected context) only
     when the summary is insufficient for your decision.
   - Read business domain docs relevant to the task
   - Read stack checklist

2. Research:
   - Identify files for modification (Glob, Grep, Read)
   - Map existing patterns in the target area
   - Identify existing tests to be maintained or expanded
   - Identify whether the change is **material** (triggers version bump) or not:
     - Bug fixes to any command, hook, tool spec, or workflow → material
     - Tool-spec changes that alter generated tool behaviour → material
     - Command-file changes that alter behaviour → material
     - Hook changes → material
     - Schema changes to `.forge/store/` or `.forge/config.json` → material
     - Docs-only changes → NOT material

3. Plan:
   - Generate PLAN.md using the project plan template
   - Ensure inclusion of: Objective, Approach, Files to Modify, Data Model Changes, Testing Strategy, Acceptance Criteria, and Operational Impact

4. Knowledge Writeback:
   - If new patterns were discovered, update architecture or business domain docs

5. Finalize:
   - Update task status via `/forge:store update-status task {taskId} status planned`
   - Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`
   - Execute Token Reporting (see Generation Instructions)

6. Emit Summary Sidecar:
   - Write `PLAN-SUMMARY.json` to the task directory with the following shape:
     ```json
     {
       "objective":   "<one sentence — what this plan sets out to build>",
       "key_changes": ["<up to 12 bullets, 200 chars each>"],
       "verdict":     "n/a",
       "written_at":  "<current ISO 8601 timestamp>",
       "artifact_ref":"PLAN.md"
     }
     ```
   - Call:
     ```
     node "$FORGE_ROOT/tools/store-cli.cjs" set-summary {task_id} plan \
       engineering/sprints/{sprint}/{task}/PLAN-SUMMARY.json
     ```
   - If set-summary exits non-zero, fix the sidecar JSON and retry. Do not proceed without a valid summary.
```

## Generation Instructions

- **Workflow Structure:** The generated `plan_task.md` must follow the strict "Algorithm" block format.
- **Context Isolation:** The generated workflow must explicitly forbid inline execution. All complex sub-tasks must be delegated via the `Agent` tool.
- **Project Specifics:**
  - Replace architecture/domain doc placeholders with actual project file paths.
  - Embed the project's specific PLAN template path.
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
