# PLAN REVIEW — FORGE-S07-T03: Fix collate.cjs facade bypasses — writeCollationState and purgeEvents

🌿 *Forge Supervisor*

**Task:** FORGE-S07-T03

---

**Verdict:** Approved

---

## Review Summary

The plan correctly identifies both facade bypass sites and proposes the right mechanical substitutions. All five acceptance criteria from the task prompt are addressed. The approach is well-scoped for an S-sized task. Two implementation-level details need attention during the implement phase (noted below), but neither is a plan-level deficiency.

## Feasibility

Fully feasible. The `store` instance is already imported and used throughout collate.cjs (line 17: `const store = require('./store.cjs')`). Both `store.writeCollationState()` and `store.purgeEvents()` exist on the Store class and have matching semantics. The scope is exactly two call-site replacements — appropriate for an S estimate.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes — correctly deferred to T09, which owns release engineering. The task prompt explicitly confirms this.
- **Migration entry targets correct?** N/A — no migration entry needed in this task. No schema or config changes; no regeneration targets affected.
- **Security scan requirement acknowledged?** Yes — acknowledged as required but deferred to T09. Correct per task prompt.

## Security

No new security concerns. The facade's `purgeEvents()` implements the same path-traversal guard that exists in the current collate.cjs code (lines 269-271 of store.cjs). Removing the duplicate guard from collate.cjs is safe. No new Markdown content, no prompt injection risk, no credential access changes.

## Architecture Alignment

- The approach follows the established store facade pattern (all store mutations through the facade).
- No schema changes.
- No new `require()` calls introduced.
- The `writeFile()` helper is correctly retained for non-store writes (engineering root outputs).

## Testing Strategy

Adequate. `node --check` is specified for the modified file. Store validation is included. Manual smoke tests for both normal collation and purge mode are described. One gap: the plan should verify dry-run mode specifically for the writeCollationState change (see Advisory Note 1 below).

---

## If Approved

### Advisory Notes

1. **DRY_RUN handling for writeCollationState is a behavioral concern.** The plan states "dry-run suppression is acceptable" but this is incorrect. The current `writeFile` helper at line 509 respects `DRY_RUN` — in dry-run mode, it logs `[dry-run] would write: .forge/store/COLLATION_STATE.json` and does NOT write the file. `store.writeCollationState()` always writes, unconditionally. If the facade call is used without a DRY_RUN guard, the tool will write COLLATION_STATE.json even in `--dry-run` mode, which is a behavioral regression. The implementer should wrap the call:

   ```javascript
   if (DRY_RUN) {
     console.log(`[dry-run] would write: ${path.relative(cwd, path.join(storeRoot, 'COLLATION_STATE.json'))}`);
   } else {
     store.writeCollationState(stateData);
   }
   ```

   This preserves the existing dry-run semantics and satisfies AC4 ("produces the same output as before").

2. **Console output reconstruction for purge events.** The facade's `purgeEvents()` returns `{ purged, fileCount, files }` but does not produce console output. The implementer must reconstruct the console messages from the return value. The current code uses `path.relative(cwd, eventsDir)` for the directory path, which can be derived from `path.join(storeRoot, 'events', SPRINT_ARG)`. The three current output messages should be preserved:

   - No events dir: `"Purge: no events directory found for '${SPRINT_ARG}' — nothing to delete"`
   - Dry run: `"[dry-run] would purge: ${relPath}/ (${fileCount} file(s))"`
   - Real: `"Purged: ${relPath}/ (${fileCount} event file(s) deleted)"`

3. **Error propagation for purgeEvents path-traversal guard.** The current collate.cjs code uses `console.error()` + `process.exit(1)` when the path-traversal guard triggers. The facade throws an `Error` instead. Since collate.cjs has no top-level try/catch, the facade's Error will produce a stack trace on crash rather than the current clean error message. This is acceptable for a tool (tools may exit with stack traces) but the implementer should be aware of the different error presentation. If matching the current behavior is desired, a try/catch around the purge call would be needed.