# Architect Approval — FORGE-S11-T03

🗻 *Forge Architect*

**Status:** Approved

## Distribution Notes

Version bump is explicitly deferred to T08 (release engineering task). This change modifies only
`forge/meta/workflows/meta-orchestrate.md` — a meta-workflow that generates the user-facing
orchestrator. Users will receive the fix when T08 ships and they run `/forge:update` (workflows
regeneration target). No migration entry needed for this task independently; T08 will bundle it
with the full S11 version bump.

Security scan is also deferred to T08. No CJS tools, hooks, or command files were modified in
this task — only Markdown pseudocode. The change presents no new trust boundary.

## Operational Notes

- Users on tiered and single clusters are unaffected — those branches are unchanged.
- Users on unknown clusters (no `ANTHROPIC_DEFAULT_*_MODEL` env vars) will see correct model
  resolution after regenerating workflows from T08's release.
- The generated `.forge/workflows/orchestrate_task.md` is NOT modified here — correct per task
  constraints. It will be updated by the user via `/forge:update` post-T08.
- Backwards-compatible: no manual steps required for existing users.

## Follow-Up Items

- T08 must list `"workflows"` in the `regenerate` array of the migrations.json entry so users
  know to run `/forge:update` workflows to get this fix.
- The Phase Announcements prose section in `meta-orchestrate.md` (around line 113) has a minor
  ambiguity — "If the variable is unset, fall back to the tier name" — which technically only
  describes tiered-cluster behaviour. A future cleanup could unify this prose with the
  unknown-cluster documentation now in the Dispatch Behavior table. Non-blocking.
