# PLAN REVIEW — FORGE-S06-T04: Fix ghost event files in store.cjs and validate-store.cjs

🌿 *Forge Supervisor*

**Task:** FORGE-S06-T04

---

**Verdict:** Approved

---

## Review Summary

The plan correctly identifies the root cause (writeEvent writes to the canonical path without checking for/relocating an existing file whose content eventId matches but filename differs) and proposes a clean two-part fix in both store.cjs and validate-store.cjs. All seven acceptance criteria from the task prompt are addressed, the plugin impact assessment is accurate, and the approach follows existing patterns.

## Feasibility

The approach is realistic and correctly scoped. The two files identified (`store.cjs` and `validate-store.cjs`) are the exact files named in the task prompt. The `_findEventFileByContentId` scan is O(N) per event directory per write, but event directories are small (typically <100 files), so this is acceptable. The scope is appropriate for a Medium estimate.

One consideration: the plan adds `renameEvent` as a public method on the Store facade, which is good for testability and for validate-store to call directly. The validate-store restructure from "list parsed records" to "iterate filenames then parse" is the correct approach to detect the mismatch.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes — 0.7.4 is the next in sequence after 0.7.3. Bug fix in distributed tooling is material.
- **Migration entry targets correct?** Yes — `regenerate: []` is correct because tools are copied on install, not generated from templates. Users get the fix automatically on next install.
- **Security scan requirement acknowledged?** Yes — explicitly required in the plan.

## Security

No prompt-injection risk — these are CJS tool scripts, not Markdown command/workflow files. The collision check before rename prevents a malicious or corrupted eventId from silently overwriting an existing file. Path traversal is not a concern because eventIds are constructed by the orchestrator (timestamps + task IDs + roles + actions), not from untrusted user input. The `_`-prefix skip in the scan prevents sidecar files from being caught in the rename logic.

## Architecture Alignment

- Follows existing patterns: `_readJson`/`_writeJson` pattern, `fs.existsSync`/`fs.renameSync` for file operations, Store facade delegation.
- No npm dependencies introduced — uses only `fs` and `path` built-ins.
- No schema changes, so `additionalProperties: false` is unaffected.
- Paths are resolved via `this.storeRoot` (from `.forge/config.json`), not hardcoded.

## Testing Strategy

- `node --check` on both modified files: specified in plan and acceptance criteria.
- `validate-store --dry-run`: specified.
- Manual verification using the 24 existing mismatched files in the store as a real-world test case: specified.
- The acceptance criteria are concrete and verifiable (zero orphans after `--fix`, collision errors instead of silent overwrite).

---

## If Approved

### Advisory Notes

1. **validate-store event loop restructure**: The plan correctly identifies that the current loop iterates over parsed records from `store.listEvents()`. To track original filenames, the loop needs to iterate over directory entries directly. When implementing, be careful to maintain the same validation behavior (skip `_`-prefixed files, handle null records gracefully).

2. **Backfill ordering in validate-store**: The `eventId: (_rec, id) => id` backfill rule derives eventId from the filename (the `id` parameter). When the filename-based `id` is passed to this backfill, it should produce a canonical eventId that matches the filename — so in the normal case, no rename is needed. The rename path triggers when some OTHER backfill rule changes the eventId (e.g., a previous backfill run wrote a different eventId into the JSON body). Consider whether the `eventId` backfill rule itself is still needed — if the filename is already canonical, setting `rec.eventId = filename` is a no-op.

3. **Performance of `_findEventFileByContentId`**: This scans the entire events directory for each `writeEvent` call. For a single event write this is fine. If `writeEvent` is ever called in a bulk loop (e.g., by validate-store --fix processing many events), each call would re-scan the directory. This is acceptable for current scale but worth noting if future usage patterns change.