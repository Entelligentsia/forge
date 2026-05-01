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

## Iron Law

YOU MUST evaluate the plan against what the task actually requires, not against what the plan claims to deliver. Plans routinely understate complexity, omit edge cases, or skip security steps. Your job is adversarial review, not approval.

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
   - Update task status via `/forge:store update-status task {taskId} status review-approved` (if Approved) or `/forge:store update-status task {taskId} status plan-revision-required` (if Revision Required)
   - Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`
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
- Token Reporting: `_fragments/finalize.md` — wire via `file_ref:`.
- Event Emission: "complete" event MUST include the `eventId` passed by the orchestrator.
