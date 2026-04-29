# /forge:health

**Category:** Forge plugin command
**Run from:** Any Forge-initialised project directory

---

## Purpose

Checks the health of the project's SDLC instance. Detects drift between the knowledge base and the actual codebase, identifies coverage gaps, validates store integrity, and flags missing marketplace skills. Read-only — produces a report, modifies nothing.

---

## Invocation

```bash
/forge:health
/forge:health --path /other/project
```

---

## Checks

| # | Check | What it detects |
|---|-------|----------------|
| 1 | Config completeness | Missing required fields in `.forge/config.json` — blocks further checks if incomplete |
| 2 | KB freshness | Architecture sub-docs not updated since the calibration baseline |
| 3 | Stale docs | Architecture sub-docs older than N sprints |
| 4 | Orphaned entities | ORM models/types in code but not in `entity-model.md` |
| 5 | Unused checklist items | Stack-checklist items never triggered in recent reviews |
| 6 | Coverage gaps | Architecture areas with no sub-document |
| 7 | Modified generated files | Generated files that have been edited by the user (detected via generation manifest hashes) |
| 8 | Generated file structure | Missing or unexpected files in `.forge/`, `engineering/`, `.claude/commands/` |
| 9 | Skill gaps | Marketplace skills relevant to the stack not yet installed |
| 10 | Feature test coverage | Active features with no FEAT-NNN test traces |
| 11 | Concepts freshness | Concept docs not updated after schema changes |
| 12 | Persona pack freshness | `.forge/cache/persona-pack.json` stale vs current personas |
| 13 | Context pack freshness | `.forge/cache/context-pack.json` stale vs current architecture |
| 14 | Plugin integrity | Plugin files modified or missing (via `integrity.json` SHA-256 verification) |

---

## Reads

| Source | Purpose |
|--------|---------|
| `.forge/config.json` | Stack, installed skills, paths, calibration baseline |
| `engineering/` | All knowledge base files |
| `.forge/store/` | Sprint and task history for staleness checks |
| `.forge/cache/` | Persona packs and context packs |
| `.forge/generation-manifest.json` | Hash tracking for generated files |
| Codebase (Grep) | ORM model definitions to detect orphaned entities |
| `~/.claude/plugins/installed_plugins.json` | Live installed skills |
| `$FORGE_ROOT/meta/skill-recommendations.md` | Skill recommendation mapping |
| `$FORGE_ROOT/integrity.json` | SHA-256 hash manifest for plugin files |

---

## Output

A health report to stdout. No files are modified.

```
Forge Health Report
===================

〇 Config: complete
〇 KB freshness: current (last calibrated S03)
△ Orphaned entities: PaymentMethod, RefundRecord — in code, not in entity-model.md
〇 Store integrity: valid
× Skill gap: stripe-integration (HIGH) — Stripe detected in dependencies, skill not installed
  → /plugin install stripe-integration@claude-plugins-official
△ Persona pack: stale (regenerated S02, personas modified S03)
〇 Plugin integrity: 30 files verified

Recommended actions:
  /forge:regenerate knowledge-base business-domain
  /forge:regenerate workflows
```

Symbols: 〇 = pass, △ = warning, × = failure.

If `config.installedSkills` differs from the live installed skill list, health updates `config.json` to match.

---

## Recommended responses

| Health finding | Command to run |
|----------------|----------------|
| Orphaned entities | `/forge:regenerate knowledge-base business-domain` |
| New subsystems not in architecture | `/forge:regenerate knowledge-base architecture` |
| New libraries not in checklist | `/forge:regenerate knowledge-base stack-checklist` |
| Stale workflows after KB changes | `/forge:regenerate workflows` |
| Stale persona pack | `/forge:regenerate personas` |
| Stale context pack | `/forge:regenerate knowledge-base architecture` |
| Modified generated files | Review changes; run `/forge:regenerate` to reset |
| Skill gap | `/plugin install {skill}@{marketplace}` |
| Plugin integrity failure | `/forge:update` to restore plugin files |
| Store integrity errors | `/forge:store-repair` |

---

## Flags

| Flag | Purpose |
|------|---------|
| `--path <dir>` | Run health check against a different project directory |

---

## Related commands

| Command | Purpose |
|---------|---------|
| [`/forge:regenerate`](regenerate.md) | Act on health findings |
| [`/forge:calibrate`](calibrate.md) | Detect drift and propose targeted patches |
| [`/forge:update`](update.md) | Apply a plugin version upgrade |
| [`/forge:store-repair`](store-repair.md) | Repair corrupted store records |