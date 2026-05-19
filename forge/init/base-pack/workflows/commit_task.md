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

# Commit Task
## Iron Laws

- Commit only the artifacts produced for this task; do not sweep unrelated working-tree changes into the commit. The commit boundary mirrors the task boundary.
- Read `.forge/personas/engineer.md` first; print the persona identity line (emoji, name, tagline) to stdout before any other tool use.
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
   - **Entity-mode resolution:** read the kickoff arguments. `--task {id}` → `entity_kind = "task"`, `record_id = {id}`. `--bug {id}` → `entity_kind = "bug"`, `record_id = {id}`. All store-cli calls below substitute `{entity_kind}` and `{record_id}` for the literal "task"/{taskId} placeholders.
   - Run: `node "$FORGE_ROOT/tools/preflight-gate.cjs" --phase commit --{entity_kind} {record_id}`
   - Exit 1 (gate failed) → print stderr and HALT. Do not proceed; do not attempt to produce the artifact.
   - Exit 2 (misconfiguration) → print stderr and HALT.
   - Exit 0 → continue.

1. Load Context:
   - Read the record manifest (task or bug, per entity_kind).
   - Read ARCHITECT_APPROVAL.md from the record's artifact directory:
     - Task mode: `engineering/sprints/{sprint}/{task}/ARCHITECT_APPROVAL.md`
     - Bug mode:  `engineering/bugs/{bugDir}/ARCHITECT_APPROVAL.md`

2. Staging:
   - Stage all record-related artifacts and the code changes:
     - Task mode: PLAN.md, PROGRESS.md, REVIEW files, ARCHITECT_APPROVAL.md, and the implementation diff under the task directory plus modified source files.
     - Bug mode: BUG_FIX_PLAN.md (Path B only — absent on Path A), TRIAGE.md, PROGRESS.md, REVIEW files, ARCHITECT_APPROVAL.md, the regression test, and the implementation diff.
   - Verify no unrelated files are staged.

3. Commit:
   - Create a commit with a message following project conventions.
   - Include the record ID in the commit message: task ID for task mode, bug ID for bug mode.
   - Append a `Co-authored-by:` trailer crediting the AI assistant that actually ran the session. Resolve the identity from the host runtime: on Claude Code use `Co-authored-by: Claude <noreply@anthropic.com>`; on pi / Ollama / any other runtime use `Co-authored-by: {modelId} <noreply@{provider}.ai>` derived from the session's `provider` and `modelId` (e.g. `Co-authored-by: glm-5.1:cloud <noreply@ollama.ai>`); if neither is resolvable, omit the trailer rather than guess. Do NOT hardcode `Claude Opus 4.6 <noreply@anthropic.com>` — that literal is rejected as a regression of forge#82 (commits authored under the wrong model).
   - Let git's configured `user.name` / `user.email` own the commit author; never pass `--author` to override it.

4. Store Finalization:
   - Transitions:
     - **Task mode** — `approved → committed` (terminal): `node "$FORGE_ROOT/tools/store-cli.cjs" update-status task {taskId} status committed`
     - **Bug mode** — `in-progress → fixed` (terminal): `node "$FORGE_ROOT/tools/store-cli.cjs" update-status bug {bugId} status fixed`. This is the ONLY phase in the bug pipeline that writes `bug.status` post-triage (see `meta-fix-bug.md § Iron Laws #2`). Do NOT write `approved` or `verified` — those values are vestigial enum members slated for removal.

5. Finalize:
   - **Do NOT emit a phase event yourself.** The orchestrator owns event emission — it composes the canonical event from runtime telemetry (model, provider, tokens, wall times) plus the SUMMARY you write in the next step. Subagents that call `store-cli emit` for phase events hallucinate runtime facts (see Plan 11 / Slice 2). Write the SUMMARY and return.
```