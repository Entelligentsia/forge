---
requirements:
  reasoning: High
  context: Medium
  speed: Low
audience: subagent
phase: approve
context:
  architecture: true
  prior_summaries: all
  persona: summary
  master_index: false
  diff_mode: false
deps:
  personas: [architect]
  skills: [architect, generic]
  templates: []
  sub_workflows: []
  kb_docs: [architecture/stack.md]
  config_fields: [paths.engineering]
---

# 🗻 Meta-Workflow: Approve Task

## Purpose

The Architect gives final sign-off on a completed task after Supervisor approval. This is the last gate before commit.

## Iron Laws

- Approve only when the implementation is consistent with the project's architecture and the deployment posture is understood. Architectural sign-off is not a rubber stamp — it is the last point at which cross-cutting concerns can be caught cheaply.
- Read `.forge/personas/architect.md` first; print the persona identity line (emoji, name, tagline) to stdout before any other tool use.
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
   - Run: `node "$FORGE_ROOT/tools/preflight-gate.cjs" --phase approve --task {taskId}`
   - Exit 1 (gate failed) → print stderr and HALT. Do not proceed; do not attempt to produce the artifact.
   - Exit 2 (misconfiguration) → print stderr and HALT.
   - Exit 0 → continue.
1. Load Context:
   - Read task prompt
   - Read final PLAN.md
   - Read approved CODE_REVIEW.md
   - Read PROGRESS.md

2. Architectural Review:
   - Verify implementation aligns with project architecture
   - Check for cross-cutting concerns (impact on other modules)
   - Assess operational impact (deployment changes, migrations)

3. Sign Off:
   - Write ARCHITECT_APPROVAL.md containing:
     - A canonical verdict line for human readers, on its own line, in this exact form:
       ```
       **Verdict:** [Approved | Revision Required]
       ```
     - Approval status rationale
     - Deployment notes
     - Follow-up items for future sprints
   - The downstream commit-phase preflight gate does NOT read this markdown; it reads `task.status === "approved"` set in step 4. The `**Verdict:**` line is a human breadcrumb only.

4. Finalize:
   - Update task status via `node "$FORGE_ROOT/tools/store-cli.cjs" update-status task {taskId} status approved`
   - Emit the complete event via `node "$FORGE_ROOT/tools/store-cli.cjs" emit {sprintId} '{event-json}'`
   - Execute Token Reporting (see Generation Instructions)
```

## Generation Instructions

- **Workflow Structure:** The generated `approve_task.md` must follow the strict "Algorithm" block format.
- **Verdict Detection:** Instruct the architect to write a literal `**Verdict:** [Approved | Revision Required]` line in ARCHITECT_APPROVAL.md for human readability. Downstream gates read `task.status` via read-verdict.cjs, not this markdown — but the line remains a useful breadcrumb for operators reviewing artifacts.
- **Context Isolation:** Forbid inline execution of complex architectural analysis; use the `Agent` tool for sub-tasks.
- **Project Specifics:**
  - Reference project's architecture docs.
  - Include project-specific deployment concerns.
- **Token Reporting:** See `_fragments/finalize.md` — wire via `file_ref:`.
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.
