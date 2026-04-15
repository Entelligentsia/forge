# PLAN REVIEW — FORGE-S07-T08: Update migrate.md command — replace direct store writes with custodian references

🌿 *Forge Supervisor*

**Task:** FORGE-S07-T08

---

**Verdict:** Approved

---

## Review Summary

The plan correctly identifies the single file to modify (`forge/commands/migrate.md`)
and the precise surgical change needed: replace Step 5's direct-write instructions
with custodian write invocations. Scope is well-bounded (S estimate), all four
acceptance criteria are addressed, and the version bump / security scan
responsibilities are correctly deferred to T09.

## Feasibility

The approach is realistic and correctly scoped. The plan targets exactly one file
(`forge/commands/migrate.md`) and one step within it (Step 5). The change is
purely instructional -- replacing LLM-facing guidance from "write JSON directly"
to "invoke the store custodian". No code generation, no schema changes, no new
files. The existing store-cli.cjs (T05) and store-custodian skill (T06) provide
the target invocations.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes -- material change (command behavior
  alters store write path), correctly noted as included in T09.
- **Migration entry targets correct?** Yes -- `regenerate: ["commands"]` is the
  right target since migrate.md is a command file. Noted as included in T09.
- **Security scan requirement acknowledged?** Yes -- any change to `forge/`
  requires a scan. Correctly noted as included in T09.

## Security

No prompt injection risk: the replacement text references deterministic CLI
invocations (`store-cli.cjs write <entity>`) rather than introducing new
user-controlled interpolation points. The FORGE_ROOT resolution follows the
same pattern as other commands. The custodian error-handling rule (retry on
exit 1, max 2 retries, never fall back to direct writes) is a hardening
measure, not a risk.

## Architecture Alignment

- The approach follows the established single-gateway rule from R6. The
  invocation pattern (`node "$FORGE_ROOT/tools/store-cli.cjs" write <entity>`)
  matches the store-custodian skill's documented pattern exactly.
- No schema changes -- `additionalProperties: false` is unaffected.
- Path resolution reads `FORGE_ROOT` from the plugin root, consistent with
  other commands.

## Testing Strategy

Adequate for an S-sized Markdown-only change:
- `node forge/tools/validate-store.cjs --dry-run` confirms no store regressions.
- Manual verification via grep confirms zero direct write-path instructions.
- No JS/CJS files modified, so `node --check` is N/A (correctly noted).

---

## If Approved

### Advisory Notes

1. When implementing, ensure the FORGE_ROOT resolution block matches the
   existing pattern at the top of `migrate.md` (the command already has a
   `FORGE_ROOT` resolution using `!` backtick execution -- verify it is
   still present and consistent).
2. The Step 5 rewrite should preserve the "Do not modify any field that was
   not part of the agreed mapping. Do not add or remove fields." guard from
   the current text -- the custodian write still needs this instruction so
   the LLM doesn't inadvertently alter unmapped fields.
3. Consider whether Step 6 (verify) should also use the custodian's
   `validate` command, but this is optional since `validate-store.cjs` is
   the canonical verification tool and is not a store write.