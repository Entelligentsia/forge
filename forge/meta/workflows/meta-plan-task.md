---
requirements:
  reasoning: High
  context: Medium
  speed: Low
audience: subagent
phase: plan
context:
  architecture: true
  prior_summaries: delta
  persona: summary
  master_index: false
  diff_mode: false
deps:
  personas: [architect]
  skills: [architect, generic]
  templates: [PLAN_TEMPLATE, TASK_PROMPT_TEMPLATE]
  sub_workflows: [review_plan]
  kb_docs: [architecture/stack.md]
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
1. Load Context:
   - Read `.forge/personas/architect.md` first; print the persona identity line (emoji, name, tagline) to stdout before any other tool use.
   - Read task prompt (source of truth)
   - Query the store for this task and any related entities:
     ```sh
     node "$FORGE_ROOT/tools/store-cli.cjs" nlp "{taskId} with sprint with feature"
     ```
     Use store results directly if they include title, status, sprint, and excerpt.
   - Read the architecture summary from your injected context (if present).
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
   - Transitions: task FSM legal targets from this step
     - `draft` → `planned` (this workflow's only legal target)
     - Out-of-band escapes (any state): `plan-revision-required`, `code-revision-required`, `blocked`, `escalated`, `abandoned`
   - Update task status via `node "$FORGE_ROOT/tools/store-cli.cjs" update-status task {taskId} status planned`
   - Emit the complete event via `node "$FORGE_ROOT/tools/store-cli.cjs" emit {sprintId} '{event-json}'`
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

## Iron Laws

- Follow the Algorithm step by step. No code, pseudocode, or implementation sketches in the plan.
- Read `.forge/personas/architect.md` first; print the persona identity line to stdout before any other tool use.
- All store I/O via `forge_store` (or `node "$FORGE_ROOT/tools/store-cli.cjs"`). Never edit `.forge/store/*.json` directly.

## Store-Write Verification

Every `forge_store` write MUST succeed before advancing. If `store-cli` exits
non-zero or the `PreToolUse` write-boundary hook blocks the call (exit 2):

1. Parse the structured error (names the offending field + schema file).
2. Correct the JSON to satisfy the schema.
3. Retry. Repeat up to 3 times.
4. After 3 failures, halt and escalate with original payload, corrected payload, and all error messages.

Never set `FORGE_SKIP_WRITE_VALIDATION=1` — operator-only emergency switch.

## Friction Emit
Emit `type:friction` `{workflow:plan-task, persona:architect, issue}` per `_fragments/friction-emit.md`.

## Generation Instructions

- **Workflow Structure:** Strict "Algorithm" block format.
- **Markers (required by `/forge:plan` kickoff shim):** Generated workflow MUST include the "Iron Laws" section, the "Store-Write Verification" section, the literal `forge_store` token, and the `architect.md` persona path. Missing any → kickoff shim refuses to dispatch.
- **Context Isolation:** Forbid inline execution. Delegate complex sub-tasks via the `Agent` tool.
- **Project Specifics:**
  - Replace architecture/domain doc placeholders with actual project file paths.
  - Embed the project's specific PLAN template path.
- **Token Reporting:** See `_fragments/finalize.md` — wire via `file_ref:`.
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.
