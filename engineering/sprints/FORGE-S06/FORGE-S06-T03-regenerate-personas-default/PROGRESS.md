# PROGRESS — FORGE-S06-T03: Add personas to forge:regenerate defaults

🌱 *Forge Engineer*

**Task:** FORGE-S06-T03
**Sprint:** FORGE-S06

---

## Summary

Modified `forge/commands/regenerate.md` in three places: (1) added `personas engineer` and `personas:engineer` colon-form examples to the Arguments section; (2) expanded the Personas category section from a simple full-rebuild to a full-rebuild-or-single-file section with per-persona sub-target handling mirroring the `workflows` pattern; (3) updated the Default section from `workflows + commands + templates` to `workflows + commands + templates + personas`. Bumped version to 0.7.9 and added migration entry with `personas` in the regenerate list.

## Syntax Check Results

N/A — only Markdown files modified (`forge/commands/regenerate.md`). No JS/CJS files touched.

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
109 error(s) found.
```

Pre-existing errors in the store (unrelated to this task — missing endTimestamp/model on older events, and a known sprint-level event referencing a sprint ID instead of a task ID). No schema files were changed by this task, so these errors are out of scope.

## Files Changed

| File | Change |
|---|---|
| `forge/commands/regenerate.md` | Add personas to default run; add per-persona sub-target support; update argument examples |
| `forge/.claude-plugin/plugin.json` | Bump version 0.7.8 → 0.7.9 |
| `forge/migrations.json` | Add 0.7.8 → 0.7.9 migration entry with personas regenerate target |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| `/forge:regenerate` with no args includes `personas` in default run | 〇 Pass | Default section updated to `workflows + commands + templates + personas` |
| Focused per-persona: `/forge:regenerate personas engineer` regenerates only engineer.md | 〇 Pass | Sub-target handling added to Personas category section |
| Default run sequence: `workflows + commands + templates + personas` | 〇 Pass | Default section confirmed |
| Colon form: `/forge:regenerate personas:engineer` works the same | 〇 Pass | Colon-form parsing note added; argument examples include `personas:engineer` |
| Lays groundwork for future `forge:calibrate` without implementing it | 〇 Pass | Personas now in default regeneration pipeline |
| `node forge/tools/validate-store.cjs --dry-run` exits 0 | △ Pre-existing errors | 109 pre-existing errors unrelated to this task; no schema changes made |

## Plugin Checklist

- [x] Version bumped in `forge/.claude-plugin/plugin.json`: 0.7.8 → 0.7.9
- [x] Migration entry added to `forge/migrations.json`: 0.7.8 → 0.7.9 with `personas` in regenerate list
- [ ] Security scan — required, to be run separately per CLAUDE.md

## Notes

The `personas` category section already existed and was complete. The only structural change beyond the three targeted edits was renaming the heading from `personas — full rebuild` to `personas — full rebuild or single file` to match the `workflows` heading pattern.
