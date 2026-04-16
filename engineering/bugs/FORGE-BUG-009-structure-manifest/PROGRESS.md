# PROGRESS — FORGE-BUG-009

**Bug:** Structure manifest: deterministic check and course-correct for generated `.forge/` and `.claude/commands/`
**Status:** implemented
**Version bump:** 0.9.7 → 0.9.8
**Date:** 2026-04-15

---

## Files Changed

| File | Nature |
|------|--------|
| `forge/tools/generation-manifest.cjs` | Extended: added `clear-namespace` subcommand with prefix-shape guard (exit 2 on invalid prefix) |
| `forge/commands/regenerate.md` | Edited: added `clear-namespace` before each full-rebuild loop (personas, workflows, commands, templates); added CUSTOM_COMMAND_TEMPLATE.md re-record step after templates loop; added `clear-namespace .forge/skills/` in skills section; added sub-target `remove` before record for personas/workflows single-file mode |
| `.forge/generation-manifest.json` | Dogfooding fix: removed 14 stale role-based entries (7 personas + 7 skills) via `generation-manifest.cjs remove` |
| `forge/tools/build-manifest.cjs` | NEW: derives structure-manifest from forge/meta/ mapping tables with reverse-drift detection and source verification |
| `forge/schemas/structure-manifest.json` | NEW (generated): 57 files across 6 namespaces; version 0.9.8 |
| `forge/tools/check-structure.cjs` | NEW: checks filesystem against structure-manifest; config-aware path resolution via `.forge/config.json paths.*` |
| `forge/commands/health.md` | Edited: added Step 7 structure check; renumbered 7-11 → 8-12; added Generated file structure row in Checks table |
| `forge/commands/update.md` | Edited: added Post-migration structure check block at end of Step 4 (before Iron Laws); warning mentions `/forge:regenerate skills` |
| `CLAUDE.md` | Docs: added item 4 (build-manifest.cjs run requirement); added "Rebuild structure manifest" row to Where things live table |
| `forge/.claude-plugin/plugin.json` | Version bump: 0.9.7 → 0.9.8 |
| `forge/migrations.json` | Added migration entry `"0.9.7" → 0.9.8` |

---

## Syntax Checks

```
node --check forge/tools/generation-manifest.cjs
→ SYNTAX OK

node --check forge/tools/build-manifest.cjs
→ SYNTAX OK

node --check forge/tools/check-structure.cjs
→ SYNTAX OK
```

---

## Acceptance Criteria Verification

### A1: clear-namespace subcommand

```
node forge/tools/generation-manifest.cjs clear-namespace .forge/personas/
→ ── No entries matching .forge/personas/   (was already cleared; 〇 Cleared N works when entries exist)

node forge/tools/generation-manifest.cjs clear-namespace personas
→ Usage error: prefix must start with .forge/ or .claude/ and end with /
→ exit code: 2

node forge/tools/generation-manifest.cjs clear-namespace .forge/personas
→ Usage error: prefix must start with .forge/ or .claude/ and end with /
→ exit code: 2
```

### A3: Stale entries removed

```
node forge/tools/generation-manifest.cjs list --modified
→ 〇 All tracked files are pristine.

node forge/tools/generation-manifest.cjs status
→ ── 46 file(s) tracked
→ 〇 46 pristine
```
(0 missing entries — all 14 stale role-based entries removed)

### B2: structure-manifest.json

```
node -e "const m = JSON.parse(...); console.log('Total:', total); ..."
→ Total: 57 (expected 57)
→ CUSTOM_COMMAND_TEMPLATE.md present: true
→ Version: 0.9.8 (expected 0.9.8)
```

### C1: check-structure exits 0

```
node forge/tools/check-structure.cjs --path .
→ 〇 .forge/personas/ — 6/6 present
→ 〇 .forge/skills/ — 6/6 present
→ 〇 .forge/workflows/ — 18/18 present
→ 〇 .forge/templates/ — 9/9 present
→ 〇 .claude/commands/ — 13/13 present
→ 〇 .forge/schemas/ — 5/5 present
→ 〇 Structure check: all 57 expected files present.
→ exit code: 0
```

### D: health.md

- Added Step 7 structure check with `check-structure.cjs --path "$PROJECT_ROOT"` invocation
- Renumbered steps 7-11 → 8-12
- Added "Generated file structure" row to Checks table
- Custom `paths.*` overrides documented

### E: update.md

- Post-migration structure check block added at end of Step 4
- `node "$FORGE_ROOT/tools/check-structure.cjs" --path .` present (line 472)
- Warning text mentions `/forge:regenerate skills` (line 484)
- Appears before Step 5 transition (Step 5 starts at line 503)

### F: CLAUDE.md

- Item 4 added documenting build-manifest.cjs run requirement
- CUSTOM_COMMAND_TEMPLATE.md `[null, ...]` noted
- "Rebuild structure manifest" row added to Where things live table

### G1+G2: Version and migration

```
forge/.claude-plugin/plugin.json → version: 0.9.8
forge/migrations.json "0.9.7" → version: "0.9.8"
```

---

## Plugin Checklist

- [x] Version bump: 0.9.7 → 0.9.8
- [x] Migration entry added to forge/migrations.json
- [ ] Security scan: DEFERRED (to be run separately as instructed)

---

## Deviations from Plan

1. **meta-supervisor.md not in PERSONA_MAP exclusions list:** The plan listed exclusions as `meta-orchestrator.md` and `meta-product-manager.md`, but the dogfooding instance has `supervisor.md` as a generated persona. The PERSONA_MAP includes `meta-supervisor.md → supervisor.md` (following the 6-entry map from the plan spec). `meta-orchestrator.md` and `meta-product-manager.md` generate reverse-drift warnings as expected.

2. **FORGE_ROOT for installed tool:** The prompt specified installed plugin path `0.9.7` but only `0.9.6` exists in cache. Used the local source `forge/tools/generation-manifest.cjs` for A3 removal instead — functionally identical since it operates on the same `.forge/generation-manifest.json`.
