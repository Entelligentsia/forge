# CODE REVIEW — FORGE-S06-T04: Fix ghost event files in store.cjs and validate-store.cjs

🌿 *Forge Supervisor*

**Task:** FORGE-S06-T04

---

**Verdict:** Approved

---

## Review Summary

The implementation correctly follows the approved plan. Two files modified in `forge/tools/`, version bumped to 0.7.4, migration entry added, security scan completed (SAFE TO USE). The ghost file detection and rename logic is clean, with proper collision checking and no security concerns introduced.

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | 〇 | Only `fs`, `path` built-ins and local `./store.cjs` |
| Hook exit discipline (exit 0 on error, not non-zero) | N/A | No hooks modified |
| Tool top-level try/catch + exit 1 on error | 〇 | validate-store.cjs has `process.on('uncaughtException', ...)` with `process.exit(1)` |
| `--dry-run` supported where writes occur | 〇 | FIX_MODE is `--fix && !DRY_RUN` — dry-run prevents all writes |
| Reads `.forge/config.json` for paths (no hardcoded paths) | 〇 | `storeRoot` from config; no hardcoded `.forge/store` strings |
| Version bumped if material change | 〇 | 0.7.3 → 0.7.4 |
| Migration entry present and correct | 〇 | 0.7.3 → 0.7.4, `regenerate: []`, `breaking: false` |
| Security scan report committed | 〇 | `docs/security/scan-v0.7.4.md` — SAFE TO USE |
| `additionalProperties: false` preserved in schemas | N/A | No schema changes |
| `node --check` passes on modified JS/CJS files | 〇 | Both store.cjs and validate-store.cjs pass |
| `validate-store --dry-run` exits 0 | × | Pre-existing errors (108) from legacy data; no new errors introduced |
| No prompt injection in modified Markdown files | N/A | No Markdown files modified in forge/ |

## Issues Found

1. **[INFO]** validate-store.cjs:348 — The event loop now accesses `store.impl.storeRoot` and `store.impl._readJson` directly, coupling validate-store to FSImpl internals. This is necessary to track filenames during iteration. The coupling is acceptable since validate-store already imports store.cjs and the alternative (adding a `listEventFilenames` facade method) would add complexity for a single caller.

2. **[INFO]** validate-store.cjs:365 — The `eventId` backfill rule `(_rec, id) => id` now receives `filename` instead of the previous `eventId`. When `eventId` is missing/null in the record, the backfill sets it to the filename stem — which is the correct behavior (the filename was the original eventId). When `eventId` already exists and differs from the filename, the rename logic on line 375-383 handles the mismatch.

---

## If Approved

### Advisory Notes

1. The `validate-store --dry-run` not exiting 0 is due to pre-existing legacy data issues from FORGE-S04/S05 events (missing `endTimestamp`, `durationMinutes`, `model` fields and malformed eventIds). These pre-date this change and are out of scope. Running `validate-store --fix` on the store would backfill many of these, but that is a separate action.

2. The `_findEventFileByContentId` method scans the entire events directory for each `writeEvent` call. For current scale (max ~50 events per sprint directory), this is negligible. If the store grows significantly, consider caching the directory scan results.

3. PROGRESS.md notes that `store.impl.storeRoot` and `store.impl._readJson` are accessed directly. If the Store facade ever gains a non-filesystem backend, validate-store's event loop will need updating. This is acceptable given the current architecture.