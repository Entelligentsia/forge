# FORGE-S02-T05: validate-store.cjs — referential integrity for feature_id on tasks and sprints

**Sprint:** FORGE-S02
**Estimate:** M
**Pipeline:** default

---

## Objective

Extend `forge/tools/validate-store.cjs` to enforce the Feature tier's
referential integrity constraint: any `feature_id` value on a task or sprint
manifest must resolve to a known feature in `.forge/store/features/`. Because
`feature_id` is nullable, records that omit or null it must still pass without
warning.

## Acceptance Criteria

1. `validate-store.cjs` loads all files in `.forge/store/features/` and builds
   a known-features set of IDs (format `FEAT-NNN`).
2. For every task and sprint record that carries a non-null `feature_id`,
   validate it resolves to a known feature. Report a validation error if not.
3. Stores with **no** `features/` directory (pre-v1.0 installs) or an empty
   `features/` directory continue to validate — all tasks/sprints without
   `feature_id` must still pass.
4. `--fix` mode: if a task or sprint carries an unresolvable `feature_id` and
   `--fix` is passed, clear it to `null` and log the action (same pattern as
   existing backfill rules).
5. `node --check forge/tools/validate-store.cjs` passes.
6. `node forge/tools/validate-store.cjs --dry-run` exits 0 against the
   existing Forge store (which has no `feature_id` fields — backwards-compatible
   baseline).
7. Top-level exception handler is present.

## Context

- Depends on T03 (schemas define what constitutes a valid feature record).
- Pattern reference: look at how `validate-store.cjs` currently handles
  nullable FK checks (e.g. bug `sprintId` / `taskId`) — apply the same
  pattern for `feature_id`.
- The sprint requirements note: "any `feature_id` on a task/sprint must
  resolve to a known feature" — but null/absent is explicitly exempt.
- The Forge repo itself is a valid target for `--dry-run` as a regression test.

## Plugin Artifacts Involved

- **[MODIFY]** `forge/tools/validate-store.cjs`

## Operational Impact

- **Version bump:** Not required for this task — deferred to T10.
- **Regeneration:** Users run `/forge:update` at T10; tools are regenerated
  then.
- **Security scan:** Required at T10 (covers all `forge/` changes).
