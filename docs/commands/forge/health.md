# /forge:health

**Category:** Forge plugin command  
**Run from:** Any Forge-initialised project directory

---

## Purpose

Checks the health of the project's SDLC knowledge base and tooling. Detects drift between the knowledge base and the actual codebase, identifies coverage gaps, and flags missing marketplace skills. Read-only — produces a report, modifies nothing.

---

## Invocation

```bash
/forge:health
```

---

## Checks

| Check | What it detects | How |
|---|---|---|
| **Stale docs** | Architecture sub-docs not updated in N sprints | Compare doc timestamps vs sprint history |
| **Orphaned entities** | ORM models/types in code not in `entity-model.md` | Grep for model definitions; diff vs KB |
| **Unused checklist items** | Stack-checklist items never triggered in recent reviews | Scan CODE_REVIEW.md files for checklist item references |
| **Coverage gaps** | Architecture areas with no sub-document | Compare detected subsystems vs `architecture/INDEX.md` |
| **Writeback backlog** | `[?]` items in KB not yet confirmed by a retrospective | Grep for `[?]` markers in `engineering/` |
| **Store integrity** | Referential integrity, orphaned records | Run `engineering/tools/validate-store --dry-run` if available |
| **Skill gaps** | Marketplace skills relevant to the stack not yet installed | Cross-reference stack vs live installed skills |

---

## Reads

| Source | Purpose |
|---|---|
| `.forge/config.json` | Stack, installed skills, paths |
| `engineering/` | All knowledge base files |
| `.forge/store/` | Sprint and task history for staleness checks |
| Codebase (Grep) | ORM model definitions to detect orphaned entities |
| `~/.claude/plugins/installed_plugins.json` | Live installed skills (source of truth — not config) |
| `$FORGE_ROOT/meta/skill-recommendations.md` | Skill recommendation mapping |

---

## Output

A health report to stdout. No files are modified.

```
Forge Health Report
===================

✓ Architecture docs: current (last updated S03)
✗ Orphaned entities: PaymentMethod, RefundRecord — in code, not in entity-model.md
✗ Writeback backlog: 3 [?] items unconfirmed since S02
✓ Store integrity: valid
✗ Skill gap: stripe-integration (HIGH) — Stripe detected in dependencies, skill not installed
  → /plugin install stripe-integration@claude-plugins-official

Recommended actions:
  /forge:regenerate knowledge-base business-domain
  /forge:regenerate knowledge-base stack-checklist
```

If `config.installedSkills` differs from the live installed skill list, health updates `config.json` to match.

---

## Recommended responses

| Health finding | Command to run |
|---|---|
| Orphaned entities | `/forge:regenerate knowledge-base business-domain` |
| New subsystems not in architecture | `/forge:regenerate knowledge-base architecture` |
| New libraries not in checklist | `/forge:regenerate knowledge-base stack-checklist` |
| Stale workflows after KB changes | `/forge:regenerate workflows` |
| Skill gap | `/plugin install {skill}@{marketplace}` |
| Store integrity errors | `engineering/tools/validate-store --fix` |

---

## Related commands

| Command | Purpose |
|---|---|
| [`/forge:regenerate`](regenerate.md) | Act on health findings |
| [`/forge:update`](update.md) | Apply a plugin version upgrade |
