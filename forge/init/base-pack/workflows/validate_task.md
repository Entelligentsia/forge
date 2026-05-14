---
requirements:
  reasoning: High
  context: Medium
  speed: Low
audience: subagent
phase: validate
context:
  architecture: false
  prior_summaries: none
  persona: summary
  master_index: false
  diff_mode: true
deps:
  personas: [qa-engineer]
  skills: [qa-engineer, generic]
  templates: []
  sub_workflows: []
  kb_docs: [architecture/stack.md]
  config_fields: [commands.test, paths.engineering]
---

# Validate Task
## Iron Laws

- Validate against the acceptance criteria as written; do not soften, expand, or reinterpret them. The validator's job is to catch what the implementer optimistically considered "done".
- Read `.forge/personas/qa-engineer.md` first; print the persona identity line (emoji, name, tagline) to stdout before any other tool use.
- All store I/O via `forge_store` (or `node "$FORGE_ROOT/tools/store-cli.cjs"`). Never edit `.forge/store/*.json` directly.

## Store-Write Verification

Every `forge_store` write MUST succeed before advancing. If `store-cli` exits
non-zero or the `PreToolUse` write-boundary hook blocks the call (exit 2):

1. Parse the structured error (names the offending field + schema file).
2. Correct the JSON to satisfy the schema.
3. Retry. Repeat up to 3 times.
4. After 3 failures, halt and escalate with original payload, corrected payload, and all error messages.

Never set `FORGE_SKIP_WRITE_VALIDATION=1` — operator-only emergency switch.

## Algorithm

```

0. Pre-flight Gate Check:
   - Resolve FORGE_ROOT (`node -e "console.log(require('./.forge/config.json').paths.forgeRoot)"`).
   - Run: `node "$FORGE_ROOT/tools/preflight-gate.cjs" --phase validate --task {taskId}`
   - Exit 1 (gate failed) → print stderr and HALT. Do not proceed; do not attempt to produce the artifact.
   - Exit 2 (misconfiguration) → print stderr and HALT.
   - Exit 0 → continue.

1. Load Context:
   - Read task prompt
   - Read approved PLAN.md
   - Read the implementation
   - Read PROGRESS.md

2. Validation:
   - Execute the "Acceptance Criteria" checklist from the plan
   - Verify that all technical constraints (e.g., performance, security) are met
   - Check for any regressions in related functionality
   - When re-running the test suite, use the **resolved test command** from `commands.test` in `.forge/config.json` (i.e. `` `${commands.test}` ``, e.g. `.venv/bin/python -m pytest`). Template placeholder: {{TEST_COMMAND}}. Do NOT invoke bare `python` / `python3` — the project interpreter is rarely on `$PATH`.

3. Verdict:
   - Write VALIDATION_REPORT.md using the format:
     **Verdict:** [Approved | Revision Required]
     - If Revision Required: list the failed criteria and required fixes
     - If Approved: confirm the task is validated

4. Finalize:
   - Update task status via `node "$FORGE_ROOT/tools/store-cli.cjs" update-status task {taskId} status review-approved` (if Approved) or `node "$FORGE_ROOT/tools/store-cli.cjs" update-status task {taskId} status code-revision-required` (if Revision Required)
   - **Do NOT emit a phase event yourself.** The orchestrator owns event emission — it composes the canonical event from runtime telemetry (model, provider, tokens, wall times) plus the SUMMARY you write in the next step. Subagents that call `store-cli emit` for phase events hallucinate runtime facts (see Plan 11 / Slice 2). Write the SUMMARY and return.
   - Execute Token Reporting (see `_fragments/finalize.md`)

5. Emit Summary Sidecar:
   - Write `VALIDATION-SUMMARY.json` to the task directory with the following shape:
     ```json
     {
       "objective":   "<one sentence — what acceptance criteria were validated>",
       "findings":    ["<up to 12 bullets, 200 chars each — pass/fail per criterion>"],
       "verdict":     "<approved | revision>",
       "written_at":  "<current ISO 8601 timestamp>",
       "artifact_ref":"VALIDATION_REPORT.md"
     }
     ```
   - Call:
     ```
     node "$FORGE_ROOT/tools/store-cli.cjs" set-summary {task_id} validation \
       engineering/sprints/{sprint}/{task}/VALIDATION-SUMMARY.json
     ```
   - If set-summary exits non-zero, fix the sidecar JSON and retry. Do not proceed without a valid summary.
```

## Friction Emit
Emit `type:friction` `{workflow:validate, persona:qa-engineer, issue}` per `_fragments/friction-emit.md`.