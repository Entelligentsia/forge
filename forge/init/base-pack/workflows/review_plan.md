---
requirements:
  reasoning: High
  context: Medium
  speed: Low
audience: subagent
phase: review-plan
context:
  architecture: false
  prior_summaries: delta
  persona: summary
  master_index: false
  diff_mode: false
deps:
  personas: [supervisor]
  skills: [supervisor, generic]
  templates: [PLAN_REVIEW_TEMPLATE]
  sub_workflows: []
  kb_docs: [architecture/stack.md]
  config_fields: [paths.engineering]
---


# Review Plan

<!-- See _fragments/iron-laws.md for Iron Laws section structure guidance -->
## Iron Laws

- Evaluate the plan against what the task actually requires, not against what the plan claims to deliver. Plans routinely understate complexity, omit edge cases, or skip security steps. Your job is adversarial review, not approval.
- Read `.forge/personas/supervisor.md` first; print the persona identity line (emoji, name, tagline) to stdout before any other tool use.
- All store I/O via `forge_store` (or `node "$FORGE_ROOT/tools/store-cli.cjs"`). Never edit `.forge/store/*.json` directly.

## Store-Write Verification

<!-- See _fragments/store-write-verification.md for the canonical block content -->

## Algorithm

```

0. Pre-flight Gate Check:
   - Resolve FORGE_ROOT (`node -e "console.log(require('./.forge/config.json').paths.forgeRoot)"`).
   - **Entity-mode resolution:** read the kickoff arguments. `--task {id}` → `entity_kind = "task"`, `record_id = {id}`. `--bug {id}` → `entity_kind = "bug"`, `record_id = {id}`. All store-cli calls below substitute `{entity_kind}` and `{record_id}` for the literal "task"/{taskId} placeholders.
   - Run: `node "$FORGE_ROOT/tools/preflight-gate.cjs" --phase review-plan --{entity_kind} {record_id}`
   - Exit 1 (gate failed) → print stderr and HALT. Do not proceed; do not attempt to produce the artifact.
   - Exit 2 (misconfiguration) → print stderr and HALT.
   - Exit 0 → continue.
1. Load Context:
   - Read task prompt (source of truth)
   - Read PLAN.md (subject of review)
   - Read stack checklist if available

2. Review:
   - Evaluate feasibility, completeness, security, architecture alignment, and testing strategy
   - Identify missing edge cases or failure modes

3. Verdict:
   - Write PLAN_REVIEW.md using the format:
     **Verdict:** [Approved | Revision Required]
     - If Revision Required: provide numbered, actionable items
     - If Approved: provide any advisory notes

4. Finalize:
   - Transitions:
     - **Task mode** — predecessor must be `planned`.
       - Approved          → `plan-approved`
       - Revision Required → `plan-revision-required`
       - Out-of-band escapes (any state): `code-revision-required`, `blocked`, `escalated`, `abandoned`
       Update status: `node "$FORGE_ROOT/tools/store-cli.cjs" update-status task {taskId} status plan-approved` (if Approved) or `... status plan-revision-required` (if Revision Required)
     - **Bug mode** — NO status write. The bug remains `in-progress`. The verdict signal travels through `summaries.review_plan.verdict` (read by `read-verdict.cjs § BUG_PHASE_VERDICT_SOURCE`), not `bug.status`. Writing `bug.status` here violates `meta-fix-bug.md § Iron Laws #2`.
   - **Do NOT emit a phase event yourself.** The orchestrator owns event emission — it composes the canonical event from runtime telemetry (model, provider, tokens, wall times) plus the SUMMARY you write in the next step. Subagents that call `store-cli emit` for phase events hallucinate runtime facts (see Plan 11 / Slice 2). Write the SUMMARY and return.

5. Emit Summary Sidecar:
   - Write `REVIEW-PLAN-SUMMARY.json` to the record's directory with the following shape:
     ```json
     {
       "objective":   "<one sentence — what this review assessed>",
       "findings":    ["<up to 12 bullets, 200 chars each — key issues or confirmations>"],
       "verdict":     "<approved | revision>",
       "written_at":  "<current ISO 8601 timestamp>",
       "artifact_ref":"PLAN_REVIEW.md"
     }
     ```
   - Call (task mode):
     ```
     node "$FORGE_ROOT/tools/store-cli.cjs" set-summary {taskId} review_plan \
       engineering/sprints/{sprint}/{task}/REVIEW-PLAN-SUMMARY.json
     ```
     Or (bug mode):
     ```
     node "$FORGE_ROOT/tools/store-cli.cjs" set-bug-summary {bugId} review_plan \
       engineering/bugs/{bugDir}/REVIEW-PLAN-SUMMARY.json
     ```
   - If the set-summary call exits non-zero, fix the sidecar JSON and retry. Do not proceed without a valid summary.
```

<!-- See _fragments/generation-instructions.md for Generation Instructions template -->