# PLAN — FORGE-S06-T05: Suppress false breaking-change confirmation in forge:update

🌱 *Forge Engineer*

**Task:** FORGE-S06-T05
**Sprint:** FORGE-S06
**Estimate:** S

---

## Objective

Eliminate the false breaking-change confirmation prompt in `/forge:update` when the user's `.forge/config.json` contains only standard Forge model aliases (`sonnet`, `opus`, `haiku`). The 0.6.13→0.7.0 migration marks `breaking: true` with a manual step about model overrides, but most users have only standard aliases — nothing to manually fix. The confirmation halts the update flow unnecessarily.

## Approach

Add a **model-alias auto-suppression** pre-check to `forge/commands/update.md` that runs before any breaking-change confirmation prompt. The pre-check reads `.forge/config.json`, scans all pipeline phases' `model` fields, and classifies each as either a standard alias or non-standard. If all model values are standard aliases or absent, the manual step about model overrides is removed from the `manual` list (or the entire breaking-change block is skipped if no other manual items remain).

The pre-check is inserted at three points in the command — Steps 2A, 2B, and Step 4 — wherever `breaking: true` and `manual` items trigger a user confirmation. The logic is identical at all three points; it is defined once as a reusable sub-procedure.

**Standard Forge model aliases** (the set that the orchestrator resolves natively): `sonnet`, `opus`, `haiku`.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/commands/update.md` | Add model-alias auto-suppression pre-check before breaking-change confirmations in Steps 2A, 2B, and Step 4 | This is the only file that needs modification — the false confirmation originates here |

## Plugin Impact Assessment

- **Version bump required?** Yes — changes `/forge:update` command behavior (auto-skips a confirmation prompt that previously always halted)
- **Migration entry required?** Yes — `regenerate: []`, `breaking: false`, `manual: []`. Users who already ran the 0.7.0 migration are unaffected; this is a forward improvement only.
- **Security scan required?** Yes — any change to `forge/` requires a scan
- **Schema change?** No — no store schemas affected

## Testing Strategy

- Syntax check: N/A (no JS/CJS files modified)
- Store validation: `node forge/tools/validate-store.cjs --dry-run` (should continue to pass — no schema changes)
- Manual smoke test: Run `/forge:update --skip-check` on this dogfooding project (which has no `pipelines` section with non-standard model values). The 0.6.13→0.7.0 migration's manual step about model overrides should be auto-suppressed.

## Acceptance Criteria

- [ ] Upgrading a project whose `.forge/config.json` contains only `sonnet`/`opus`/`haiku` model values in pipeline phases completes without a manual confirmation prompt for the model-migration step
- [ ] The step only halts when a non-standard model value (raw model ID like `claude-3-opus` or unknown alias) is detected in the config
- [ ] The pre-check applies in Steps 2A, 2B, and Step 4 — wherever breaking-change confirmations appear
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0

## Operational Impact

- **Distribution:** Users who run `/forge:update` after upgrading will get the new logic automatically — no `/forge:regenerate` needed
- **Backwards compatibility:** Fully backwards-compatible — existing behavior for non-standard model values is unchanged; only the false-positive case is suppressed