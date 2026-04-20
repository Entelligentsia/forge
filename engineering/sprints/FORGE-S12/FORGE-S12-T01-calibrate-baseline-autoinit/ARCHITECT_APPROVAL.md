# Architect Approval — FORGE-S12-T01

*Forge Architect*

**Status:** Approved

## Distribution Notes

Version bumped from 0.21.0 to 0.22.0. Migration entry added: `0.21.0 -> 0.22.0` with `regenerate: ["commands"]`. Security scan report at `docs/security/scan-v0.22.0.md` shows SAFE TO USE (0 critical, 2 warnings carry-forward, 3 info). No breaking changes.

## Operational Notes

Users must run `/forge:update` to regenerate the updated `calibrate` command. No manual steps required. The change is fully backwards-compatible: existing calibration baselines are unaffected; only the missing-baseline path changed from dead-end to auto-initialization.

## Follow-Up Items

- The `preflight-gate.cjs` `resolveVerdictSources` function uses `taskRecord.path` (the plugin source file path) as the base directory for verdict artifacts, which causes gate failures when `task.path` points to a plugin file rather than the engineering task directory. This bug is out of scope for this task but should be addressed in a future sprint (e.g., FORGE-S12-T02 or a follow-up).