# PLAN — FORGE-S07-T08: Update migrate.md command — replace direct store writes with custodian references

🌱 *Forge Engineer*

**Task:** FORGE-S07-T08
**Sprint:** FORGE-S07
**Estimate:** S

---

## Objective

Update `forge/commands/migrate.md` Step 5 to replace the direct JSON write
instruction ("Read JSON, apply mapping, write file back with JSON.stringify")
with an instruction to use the store custodian skill (`/forge:store write
<entity> '{updated-json}'`). The read step may still use the Read tool or
`/forge:store read`.

## Approach

The current `migrate.md` Step 5 instructs the LLM to read each affected store
file, apply the user's mapping, and write it back using `JSON.stringify`. This
is a direct store write that bypasses the custodian, violating the single-
gateway rule established by FORGE-S07-T05/T06.

The fix is surgical: replace Step 5's three-item list with a single instruction
to apply each migration via the store custodian. Step 2 (scanning store files)
and Step 6 (running validate-store) remain unchanged since scanning is a read
operation and validate-store is a verification step.

Specifically:

1. Replace Step 5's numbered list (read JSON, apply mapping, write back with
   `JSON.stringify`) with: "For each affected record, apply the migration via
   the store custodian: `node "$FORGE_ROOT/tools/store-cli.cjs" write <entity>
   '{updated-json}'` where `<entity>` is `sprint`, `task`, or `bug` as
   appropriate and `'{updated-json}'` is the full record with the mapped
   values applied."
2. Add a FORGE_ROOT resolution instruction (same pattern as other commands)
   since the command currently does not resolve it.
3. Add the custodian's error-handling rule: on exit 1, read stderr, fix the
   data, and retry (max 2 retries). Never fall back to writing store files
   directly.
4. Remove the `JSON.stringify` reference from Step 5.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/commands/migrate.md` | Replace Step 5 direct-write instructions with custodian write; add FORGE_ROOT resolution; add custodian error-handling | Enforces single-gateway rule per R6 |

## Plugin Impact Assessment

- **Version bump required?** Yes — command behavior change alters how store
  writes are performed during migration. Bump is included in T09.
- **Migration entry required?** Yes — `regenerate: ["commands"]` so users get
  the updated migrate.md via `/forge:update`. Entry is included in T09.
- **Security scan required?** Yes — any change to `forge/` requires a scan.
  Scan is included in T09.
- **Schema change?** No — no schemas are affected.

## Testing Strategy

- Syntax check: N/A — no JS/CJS files modified
- Store validation: `node forge/tools/validate-store.cjs --dry-run` (confirms
  no store schema regressions)
- Manual verification:
  - `grep '.forge/store' forge/commands/migrate.md` returns zero direct
    write-path instructions
  - Step 5 references `store-cli.cjs write` instead of `JSON.stringify`
  - FORGE_ROOT resolution is present
  - Custodian error-handling rule is present
  - Command still reads as a clear, step-by-step migration guide

## Acceptance Criteria

- [ ] `forge/commands/migrate.md` Step 5 instructs using
      `node "$FORGE_ROOT/tools/store-cli.cjs" write <entity> '{updated-json}'`
      instead of reading JSON, applying mapping, and writing back with
      `JSON.stringify`
- [ ] `grep '.forge/store' forge/commands/migrate.md` returns zero direct
      write-path instructions (only the read-path reference in Step 2 for
      scanning may remain)
- [ ] FORGE_ROOT resolution instruction is present in the command
- [ ] Custodian error-handling rule (retry on exit 1, max 2 retries, never
      fall back to direct writes) is present
- [ ] The command still reads as a clear, step-by-step migration guide
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0

## Operational Impact

- **Distribution:** Users must run `/forge:update` to get the updated migrate
  command. The migration entry (in T09) will specify `regenerate: ["commands"]`.
- **Backwards compatibility:** Fully backwards compatible — the custodian writes
  the same JSON format. Existing stores are unaffected.