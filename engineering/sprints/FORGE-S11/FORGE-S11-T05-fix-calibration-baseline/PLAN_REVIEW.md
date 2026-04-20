# PLAN REVIEW — FORGE-S11-T05: Fix calibrationBaseline missing from fast-mode init and update (#55)

🌿 *Forge Supervisor*

**Task:** FORGE-S11-T05

---

**Verdict:** Approved

---

## Review Summary

The plan correctly identifies both gap sites (Phase 7-fast in `sdlc-init.md` and Step 4 in
`update.md`), proposes surgical insertions that reuse the existing Step 5/6-b algorithm
verbatim, and avoids phase renumbering as required by AC-4. The approach is minimal,
consistent with existing patterns, and does not introduce new abstractions or dependencies.
No blocking issues found.

## Feasibility

Approach is realistic and correctly scoped. The two files identified (`forge/init/sdlc-init.md`
and `forge/commands/update.md`) are precisely the right files — verified against the task
prompt and the calibrate command's abort condition (`forge/commands/calibrate.md` Step 2).
The algorithm being reused (Step 5/6-b) already exists in `sdlc-init.md` and is a proven
5-line Node.js inline block; no new scripts or npm dependencies are introduced. Scope is
appropriate for an M-estimate task.

The insertion point in `update.md` is correct: after the post-migration structure check
and before Step 5 (pipeline audit) ensures the baseline is refreshed after artifact
regeneration completes but before any subsequent audit relies on the KB state.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes — bug fix to a command and an init workflow,
  both material. The plan correctly defers the bump to T08 (release engineering task).
- **Migration entry targets correct?** Yes — `["workflows", "commands"]` covers both
  `sdlc-init.md` (part of the init workflow chain) and `update.md` (a command file).
  Deferred to T08 as expected.
- **Security scan requirement acknowledged?** Yes — acknowledged and deferred to T08
  per sprint structure.

## Security

No security risks. The changes are:
1. Additions to Markdown instruction files (no new tool scripts).
2. The Node.js inline blocks read only local files (`config.json`, `MASTER_INDEX.md`,
   `.forge/store/sprints/`) using `require('fs')` and `require('crypto')` — both
   Node.js built-ins. No user input is read without validation. No network calls.
3. No prompt injection vectors introduced — the inserted prose is static instruction text
   describing a deterministic algorithm.

## Architecture Alignment

- Uses Node.js built-ins only (`fs`, `crypto`, `path`) — no npm dependencies.
- No new `.cjs` files; no new hooks; no schema changes.
- The calibration baseline algorithm in the plan matches the full-mode algorithm in
  Step 5/6-b exactly (same field names: `lastCalibrated`, `version`, `masterIndexHash`,
  `sprintsCovered`).
- No `additionalProperties` concerns — no schema changes in this task.
- No paths hardcoded: the algorithm reads `KB_PATH` and `$FORGE_ROOT` from the init
  context (which are already resolved variables in the Phase 7-fast context).
- The `update.md` insertion condition (only when regeneration targets were non-empty)
  is consistent with how the update command already tracks migration application.

## Testing Strategy

The testing strategy is adequate given the stack constraints (Markdown instruction files
with inline Node.js, no test runner):
- `validate-store --dry-run` covers regression checking.
- Manual trace of both insertion points against the source files covers correctness.
- The plan notes that no JS/CJS files are modified so `node --check` is not applicable —
  this is correct.

One advisory note on testing: the acceptance criteria reference `/forge:calibrate`
running to completion, which can only be verified at runtime in a real fast-mode project.
The plan acknowledges this by cross-referencing the calibrate command's abort condition —
this is an acceptable substitute for a unit test given the stack.

---

## If Approved

### Advisory Notes

1. **7-fast-b insertion point precision:** Insert the calibration baseline sub-step
   *before* the `Continue to Phase 9` line (and after the `init-progress.json` write),
   not after it. The plan states this correctly — just confirm during implementation.

2. **Update.md refresh condition:** The plan says "only when regeneration targets were
   non-empty". Verify during implementation that the condition check is correct — if Step 4
   exits early (no migrations to apply), the refresh block must be skipped. If the condition
   is inside the post-migration structure check block rather than alongside it, the control
   flow will be correct.

3. **KB_PATH variable in 7-fast-b:** In the Phase 7-fast context, `KB_PATH` is resolved
   from `manage-config.cjs` earlier in the init run. Confirm the inserted sub-step references
   `{KB_PATH}` consistently (not a hardcoded `engineering/`).

4. **`$FORGE_ROOT` variable in `update.md`:** In the update command, `FORGE_ROOT` is
   re-derived in Step 3 after install. Confirm the calibrationBaseline refresh block uses
   the current (post-install) `$FORGE_ROOT` value, not the initial one.
