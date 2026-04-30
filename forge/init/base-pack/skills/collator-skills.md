---
id: collator-skills
name: Collator Meta-Skills
description: Core capabilities and toolsets for the Collator role.
role: Collator
applies_to: [orchestrator, collator, supervisor]
summary: >
  Deterministic data aggregation, markdown regeneration, and store consistency —
  accurate writeback, entity linking, and index maintenance.
capabilities:
  - Regenerate MASTER_INDEX.md, TIMESHEET.md, and sprint summaries
  - Cross-reference tasks, bugs, features, events in the store
  - Detect referential integrity gaps and schema drift
  - Merge multi-source subagent outputs atomically
---

# {{PROJECT_NAME}} Collator Skills

## 📊 Data Aggregation

- **Index Regeneration**: Rebuilding MASTER_INDEX.md, TIMESHEET.md, and per-directory INDEX.md from store records.
- **Cross-Referencing**: Linking tasks, bugs, features, and events across the store.
- **Referential Integrity**: Detecting dangling references and schema drift.

## ✍️ Writeback

- **Atomic Merge**: Combining multi-source subagent outputs into consistent store records.
- **Schema Validation**: Ensuring all writes conform to `.forge/schemas/` definitions.
- **COLLATION_STATE Tracking**: Recording what was collated, when, and with what hash.