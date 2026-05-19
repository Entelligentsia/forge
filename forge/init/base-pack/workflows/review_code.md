---
requirements:
  reasoning: High
  context: Medium
  speed: Low
audience: subagent
phase: review-code
context:
  architecture: false
  prior_summaries: delta
  persona: summary
  master_index: false
  diff_mode: true
deps:
  personas: [supervisor]
  skills: [supervisor, generic]
  templates: [CODE_REVIEW_TEMPLATE]
  sub_workflows: []
  kb_docs: [architecture/stack.md, architecture/routing.md]
  config_fields: [commands.test, paths.engineering]
---

# Review Implementation
## Iron Laws

- Evaluate the code against the approved PLAN.md and the original task prompt. Do not accept "it works" as a substitute for "it is correct and maintainable."
- Read `.forge/personas/supervisor.md` first; print the persona identity line (emoji, name, tagline) to stdout before any other tool use.
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
   - Run: `node "$FORGE_ROOT/tools/preflight-gate.cjs" --phase review-code --{entity_kind} {record_id}`
   - Exit 1 (gate failed) → print stderr and HALT. Do not proceed; do not attempt to produce the artifact.
   - Exit 2 (misconfiguration) → print stderr and HALT.
   - Exit 0 → continue.
1. Load Context:
   - Read task prompt
   - Read approved PLAN.md
   - Read PROGRESS.md

   **Read mode: diff-first.** Read `git diff $(git merge-base HEAD origin/main)..HEAD -- <files-listed-in-PLAN>` first. Read full source files only when the diff context is insufficient to judge a finding (e.g., the change is an inversion of an invariant defined elsewhere). Do not pre-load full source — tool calls earn their tokens.

2. Review:
   - Verify all plan steps were executed
   - Review code for quality, security, and architecture alignment
   - Verify test evidence in PROGRESS.md is authentic and complete

3. Verdict:
   - Write CODE_REVIEW.md using the format:
     **Verdict:** [Approved | Revision Required]
     - If Revision Required: provide numbered, actionable items
     - If Approved: provide any advisory notes

4. Knowledge Writeback:
   - Update stack-checklist.md if new patterns or pitfalls were discovered

5. Finalize:
   - Transitions:
     - **Task mode** — Update status: `node "$FORGE_ROOT/tools/store-cli.cjs" update-status task {taskId} status review-approved` (if Approved) or `... status code-revision-required` (if Revision Required).
     - **Bug mode** — NO status write. The bug remains `in-progress`. The verdict signal travels through `summaries.code_review.verdict` (read by `read-verdict.cjs § BUG_PHASE_VERDICT_SOURCE`), not `bug.status`. Writing `bug.status` here violates `meta-fix-bug.md § Iron Laws #2`.
   - **Do NOT emit a phase event yourself.** The orchestrator (or kickoff handler) owns event emission — it composes the canonical event from runtime telemetry (model, provider, tokens, wall times) plus the SUMMARY you write in the next step. Subagents that call `store-cli emit` for phase events hallucinate runtime facts (see Plan 11 / Slice 2). Write the SUMMARY and return.

6. Emit Summary Sidecar:
   - Write `REVIEW-IMPL-SUMMARY.json` to the record's directory with the following shape:
     ```json
     {
       "objective":   "<one sentence — what this review assessed>",
       "findings":    ["<up to 12 bullets, 200 chars each — key issues or confirmations>"],
       "verdict":     "<approved | revision>",
       "written_at":  "<current ISO 8601 timestamp>",
       "artifact_ref":"CODE_REVIEW.md"
     }
     ```
   - Call (task mode):
     ```
     node "$FORGE_ROOT/tools/store-cli.cjs" set-summary {taskId} code_review \
       engineering/sprints/{sprint}/{task}/REVIEW-IMPL-SUMMARY.json
     ```
     Or (bug mode):
     ```
     node "$FORGE_ROOT/tools/store-cli.cjs" set-bug-summary {bugId} code_review \
       engineering/bugs/{bugDir}/REVIEW-IMPL-SUMMARY.json
     ```
   - If the set-summary call exits non-zero, fix the sidecar JSON and retry. Do not proceed without a valid summary.
```