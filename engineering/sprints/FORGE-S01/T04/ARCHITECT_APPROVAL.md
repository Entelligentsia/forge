# Architect Approval — FORGE-S01-T04

**Status:** Approved

## Distribution Notes

- No version bump in this task; bundled with T08 per sprint plan.
- No migration entry required here; T08 will include `regenerate: ["tools"]` so
  users receive `estimate-usage.cjs` via `/forge:update-tools`.
- Security scan deferred to T08 (covers the full batch of new/changed plugin
  artifacts).
- The tool is fully additive: it writes only to optional schema fields added in
  T01, never overwrites self-reported data, and introduces no new dependencies.
- Atomic write semantics (`.tmp` + `renameSync`) are correct and safe.
- Lint command updated in `.forge/config.json` to include the new tool.

## Follow-Up Items

- T05 should refine the pricing model to use separate input/output pricing tiers
  (currently simplified to a single price per direction, marked with a `// TODO`
  in source).
- The 16 pre-existing `validate-store` errors in historical event records
  (missing `endTimestamp`, `model`, etc.) should be addressed in a future
  housekeeping task or bug fix; they are unrelated to this task.
