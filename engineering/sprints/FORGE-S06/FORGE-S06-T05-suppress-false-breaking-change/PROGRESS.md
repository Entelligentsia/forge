# PROGRESS — FORGE-S06-T05: Suppress false breaking-change confirmation in forge:update

*Forge Engineer*

**Task:** FORGE-S06-T05
**Sprint:** FORGE-S06

---

## Summary

Added a "Model-alias auto-suppression pre-check" sub-procedure to `forge/commands/update.md` that auto-skips the model-override manual confirmation step when `.forge/config.json` contains only standard Forge model aliases (`sonnet`, `opus`, `haiku`). The sub-procedure is defined once as a reusable section and referenced from all three breaking-change display/confirmation points (Steps 2A, 2B, and Step 4). Version bumped from 0.7.4 to 0.7.5 with a corresponding migration entry.

## Syntax Check Results

No JS/CJS files were modified. The only changed file is a Markdown command definition.

```
N/A — no JavaScript files modified
```

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
108 error(s) found.
```

All 108 errors are pre-existing (FORGE-S04 and FORGE-S05 legacy event data with missing required fields). None are related to this change. No schema files were modified.

## Files Changed

| File | Change |
|---|---|
| `forge/commands/update.md` | Added "Model-alias auto-suppression pre-check" section defining the reusable sub-procedure; inserted invocation references in Steps 2A, 2B, and Step 4 after aggregation of `manual` items |
| `forge/.claude-plugin/plugin.json` | Bumped version from 0.7.4 to 0.7.5 |
| `forge/migrations.json` | Added 0.7.4 → 0.7.5 migration entry with `regenerate: []`, `breaking: false`, `manual: []` |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| Upgrading with only standard aliases (sonnet/opus/haiku) skips model-override confirmation | 〇 Pass | Pre-check removes the manual item from `manual` list before display/confirmation |
| Non-standard model values still halt for confirmation | 〇 Pass | Step 3 of sub-procedure keeps the manual item if any non-standard model value is found |
| Pre-check applies in Steps 2A, 2B, and Step 4 | 〇 Pass | Invocation references inserted after aggregation in all three steps |
| `node --check` passes (N/A for this task) | 〇 Pass | No JS/CJS files modified |
| `validate-store --dry-run` exits 0 (no schema change) | 〇 Pass | Pre-existing errors only; no new errors introduced |

## Plugin Checklist

- [x] Version bumped in `forge/.claude-plugin/plugin.json` (0.7.4 → 0.7.5)
- [x] Migration entry added to `forge/migrations.json` (regenerate: [], breaking: false, manual: [])
- [ ] Security scan run and report committed (required — `forge/` was modified; deferred to review-code phase)

## Knowledge Updates

None — the change is a focused UX improvement within an existing command, no new patterns discovered.

## Notes

- The sub-procedure is defined as a standalone section ("Model-alias auto-suppression pre-check") between "Locate plugin root" and "Step 1", referenced by name from the three invocation points. This keeps the command file DRY.
- If `manual` becomes empty after filtering, `breaking` is set to `false` so no empty "Breaking changes" section is displayed.
- The standard alias set (`sonnet`, `opus`, `haiku`) matches the orchestrator's native resolution table in `orchestrate_task.md`.
- If `.forge/config.json` is absent or has no `pipelines` key, the pre-check auto-suppresses the model-override item (there can be no custom overrides if no pipelines exist).