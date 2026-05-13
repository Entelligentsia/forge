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

# 🌿 Meta-Workflow: Review Plan

## Iron Laws

- Evaluate the plan against what the task actually requires, not against what the plan claims to deliver. Plans routinely understate complexity, omit edge cases, or skip security steps. Your job is adversarial review, not approval.
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
   - Run: `node "$FORGE_ROOT/tools/preflight-gate.cjs" --phase review-plan --task {taskId}`
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
   - Transitions: task FSM predecessor must be `planned`.
     - Approved          → `plan-approved`
     - Revision Required → `plan-revision-required`
     - Out-of-band escapes (any state): `code-revision-required`, `blocked`, `escalated`, `abandoned`
   - Update task status via `node "$FORGE_ROOT/tools/store-cli.cjs" update-status task {taskId} status plan-approved` (if Approved) or `node "$FORGE_ROOT/tools/store-cli.cjs" update-status task {taskId} status plan-revision-required` (if Revision Required)
   - Emit the complete event via `node "$FORGE_ROOT/tools/store-cli.cjs" emit {sprintId} '{event-json}'`
   - Execute Token Reporting (see `_fragments/finalize.md`)

5. Emit Summary Sidecar:
   - Write `REVIEW-PLAN-SUMMARY.json` to the task directory with the following shape:
     ```json
     {
       "objective":   "<one sentence — what this review assessed>",
       "findings":    ["<up to 12 bullets, 200 chars each — key issues or confirmations>"],
       "verdict":     "<approved | revision>",
       "written_at":  "<current ISO 8601 timestamp>",
       "artifact_ref":"PLAN_REVIEW.md"
     }
     ```
   - Call:
     ```
     node "$FORGE_ROOT/tools/store-cli.cjs" set-summary {task_id} review_plan \
       engineering/sprints/{sprint}/{task}/REVIEW-PLAN-SUMMARY.json
     ```
   - If set-summary exits non-zero, fix the sidecar JSON and retry. Do not proceed without a valid summary.
```

## Generation Notes

- Enforce `**Verdict:** [Approved | Revision Required]` format exactly — orchestrator branches on this.
- **Markers (required by `/forge:run-task` kickoff shim):** Generated workflow MUST include the "Iron Laws" section, the "Store-Write Verification" section, the literal `forge_store` token, and the `.forge/personas/supervisor.md` persona path. Missing any → kickoff shim refuses to dispatch.
- Token Reporting: `_fragments/finalize.md` — wire via `file_ref:`.
- Event Emission: "complete" event MUST include the `eventId` passed by the orchestrator.
