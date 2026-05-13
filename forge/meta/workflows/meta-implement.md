---
requirements:
  reasoning: Medium
  context: Medium
  speed: Medium
audience: subagent
phase: implement
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
   - Read `.forge/personas/engineer.md` first; print the persona identity line (emoji, name, tagline) to stdout before any other tool use.
   - store-cli verbs: `read` | `list` | `write` | `emit` | `update-status` | `set-summary` | `describe` | `nlp` | `query` | `delete` — there is no `get`/`set`/`find`. See `_fragments/store-cli-verbs.md` for full notes; run `--help` before improvising.
   - Read the approved PLAN.md
   - Read business domain docs relevant to the task

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
   - Transitions: task FSM legal predecessors are `planned`, `plan-approved`, or `implementing`; target is `implemented`.
     - `planned`        → `implemented` (workflow-prose path — direct)
     - `plan-approved`  → `implementing` → `implemented` (supervisor-review path)
     - Out-of-band escapes (any state): `plan-revision-required`, `code-revision-required`, `blocked`, `escalated`, `abandoned`
   - Update task status via `node "$FORGE_ROOT/tools/store-cli.cjs" update-status task {taskId} status implemented`
   - Emit the complete event via `node "$FORGE_ROOT/tools/store-cli.cjs" emit {sprintId} '{event-json}'`
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

## Iron Laws

- Follow the Algorithm step by step. Execute the approved PLAN.md exactly; do not invent scope or skip steps without updating the plan first.
- Read `.forge/personas/engineer.md` first; print the persona identity line to stdout before any other tool use.
- All store I/O via `forge_store` (or `node "$FORGE_ROOT/tools/store-cli.cjs"`). Never edit `.forge/store/*.json` directly.
- Run the full test suite before declaring the task implemented. Silent continuation past test failures is never acceptable.

## Store-Write Verification

Every `forge_store` write MUST succeed before advancing. If `store-cli` exits
non-zero or the `PreToolUse` write-boundary hook blocks the call (exit 2):

1. Parse the structured error (names the offending field + schema file).
2. Correct the JSON to satisfy the schema.
3. Retry. Repeat up to 3 times.
4. After 3 failures, halt and escalate with original payload, corrected payload, and all error messages.

Never set `FORGE_SKIP_WRITE_VALIDATION=1` — operator-only emergency switch.

## Friction Emit
Emit `type:friction` `{workflow:implement, persona:engineer, issue}` per `_fragments/friction-emit.md`.

## Generation Instructions

- **Workflow Structure:** Strict "Algorithm" block format.
- **Markers (required by `/forge:implement` kickoff shim):** Generated workflow MUST include the "Iron Laws" section, the "Store-Write Verification" section, the literal `forge_store` token, and the `engineer.md` persona path. Missing any → kickoff shim refuses to dispatch.
- **Context Isolation:** Forbid inline execution of complex logic; use the `Agent` tool for sub-tasks.
- **Project Specifics:**
  - Replace {SYNTAX_CHECK}, {TEST_COMMAND}, and {BUILD_COMMAND} with actual project commands.
  - Reference project-specific architecture docs by name.
- **Token Reporting:** See `_fragments/finalize.md` — wire via `file_ref:`.
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.
