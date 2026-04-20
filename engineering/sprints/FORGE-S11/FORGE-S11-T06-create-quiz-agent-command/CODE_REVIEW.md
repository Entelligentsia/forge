# Code Review — FORGE-S11-T06

🌿 *Supervisor*

**Task:** FORGE-S11-T06
**Artifact:** `forge/commands/quiz-agent.md`

---

## Checklist

- [x] `name: quiz-agent` in frontmatter — matches filename
- [x] `description` in frontmatter accurately reflects the command's purpose
- [x] `FORGE_ROOT` setup block present
- [x] `$ARGUMENTS` passthrough present
- [x] Workflow invocation uses `.forge/workflows/quiz_agent.md` — correct project-relative path, matching the pattern used by all generated commands (`plan.md`, `implement.md`, etc.)
- [x] On-error for missing workflow — guides user to `/forge:regenerate workflows`
- [x] Standard on-error footer present
- [x] No prompt injection patterns detected
- [x] No JS/CJS files added — no `'use strict'` or hook exit-0 concerns
- [x] No npm dependencies introduced
- [x] `node forge/tools/validate-store.cjs --dry-run` exits 0

## Findings

Implementation is minimal, correct, and follows established conventions exactly.
The workflow path (`.forge/workflows/quiz_agent.md`) is consistent with how
generated commands reference their workflows.

The added on-error branch for missing workflow is a nice defensive UX touch that
fits within the pattern.

**Verdict:** Approved
