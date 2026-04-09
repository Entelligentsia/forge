# Sprint Plan — FORGE-S03: Lean Migration Architecture

**Date:** 2026-04-09
**Version target:** 0.6.1

---

## Task Breakdown

| ID | Title | Estimate | Depends On |
|----|-------|----------|------------|
| FORGE-S03-T01 | Eliminate tools regenerate target and embed store schemas | M | — |
| FORGE-S03-T02 | Introduce granular migration target format and correct migrations.json | M | — |
| FORGE-S03-T03 | Version bump to 0.6.1 with security scan and release commit | S | T01, T02 |

T01 and T02 are independent and can run in parallel.

---

## Dependency Graph

```
T01 ──┐
      ├──▶ T03
T02 ──┘
```

---

## Files Touched

### T01
- `forge/tools/validate-store.cjs` — embed schemas, remove .forge/schemas/ reads
- `forge/commands/init.md` — remove Phase 8
- `forge/commands/regenerate.md` — remove tools category
- `forge/commands/update.md` — remove tools references
- `forge/meta/store-schema/*.md` (5 files) — reframe as design docs

### T02
- `forge/commands/update.md` — colon-format parser, dominance rule, dispatch
- `forge/commands/regenerate.md` — sub-target handler in each category
- `forge/migrations.json` — strip tools, correct 0.6.0 entry, add 0.6.1 entry

### T03
- `forge/.claude-plugin/plugin.json` — version bump to 0.6.1
- `docs/security/scan-v0.6.1.md` — new security scan report
- `README.md` — security scan history table row

---

## Acceptance Criteria (Sprint Level)

1. `node forge/tools/validate-store.cjs` passes without `.forge/schemas/` present
2. `/forge:update` from 0.6.0 applies no regeneration (no targets in 0.6.1 migration)
3. `/forge:update` from 0.5.9 regenerates only `sprint_intake` and `sprint_plan` workflows (corrected 0.6.0 entry)
4. `/forge:update` from 0.4.x aggregates correctly: full rebuild only if any bare `"workflows"` in path
5. `node --check` passes on all modified `.cjs` files
6. Security scan passes; report saved
