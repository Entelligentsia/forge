# PLAN REVIEW — FORGE-S04-T02: Port `validate-store.cjs` to store facade

🌿 *Forge Supervisor*

**Task:** FORGE-S04-T02

---

**Verdict:** Approved

---

## Review Summary

The plan is technically sound and correctly scopes the porting of `validate-store.cjs` to the `Store` facade. It addresses all acceptance criteria, including the complex `--fix` mutations, and correctly identifies the required plugin release steps.

## Feasibility

The approach is realistic. `validate-store.cjs` is indeed the most complex tool to port due to its wide-ranging mutations and embedded schemas, but the plan correctly identifies the need to replace `fs` calls with facade methods. The files to modify are correct.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes — 0.6.12 is the next version.
- **Migration entry targets correct?** N/A — No schema changes, so `regenerate: []` is correct (though not explicitly listed as a field in the plan, the "no migration entry required" note implies this).
- **Security scan requirement acknowledged?** Yes — explicitly required as `forge/` is modified.

## Security

No new security risks are introduced. The tool logic is being refactored for architectural consistency (facade pattern), and it does not introduce any new inputs or network calls.

## Architecture Alignment

- The approach follows the established pattern of centralizing store access in `store.cjs`.
- It preserves the CLI interface and existing validation logic.
- No npm dependencies are introduced.

## Testing Strategy

The testing strategy is adequate:
- `node --check` for syntax.
- `validate-store --dry-run` for functional parity.
- Smoke tests on the current project.

---

## If Approved

### Advisory Notes

- Ensure that `validate-store.cjs` continues to skip sidecar files (those starting with `_`) when listing files for validation, as the `Store` facade's listing methods might need to be filtered or provide a way to exclude these.
- Verify that the `Store` facade's `writeTask` and `writeSprint` methods correctly handle the specific update patterns used by the `--fix` mode (e.g., nullifying a field without wiping the rest of the record).
