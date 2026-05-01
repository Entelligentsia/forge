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

# Review Code

## Iron Law

Evaluate the code against the approved PLAN.md and the original task prompt. Do not accept "it works" as a substitute for "it is correct and maintainable."

## Algorithm

```

0. Pre-flight Gate Check:
   - Resolve FORGE_ROOT (`node -e "console.log(require('./.forge/config.json').paths.forgeRoot)"`).
   - Run: `node "$FORGE_ROOT/tools/preflight-gate.cjs" --phase review-code --task {taskId}`
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
   - Update task status via `/forge:store update-status task {taskId} status review-approved` (if Approved) or `/forge:store update-status task {taskId} status code-revision-required` (if Revision Required)
   - Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`
   - Execute Token Reporting (see `_fragments/finalize.md`)

6. Emit Summary Sidecar:
   - Write `REVIEW-IMPL-SUMMARY.json` to the task directory with the following shape:
     ```json
     {
       "objective":   "<one sentence — what this review assessed>",
       "findings":    ["<up to 12 bullets, 200 chars each — key issues or confirmations>"],
       "verdict":     "<approved | revision>",
       "written_at":  "<current ISO 8601 timestamp>",
       "artifact_ref":"CODE_REVIEW.md"
     }
     ```
   - Call:
     ```
     node "$FORGE_ROOT/tools/store-cli.cjs" set-summary {task_id} code_review \
       engineering/sprints/{sprint}/{task}/REVIEW-IMPL-SUMMARY.json
     ```
   - If set-summary exits non-zero, fix the sidecar JSON and retry. Do not proceed without a valid summary.
```
