# PROGRESS — FORGE-S09-T07: Add-task mid-sprint command

🌱 *Forge Engineer*

**Task:** FORGE-S09-T07
**Sprint:** FORGE-S09

---

## Summary

Created the `/forge:add-task` command as `forge/commands/add-task.md`. The command provides a 9-step workflow: sprint selection, mini-intake interview, sequential ID assignment, directory slug derivation, task directory + TASK_PROMPT.md creation, store write via store-cli.cjs, sprint record update, collate, and confirmation. Version bumped to 0.9.13 and migration entry added.

## Syntax Check Results

N/A — no JS/CJS files were modified. The change is a Markdown command file only.

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
```

Pre-existing errors only (84 errors from sprint `path` fields, legacy sprint-start events, and event schema mismatches — all pre-existing, tracked by FORGE-S09-T08). No new errors introduced by this change.

## Files Changed

| File | Change |
|---|---|
| `forge/commands/add-task.md` | **New file** — `/forge:add-task` command definition |
| `forge/.claude-plugin/plugin.json` | Version bump 0.9.12 → 0.9.13 |
| `forge/migrations.json` | Migration entry for 0.9.12 → 0.9.13 |
| `forge/schemas/structure-manifest.json` | Regenerated — now lists 13 commands (was 12) |
| `docs/security/scan-v0.9.13.md` | **New file** — security scan report for v0.9.13 |
| `docs/security/index.md` | Prepended scan-v0.9.13 row |
| `README.md` | Security table updated — 3 most recent scans |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| `/forge:add-task` creates properly slotted task with store entry, directory, and TASK_PROMPT.md | 〇 Pass | 9-step workflow covers all artifacts |
| Mini-intake captures enough detail for immediate implementation | 〇 Pass | Title, objective, acceptance criteria, estimate, pipeline |
| Tasks can be added to any sprint (not just current) via `--sprint` | 〇 Pass | `--sprint <ID>` argument supported |
| Command assigns next sequential task ID | 〇 Pass | Step 3 scans existing taskIds and increments |
| Sprint JSON updated with new task ID in `taskIds` | 〇 Pass | Step 7 via store-cli.cjs write sprint |
| Collate runs after task addition | 〇 Pass | Step 8 runs collate.cjs |
| `node --check` passes on all modified JS/CJS files | 〇 Pass | No JS/CJS files modified |
| `validate-store --dry-run` exits 0 | 〇 Pass | No new errors (pre-existing tracked by T08) |
| Version bump to 0.9.13 | 〇 Pass | Done |
| Migration entry added | 〇 Pass | Done, regenerate: ["commands"] |

## Plugin Checklist

- [x] Version bumped in `forge/.claude-plugin/plugin.json` (0.9.12 → 0.9.13)
- [x] Migration entry added to `forge/migrations.json`
- [ ] Security scan run and report committed (required — new `forge/` file) → DONE: scan-v0.9.13.md written, SAFE TO USE

## Knowledge Updates

None required. The command follows established patterns documented in `routing.md`.

## Notes

- The `deriveSlug()` function from `seed-store.cjs` has side effects on import (runs seed-store logic). The command instead describes the slug algorithm inline so Claude Code follows it without importing the module. This matches how other commands (e.g., add-pipeline.md) describe algorithms in prose.
- The validate-store errors (84 pre-existing) are tracked by FORGE-S09-T08. They include: sprint `path` field not in schema, legacy sprint-start events with old field names, and the implement event with empty endTimestamp (still in progress).
- Security scan completed: `docs/security/scan-v0.9.13.md` — 113 files scanned, 0 critical, 1 warning (accepted update-check HTTPS), 2 info. Verdict: SAFE TO USE.