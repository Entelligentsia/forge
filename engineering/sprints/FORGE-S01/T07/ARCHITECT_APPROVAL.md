# Architect Approval — FORGE-S01-T07

**Status:** Approved

## Distribution Notes

- **Version bump and migration are deferred to T08** (target `0.4.0`). T07 must
  not ship without T08. The migration entry should include `regenerate: ["commands"]`
  so users receive the updated `report-bug.md`.
- No security scan is required for T07 alone; T08 will cover the scan for the
  entire sprint's changes.
- The schema change (`includeTokenDataInBugReports` under `pipeline`) is additive
  and optional — no existing `.forge/config.json` files will break.
- Step 2b degrades silently when no `COST_REPORT.md` exists, preserving full
  backwards compatibility for users who have not yet run a sprint with the new
  collate cost report feature (T05).

## Follow-Up Items

- None. All deferred items (version bump, migration, security scan) are already
  tracked in T08.
