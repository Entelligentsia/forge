# Architect Approval — FORGE-S01-T05

**Status:** Approved

## Distribution Notes

- No version bump in this task — bundled with T08 (`0.4.0`).
- Schema change (`tokenSource` optional enum) is additive and non-breaking;
  existing events validate without modification.
- Users receive updated `collate.cjs`, `estimate-usage.cjs`, and
  `event.schema.json` via `/forge:update-tools` after the T08 migration.
- Running collate before updating degrades gracefully: reports omit source
  labels (values shown as `"(unknown)"`).

## Follow-Up Items

- **T08:** Wrap `collate.cjs` main logic in a top-level `try/catch` with
  `process.exit(1)` to align with the CJS tool pattern used by all other tools.
- **Future:** Align sidecar filter in `estimate-usage.cjs` from
  `!f.includes('_sidecar')` to `!f.startsWith('_')` for consistency with
  `collate.cjs`.
