# Decision: InstantDB Store Backend

**Status:** Deferred — POC proven, formalization blocked. Revisit at Ember Phase 3.  
**Date:** 2026-04-18

---

## What Was Proven

A full `InstantDbImpl` backend was built and validated against the `Store` facade in `forge/tools/store.cjs`. The POC covered:

- All entity types: Sprint, Task, Bug, Event, Feature, CollationState
- Upsert semantics (query-then-insert or update, using `@instantdb/admin`)
- Ghost-file detection equivalent (`renameEvent`)
- `purgeEvents` and `listEventFilenames` semantics replicated in InstantDB
- `createInstantStore()` factory that loads credentials from `.env.development`
- `migrate-store.cjs` — a production-grade migration script (dry-run, backup, spot-check verification)
- `instant.schema.js` — entity schema matching the Forge store shape

The facade pattern (`Store` → `FSImpl` / `InstantDbImpl`) means callers are already insulated from the backend choice. The swap is architecturally ready.

POC files live at repo root: `init-schema.cjs`, `setup-instantdb.cjs`, `migrate-store.cjs`, `test-instantdb-store.cjs`, `instant.schema.js`, `.env.development`.

---

## Blockers for Formalization

### 1. Sync/Async Incompatibility (Critical)

`FSImpl` is fully synchronous. `InstantDbImpl` is fully async (all 35+ methods return Promises).  
Every production CLI tool calls the store without `await` — switching the default implementation would silently fail at runtime.

Tools requiring async retrofit before `InstantDbImpl` can be the default:

| Tool | Store calls |
|---|---|
| `collate.cjs` | 8 |
| `validate-store.cjs` | 12 |
| `store-cli.cjs` | All CRUD |
| `seed-store.cjs` | 4 |
| `estimate-usage.cjs` | 1 |

`migrate-store.cjs` already handles async correctly and needs no changes.

Fix: wrap each tool's root invocation in `async () => { ... }()`.

### 2. No `package.json` in Forge

`@instantdb/admin` and `dotenv` are required at runtime but not declared in any manifest. Plugin users would get a `MODULE_NOT_FOUND` error. A `package.json` listing these as optional peer deps is a prerequisite.

### 3. Ember Phase 1–2 Does Not Need a Database

The companion dashboard (`forge-ember`) is explicitly file-backed through Phase 2. Its daemon reads `.forge/store/` via chokidar file-watching and pushes WebSocket invalidation events to the SPA. InstantDB adds infrastructure complexity (hosted backend, auth, subscriptions) without enabling any Phase 1 or Phase 2 feature.

From `forge-ember/docs/product/PHASE1-SPEC.md`:
> "No database in Phase 1. A hosted backend with a real database is planned for Phase 3 (team coordination)."

---

## Design Constraints to Preserve

- **Files are the source of truth.** The JSON store in `.forge/store/` is auditable, portable, and Git-friendly. This property must be maintained for single-developer offline installs regardless of which backend is active.
- **FSImpl remains the default.** InstantDB is opt-in, activated by `STORE_BACKEND=instantdb` env var (or config key). No existing user sees any change.
- **Mutations go through `store-cli.cjs`.** Ember's daemon never writes JSON directly — it spawns `store-cli.cjs`. This invariant applies equally to an InstantDB backend.

---

## Recommended Path

### Now (Ember Phase 1)

- Keep `FSImpl` as the only shipped backend
- Wrap all CLI tools in `async` IIFEs — low-effort, non-breaking, unblocks Phase 3
- Add `package.json` to the plugin with `@instantdb/admin` as an optional peer dep
- Move POC root scripts to `dev/instantdb/` and document them

### Ember Phase 3 (Team Coordination)

- Flip the default to `InstantDbImpl` for team installs
- `FSImpl` remains default for single-dev offline installs
- `migrate-store.cjs` becomes a first-class upgrade path (already ~70% production-ready)
- Ember daemon connects directly to InstantDB instead of chokidar

---

## Migration Readiness (at Phase 3)

| Component | Ready? | Gap |
|---|---|---|
| `InstantDbImpl` in `store.cjs` | ✅ | — |
| `migrate-store.cjs` | ~70% | No atomic rollback; `.env.development` path hardcoded |
| `instant.schema.js` | ✅ | — |
| CLI tool async wrappers | ❌ | Must be done before flip |
| `package.json` with deps | ❌ | Must be done before ship |
| Real integration tests | ❌ | Only mock (`MockInstantDbImpl`) exists |
| `STORE_BACKEND` env var routing | ❌ | `createInstantStore()` factory exists; wiring not done |
