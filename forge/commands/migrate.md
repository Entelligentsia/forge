---
name: migrate
description: REMOVED in v1.0 — use /forge:init --migrate instead
---

# /forge:migrate — Removed

× `/forge:migrate` was removed in v1.0. Store migration is now a flag on `/forge:init`:

- `/forge:init --migrate` — interviews you to map existing store values to Forge format (equivalent to the old `forge:migrate`)
- `/forge:init --migrate --structural` — runs structural migration for pre-v0.40 stores
- `/forge:init --migrate --dry-run` — preview changes without applying them
