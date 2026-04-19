# Architect Approval — FORGE-S07-T08

🗻 *Forge Architect*

**Status:** Approved

## Distribution Notes

- **Version bump:** Required (material change to command behavior). Deferred to
  FORGE-S07-T09 which is the sprint's dedicated release-engineering task.
- **Migration entry:** Required with `regenerate: ["commands"]`. Users must run
  `/forge:update` to get the updated `migrate.md`. Deferred to T09.
- **Security scan:** Required (any `forge/` change). Deferred to T09.
- **User-facing impact:** After upgrading, `/forge:migrate` will use the store
  custodian for all store writes. The migration output (updated JSON records) is
  identical -- no behavioral change from the user's perspective.

## Operational Notes

- **Deployment:** Standard -- push to `main`, users upgrade via
  `/plugin install` + `/forge:update`.
- **Regeneration:** `commands` target only. No tool, workflow, or schema
  regeneration required.
- **Manual steps:** None for users. The custodian is already available from
  T05/T06, which are committed.

## Architectural Review

- **Backwards compatibility:** Fully maintained. The custodian writes the same
  JSON format. Existing stores are unaffected.
- **Migration correctness:** `regenerate: ["commands"]` is the correct target
  since only `migrate.md` changed.
- **Update path:** Does not affect `/forge:update` itself.
- **Cross-cutting concerns:** This is the command-migration counterpart to T07
  (workflow-migration). Together they complete R6 from the requirements. No
  other commands or hooks are impacted.
- **Operational impact:** No new installed artifacts, directories, or disk-write
  sites. The custodian CLI (store-cli.cjs) was introduced in T05 and is already
  available.
- **Security posture:** No new trust boundaries. The custodian enforces schema
  validation on writes, which is a hardening improvement over direct writes.

## Follow-Up Items

- T09 must include the version bump, migration entry (`regenerate: ["commands"]`),
  and security scan for this change.
- Consider adding `/forge:store validate` to Step 6 of the migrate command as
  an additional pre-verification step (advisory, not blocking).