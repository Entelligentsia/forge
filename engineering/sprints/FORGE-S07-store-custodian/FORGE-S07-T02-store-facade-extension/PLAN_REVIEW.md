# PLAN REVIEW — FORGE-S07-T02: Store facade extension — writeCollationState, purgeEvents, listEventFilenames

🌿 *Forge Supervisor*

**Task:** FORGE-S07-T02

---

**Verdict:** Approved

---

## Review Summary

The plan is well-scoped and correctly targets the single file (`forge/tools/store.cjs`) that needs modification. All seven acceptance criteria from the task prompt are addressed, the implementation follows the existing Store/FSImpl delegation pattern exactly, and the version bump / security scan deferral to T09 is consistent with the task prompt's own stated impact. No npm dependencies, no schema changes, no prompt injection surfaces.

## Feasibility

The approach is realistic. Adding four methods to an existing class following the established delegation pattern is straightforward. The file identification is correct -- only `forge/tools/store.cjs` is modified. The scope is appropriate for an M-estimate task.

The `purgeEvents` return value design (`{ purged, fileCount, files }`) extends slightly beyond what the task prompt requires ("dry-run mode returns the file list without deleting"), but it is a reasonable design that supports the collate.cjs caller which prints count-based messages. The extra `purged` and `fileCount` fields are non-breaking and useful. No concern.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes -- the plan correctly identifies the change as material (new public API in `forge/tools/store.cjs`) and defers the bump to T09 per the task prompt's own specification.
- **Migration entry targets correct?** N/A -- no migration entry needed (additive API, no schema changes, no breaking changes).
- **Security scan requirement acknowledged?** Yes -- the plan acknowledges the scan requirement and defers to T09.

## Security

No new Markdown command/workflow files (no prompt injection risk). No hooks modified. No new HTTP calls. The `purgeEvents` path-traversal guard is correctly specified and mirrors the existing guard in `collate.cjs`. The method throws on path escape rather than calling `process.exit(1)`, which is the correct facade pattern (facade reports errors; tools decide exit strategy).

No credential or env-var access. No data exfiltration risk.

## Architecture Alignment

- The approach follows the established Store/FSImpl delegation pattern exactly (Store delegates, FSImpl implements via `_readJson`/`_writeJson`).
- No schema changes, so `additionalProperties: false` is not in scope.
- Paths are derived from `this.storeRoot` (which is resolved from `.forge/config.json`), not hardcoded. Correct.
- No hooks are modified, so hook exit discipline is not in scope.

## Testing Strategy

The plan includes:
- `node --check forge/tools/store.cjs` -- correct, covers the modified file.
- `node forge/tools/validate-store.cjs --dry-run` -- correct, confirms no regressions.
- Manual smoke test via Node REPL to verify all four methods are accessible -- reasonable for this stack (no test runner).

Adequate for the stack. No schema changes, so `validate-store --dry-run` is a regression check only, which is appropriate.

---

## If Approved

### Advisory Notes

1. The `purgeEvents` implementation filters `.json` files for the return value's `fileCount` and `files` array, but `fs.rmSync` deletes the entire directory (including any non-`.json` files). This matches the current `collate.cjs` behavior, but the implementer should be aware that `fileCount` reflects `.json` files only while the physical delete is broader. Document this in a code comment.

2. The plan's `listEventFilenames` returns `{ filename, id }` where `id` is the filename without `.json`. The task prompt says the return type is `{ filename: string, id: string }`. The plan matches. The implementer should verify the `id` field is useful to validate-store.cjs's current usage (line 378 reads full event JSON; T04 will refactor that call).

3. The Store class delegate for `purgeEvents` passes `opts` through as the second argument. The FSImpl destructures `{ dryRun = false } = {}` in its signature. This works but the delegate should be explicit about the options shape to avoid confusion. Consider adding a JSDoc comment on the Store delegate method.