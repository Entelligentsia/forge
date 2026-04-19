# PLAN — FORGE-S04-T04: Port `seed-store.cjs` to store facade

🌱 *Forge Engineer*

**Task:** FORGE-S04-T04
**Sprint:** FORGE-S04
**Estimate:** S

---

## Objective

Refactor `forge/tools/seed-store.cjs` to use the `Store` facade instead of direct filesystem operations and manual config resolution. This ensures that seeding logic adheres to the unified store interface and benefits from any future backend abstractions.

## Approach

1. Import the `Store` singleton from `forge/tools/store.cjs`.
2. Replace the manual `readConfig` logic with the facade's built-in configuration handling (indirectly via the facade's methods).
3. Replace all `writeJson` calls with the corresponding `Store` methods (`writeSprint`, `writeTask`, `writeBug`).
4. Update the feature directory scaffolding logic to utilize a `Store` method if possible, or maintain minimal `fs` for directory creation if the facade doesn't support raw directory scaffolding (the current facade doesn't have a `createDirectory` method, so `fs.mkdirSync` will be kept for the `features/` folder).
5. Ensure `--dry-run` functionality is preserved. Since the `Store` facade (specifically `FSImpl`) does not currently support a `dryRun` mode in its constructor or methods, I will need to wrap the `Store` calls or maintain a check.
   *Decision:* The `FSImpl` is hardcoded to write. To preserve `--dry-run`, I will maintain the `DRY_RUN` check before calling `Store` methods, or implement a lightweight wrapper. Given the "Small" estimate, I will use conditional execution around the `Store` calls.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/tools/seed-store.cjs` | Replace `fs` writes and config reading with `Store` facade calls. | Port to store facade for architectural consistency. |

## Plugin Impact Assessment

- **Version bump required?** Yes — this is a bug fix/enhancement to a tool, which is a material change. New version: 0.6.12.
- **Migration entry required?** No — no schema or state changes, just internal implementation change.
- **Security scan required?** Yes — any change to `forge/` requires a scan.
- **Schema change?** No.

## Testing Strategy

- Syntax check: `node --check forge/tools/seed-store.cjs`
- Store validation: `node forge/tools/validate-store.cjs --dry-run`
- Manual smoke test: Run `node forge/tools/seed-store.cjs --dry-run` to verify the dry-run output remains correct.

## Acceptance Criteria

- [ ] `forge/tools/seed-store.cjs` imports and uses `forge/tools/store.cjs`.
- [ ] Direct calls to `fs.writeFileSync` for store entities are replaced by `Store` facade methods.
- [ ] `--dry-run` flag still prevents actual filesystem writes to the store.
- [ ] `node --check` passes on `forge/tools/seed-store.cjs`.
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0.

## Operational Impact

- **Distribution:** No impact; users will receive the update via `/forge:update`.
- **Backwards compatibility:** Fully preserved; the tool's external CLI interface remains unchanged.
