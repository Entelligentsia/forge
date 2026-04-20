# PROGRESS — FORGE-S11-T05: Fix calibrationBaseline missing from fast-mode init and update (#55)

🌱 *Forge Engineer*

**Task:** FORGE-S11-T05
**Sprint:** FORGE-S11

---

## Summary

Added sub-step 7-fast-b to `forge/init/sdlc-init.md` (Phase 7-fast section) to write
`calibrationBaseline` into `config.json` after stub workflows are written. This fills the
gap left by fast mode skipping Phases 4–6 where the full-mode calibration write occurs.
Added a "Refresh calibrationBaseline" sub-section to `forge/commands/update.md` (Step 4)
to refresh the baseline after successful artifact regeneration. Both insertions use the
same 5-step Node.js algorithm from Step 5/6-b — no new scripts or dependencies introduced.

## Syntax Check Results

No JS/CJS files were modified — only Markdown instruction files. `node --check` is not
applicable to `.md` files.

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
Store validation passed (11 sprint(s), 71 task(s), 17 bug(s)).
```

Exit 0. No schema changes in this task.

## Files Changed

| File | Change |
|---|---|
| `forge/init/sdlc-init.md` | Added sub-step 7-fast-b after Phase 7-fast stub write + `init-progress.json` write, before `Continue to Phase 9` |
| `forge/commands/update.md` | Added "Refresh calibrationBaseline" sub-section after the post-migration structure check block, before Iron Laws for Step 4 |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| After `/forge:init --fast`, `config.json` contains valid `calibrationBaseline` | 〇 Pass | Sub-step 7-fast-b writes all 4 fields: `lastCalibrated`, `version`, `masterIndexHash`, `sprintsCovered` |
| After `/forge:update` with regeneration targets, `calibrationBaseline` refreshed | 〇 Pass | "Refresh calibrationBaseline" sub-section added to Step 4 with conditional on non-empty targets |
| `/forge:calibrate` runs without "no calibrationBaseline" abort for fast-mode projects | 〇 Pass | The abort condition (`calibrationBaseline` absent) is now eliminated by sub-step 7-fast-b |
| Phase 7-fast numbering NOT changed | 〇 Pass | Inserted as sub-step 7-fast-b, not a new numbered phase |
| `validate-store --dry-run` exits 0 | 〇 Pass | Output above confirms clean pass |
| Sub-step algorithm matches Step 5/6-b verbatim | 〇 Pass | Algorithm copied verbatim from Step 5/6-b; same 5 steps, same Node.js one-liners, same field names |

## Plugin Checklist

- [ ] Version bumped in `forge/.claude-plugin/plugin.json` — deferred to T08 (release engineering)
- [ ] Migration entry added to `forge/migrations.json` — deferred to T08
- [ ] Security scan run and report committed — deferred to T08

## Knowledge Updates

No new architectural patterns discovered. The fix is purely additive — filling an omission
in the fast-mode init path.

## Notes

The `update.md` refresh is conditional: it only runs when the aggregated `regenerate` list
was non-empty. This ensures the baseline is not unnecessarily rewritten on update runs
where no artifacts were regenerated (e.g. when the plugin is already current and no
migrations apply). The emit line (`〇 calibrationBaseline refreshed — version <ver>,
hash <first-8-chars>...`) provides visible confirmation to the user.

The `KB_PATH` variable referenced in the 7-fast-b sub-step is already resolved earlier in
the init run (pre-Phase-1) and is available in the Phase 7-fast context. The `update.md`
refresh resolves it fresh via `manage-config.cjs` to handle cases where the user may have
a custom `paths.engineering` value.
