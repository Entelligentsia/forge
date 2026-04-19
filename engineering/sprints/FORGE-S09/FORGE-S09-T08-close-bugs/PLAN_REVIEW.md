# PLAN REVIEW — FORGE-S09-T08: Close BUG-002/003 validate-store pre-existing errors

**Forge Supervisor**

**Task:** FORGE-S09-T08

---

**Verdict:** Approved

---

## Review Summary

The plan correctly identifies three distinct categories of store validation errors and proposes a layered remediation approach: schema sync (dogfooding instance only), automated backfill, and manual cleanup of undeclared legacy fields. The approach is sound, well-scoped, and does not touch any `forge/` source code. No version bump or security scan is required.

## Feasibility

The approach is realistic. All files to modify are identified and verified. The schema sync step correctly targets the installed copies at `.forge/schemas/` (dogfooding instance), not the plugin source at `forge/schemas/`. The manual cleanup is straightforward field removal from a small, finite set of event files. The scope is appropriate for a single M task.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes -- no `forge/` changes means no version bump.
- **Migration entry targets correct?** N/A -- no plugin code changes.
- **Security scan requirement acknowledged?** Yes -- correctly noted as not required since no `forge/` changes.

## Security

No risk. The changes are entirely within the dogfooding store (`.forge/store/`) and installed schema copies (`.forge/schemas/`). No distributed plugin code is modified. No Markdown command or workflow files are changed. No path reads untrusted input.

## Architecture Alignment

- The approach follows established patterns: validate-store is the canonical verification tool, and its `--fix` flag is the supported mechanism for data remediation.
- Updating installed schemas to match plugin source is the expected outcome of `/forge:update` or `/forge:regenerate` -- this task performs it manually since the automated path has not been run.
- `additionalProperties: false` is preserved in the source schemas; the installed copies will match the source.

## Testing Strategy

Adequate. The primary verification is `node forge/tools/validate-store.cjs --dry-run` exiting 0, which directly validates the acceptance criteria. No JS/CJS files are modified, so `node --check` is not applicable. The plan includes a preview step (`--fix --dry-run`) before applying changes, which is good practice.

---

## If Approved

### Advisory Notes

1. **Schema sync scope:** Only `sprint.schema.json` and `task.schema.json` have material differences between source and installed. Copying all four schema files (`sprint`, `task`, `bug`, `event`) is harmless and ensures full sync, but only the sprint and task copies are strictly necessary.
2. **Backup before --fix:** Consider running `git add .forge/store/` before `--fix` so that any unintended changes can be easily reverted.
3. **Event field semantics:** After backfill, some events will have `endTimestamp: null` and `durationMinutes: null`. These are valid per the `NULLABLE_FK` set in validate-store.cjs but represent incomplete lifecycle data. This is acceptable for legacy events.
4. **The sprint-start.json files:** There are TWO sprint-start files in FORGE-S09 -- `sprint-start.json` (old format) and `20260416T020000000Z_FORGE-S09_sprint-start.json` (newer but still non-canonical). Both need cleanup. After cleanup, they will both be valid events. Consider whether the old `sprint-start.json` is redundant and should be deleted instead of repaired -- but the plan's approach of repairing both is also valid.