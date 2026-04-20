# Architect Approval — FORGE-S11-T02

🗻 *Forge Architect*

**Status:** Approved

## Distribution Notes

Version bump is deliberately deferred to T08 (sprint release engineering task), which
consolidates all S11 fixes (T01–T07) into a single v0.20.0 release gate. The T08
migration entry will specify `regenerate: ["tools"]` so that `/forge:update` pushes the
updated `preflight-gate.cjs` to all users. No version bump is required in this commit.

Security scan is also deferred to T08 per the sprint plan. The scan will cover all S11
changes as a batch before the v0.20.0 release commit.

User-facing impact: users who invoke preflight-gate.cjs via the CLI will gain a new
optional `--workflow <name>` argument. Callers that omit the argument behave identically
to the previous version (alphabetical fallback scan). No action required from users until
they upgrade to v0.20.0.

## Operational Notes

- No new installed artifacts, directories, or disk-write sites introduced.
- `preflight-gate.cjs` remains a pure read-only tool — no writes, no `--dry-run`
  requirement.
- The `--workflow` argument is additive and optional; all existing orchestrator
  invocations that omit it continue to work without modification.
- Orchestrator meta-workflows that call preflight-gate will be updated (to pass
  `--workflow`) as part of the T08 `tools` regeneration step.
- `node --check forge/tools/preflight-gate.cjs` passes. All 506 tests pass.
- `validate-store --dry-run` passes (confirmed by code review).

## Follow-Up Items

- T08 must include a migration entry `regenerate: ["tools"]` so `/forge:update` pushes
  the fixed `preflight-gate.cjs` to installed users.
- Orchestrator meta-workflows should be audited (possibly in a follow-up sprint) to
  verify they pass `--workflow` correctly for all phase invocations, ensuring deterministic
  gate selection in all real-world multi-workflow repositories.
- The fallback alphabetical scan (when `--workflow` is provided but the named file lacks
  the gate) is intentional per the plan; document this behaviour in the preflight-gate
  tool header comment in a future polish pass.
