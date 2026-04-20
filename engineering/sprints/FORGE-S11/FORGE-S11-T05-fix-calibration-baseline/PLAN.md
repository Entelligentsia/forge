# PLAN — FORGE-S11-T05: Fix calibrationBaseline missing from fast-mode init and update (#55)

🌱 *Forge Engineer*

**Task:** FORGE-S11-T05
**Sprint:** FORGE-S11
**Estimate:** M

---

## Objective

`/forge:init --fast` skips Phases 4–6 (Skills and Templates generation) and therefore
never reaches Step 5/6-b where `calibrationBaseline` is written to `config.json`. Fast-mode
projects end up without the field, causing `/forge:calibrate` to abort with "no
calibrationBaseline". Additionally, `/forge:update` does not refresh the baseline after
successful artifact materialization, so the field may be stale or absent on update runs
in fast-mode projects. This plan adds a `calibrationBaseline` write sub-step at the end of
Phase 7-fast in `sdlc-init.md`, and adds a refresh step inside `update.md` after Step 4
regeneration completes successfully.

## Approach

Two surgical insertions — no phase renumbering, no structural changes:

1. **`forge/init/sdlc-init.md`** — after the Phase 7-fast stub write + count assertion + 
   `init-progress.json` write, insert a sub-step "7-fast-b: Write Calibration Baseline". 
   Copy the algorithm verbatim from Step 5/6-b (which exists in full-mode Phases 5+6), 
   adapting only the surrounding prose. This keeps the two implementations consistent.

2. **`forge/commands/update.md`** — after the "Post-migration structure check" block inside 
   Step 4 (Apply migrations), and before Step 5 (Pipeline audit), insert a sub-step
   "Refresh calibrationBaseline". The refresh runs only when the migration path applied at
   least one regeneration target (i.e. `regenerate` list was non-empty). If no targets were
   regenerated (baseline already current), skip silently.

Both insertions use the same 5-line Node.js one-liner algorithm already present in Step
5/6-b of `sdlc-init.md` — no new scripts, no new dependencies.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/init/sdlc-init.md` | Add sub-step 7-fast-b immediately after the `init-progress.json` write at the end of Phase 7-fast (before the `Continue to Phase 9` line) | Fast-mode init never reaches the full-mode Step 5/6-b; this sub-step fills the gap |
| `forge/commands/update.md` | Add calibrationBaseline refresh after the post-migration structure check in Step 4, before Step 5 | After regeneration the KB may have changed; baseline must be refreshed to match |

## Plugin Impact Assessment

- **Version bump required?** Yes — bug fix to a command and an init workflow, both material.
  New version: **0.20.0** (deferred to T08 as per sprint plan).
- **Migration entry required?** Yes — `regenerate: ["workflows", "commands"]` because both
  `sdlc-init.md` (indirectly affects init command) and `update.md` (a command file) change.
  Entry deferred to T08.
- **Security scan required?** Yes — any change to `forge/` requires a scan. Deferred to T08.
- **Schema change?** No — `calibrationBaseline` is already defined in `sdlc-config.schema.json`
  (added in FORGE-S09-T02). No schema changes needed.

## Verification Plan

1. Syntax check: `node --check` — not applicable (no `.js`/`.cjs` files modified).
2. Store validation: `node forge/tools/validate-store.cjs --dry-run` — run to confirm no
   regressions (no schema changes in this task).
3. Manual trace:
   - Read `forge/init/sdlc-init.md` Phase 7-fast section: confirm sub-step 7-fast-b is
     present after the `init-progress.json` write and before `Continue to Phase 9`.
   - Read `forge/commands/update.md` Step 4: confirm calibrationBaseline refresh block is
     present after the post-migration structure check and before `## Step 5`.
   - Confirm the algorithm in 7-fast-b matches Step 5/6-b exactly (same Node.js commands,
     same field names: `lastCalibrated`, `version`, `masterIndexHash`, `sprintsCovered`).

## Acceptance Criteria

- [ ] After `/forge:init --fast`, `config.json` contains a valid `calibrationBaseline` object
  with fields: `lastCalibrated`, `version`, `masterIndexHash`, `sprintsCovered`.
- [ ] After a successful `/forge:update` run that applies at least one regeneration target,
  `calibrationBaseline` is refreshed in `config.json`.
- [ ] `/forge:calibrate` runs to completion without "no calibrationBaseline" abort for
  fast-mode projects (verified by reading the calibrate command's abort condition and
  confirming the field is now present).
- [ ] Phase 7-fast numbering is NOT changed — the baseline write is a sub-step of Phase
  7-fast, not a new numbered phase.
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0 (no regressions).
- [ ] Sub-step algorithm matches Step 5/6-b verbatim (same Node.js one-liners, same field
  names) — the two code paths stay in sync.

## Operational Impact

- **Distribution:** Users must run `/forge:update` to receive the updated `sdlc-init.md`
  and `update.md`. The `regenerate` targets for the migration entry will be
  `["workflows", "commands"]`.
- **Backwards compatibility:** Fully backwards compatible. The `calibrationBaseline` field
  was already part of the schema (FORGE-S09-T02). Projects initialized in full mode are
  unaffected. Fast-mode projects that already ran `/forge:calibrate` will have the field
  set; after this fix, new fast-mode inits will set it automatically.
