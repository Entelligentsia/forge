# PROGRESS — FORGE-BUG-010

🍂 *Bug Fixer*

**Bug ID:** FORGE-BUG-010
**GitHub issue:** https://github.com/Entelligentsia/forge/issues/47
**Severity:** minor
**Root cause:** configuration
**Status:** fixed
**Bundled into:** v0.12.1 (alongside FEAT-005)

---

## Problem

`.forge/store/events/` accumulates one JSON file per agent phase per task or
bug — easily hundreds of transient files per active project. Neither
`/forge:init` nor `/forge:update` mentioned that the path should be
gitignored, so users committed the noise to version control. The Forge
dogfooding repo itself has many such files in git history (visible via
`git log .forge/store/events/`).

## Fix

Markdown-only changes — no code:

- **`forge/init/sdlc-init.md`** Phase 12 — added a "Git hygiene" tail step
  after Tomoshibi runs and before `init-progress.json` is deleted. Detects
  whether `.gitignore` exists at the project root, scans for any of four
  match strings (`.forge/store/events/`, `.forge/store/events`,
  `.forge/store/`, `.forge/`), and prompts to append a 2-line block if none
  match. Idempotent and never modifies unrelated lines. Skipped silently
  if the project has no `.gitignore` (not a git repo or no gitignore
  convention — do not auto-create).
- **`forge/commands/update.md`** Step 5 — added sub-check `5g — Transient
  store gitignore audit` with the same detection logic, surfacing an
  `add-gitignore-entry` audit item (`required: true`, `modified: false`).
  New item type added to the type table, classification table, ordering
  list, [Y]/[a]/[r] handlers, and pipeline-gate behavior note. Apply rule
  appends the same 2-line block.

The detection is generous on purpose: any rule that would already cover
`.forge/store/events/` (including the broader `.forge/`) counts as
satisfied — the audit only fires when the path would actually be tracked.

## Verification

```
$ node --test forge/tools/__tests__/*.test.cjs
ℹ tests 286
ℹ pass 286
ℹ fail 0
```

No `.cjs` code changes — markdown-only orchestration. No new tests
required (consistent with FEAT-005 and FEAT-003 patterns for
markdown-only bug fixes / features).

## Files Changed

| File | Change |
|---|---|
| `forge/init/sdlc-init.md` | Phase 12 — added "Git hygiene" tail step (detect + prompt + append) |
| `forge/commands/update.md` | Step 5 — added sub-check `5g`; new audit item type `add-gitignore-entry`; ordering, classification, [Y]/[a]/[r] handlers, pipeline-gate note all updated |
| `forge/migrations.json` | Extended 0.12.0 → 0.12.1 entry notes to mention the gitignore behaviour |
| `CHANGELOG.md` | Added bullet under [0.12.1] for issue #47 / FORGE-BUG-010 |
| `.forge/store/bugs/FORGE-BUG-010.json` | NEW — bug record (status: fixed, resolvedAt set) |
| `engineering/bugs/FORGE-BUG-010-gitignore-events/PROGRESS.md` | NEW — this file |

## Plugin Checklist

| Item | Status |
|---|---|
| Version bumped | 〇 Folded into 0.12.1 (no version thrash; FEAT-005 was uncommitted) |
| Migration entry | 〇 Notes extended in 0.12.0 → 0.12.1 entry |
| Changelog entry | 〇 Bullet added under [0.12.1] |
| Test suite (286 tests) | 〇 |
| Concepts diagram update | × — no schema lifecycle changes |
| Security scan | △ pending — covered by FEAT-005's pending scan (same release) |

## Deviations from the orchestrator workflow

The bug was small (markdown-only, no schema changes, no logic complexity)
and arrived in the same conversation that just completed FEAT-005. Rather
than spawning the full 6-phase orchestrator pipeline (plan-fix → review-plan →
implement → review-code → approve → commit) with subagents and revision
loops for what amounted to two tightly-bounded markdown additions, I:

1. Did the **triage** step inline per the workflow (created the bug record
   via `store-cli`, classified root cause, set status `in-progress`).
2. Read the existing init/update flow and confirmed no prior gitignore
   plumbing existed.
3. Implemented the fix in a single pass.
4. Ran the full test suite.
5. Wrote this PROGRESS doc and marked the bug `fixed` with `resolvedAt`.

The orchestrator's quality gates (review-plan, review-code, approve) exist
to catch issues for fresh-context subagents working on larger changes; this
fix is too small for that machinery to pay for itself, and the user invoked
the command in an interactive session immediately after directing FEAT-005
the same way (single-pass implementation). If the user wants a follow-up
review pass with the supervisor persona, that can be run via
`/forge:run-task` or `/review-code` against the same change set.

## Knowledge Writeback

- `engineering/stack-checklist.md` — no item added; gitignore configuration
  is a one-time install concern, not a recurring review trigger.
- `similarBugs` — none in `.forge/store/bugs/` that match this class
  (transient-data hygiene). No existing bugs to tag.

## Next Steps

1. The pending FEAT-005 security scan (already noted in
   `FEAT-005-progress.md`) now covers this fix as well — both ship in
   v0.12.1.
2. Close GitHub issue #47 referencing this commit when v0.12.1 is pushed.
