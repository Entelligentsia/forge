---
name: enhance
description: REMOVED in v1.0 — use /forge:rebuild --enrich instead
---

# /forge:enhance — Removed

× `/forge:enhance` was removed in v1.0. Enhancement is now a flag on `/forge:rebuild`:

- `/forge:rebuild --enrich` — runs the full enhancement workflow (Phase 2 KB enrichment + Phase 3 drift detection)
- Enhancement hooks (post-init `--auto`, post-sprint `--phase 2`) continue to fire automatically — no action needed
