# PLAN — FORGE-S04-T05: Port `estimate-usage.cjs` to store facade

🌱 *Forge Engineer*

**Task:** FORGE-S04-T05
**Sprint:** FORGE-S04
**Estimate:** S

---

## Objective

Replace all direct filesystem access and configuration reading in `forge/tools/estimate-usage.cjs` with calls to the `forge/tools/store.cjs` facade. This ensures that token estimation follows the centralized store abstraction and allows for potential future backend changes without modifying the tool's core logic.

## Approach

1. **Import Store Facade**: Replace `fs` and `path` imports (where used for store access) with the singleton `Store` from `forge/tools/store.cjs`.
2. **Replace Config Reading**: Remove `readConfig()` and replace the store path resolution with the facade's internal handling (or use the facade's methods which implicitly use the config).
3. **Replace File Listing**: Replace `fs.readdirSync(sprintEventsDir)` with `store.listEvents(sprintId)`.
4. **Replace JSON Reading**: Replace `readJson(filePath)` with `store.getEvent(id, sprintId)`.
5. **Replace File Writing**: Replace the atomic write logic (`writeFileSync` to `.tmp` then `renameSync`) with `store.writeEvent(sprintId, data)`.
6. **Refactor Main Loop**: Update the `processEventFile` and main loop to work with event objects rather than file paths.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/tools/estimate-usage.cjs` | Port to use `store.cjs` facade for all event CRUD operations. | Centralize data access via the store abstraction. |

## Plugin Impact Assessment

- **Version bump required?** Yes — Material change to a tool. New version: 0.6.12.
- **Migration entry required?** No — No schema changes or breaking API changes.
- **Security scan required?** Yes — Modification to `forge/` directory.
- **Schema change?** No.

## Testing Strategy

- Syntax check: `node --check forge/tools/estimate-usage.cjs`
- Store validation: `node forge/tools/validate-store.cjs --dry-run`
- Manual smoke test: Run `node forge/tools/estimate-usage.cjs --sprint FORGE-S01` on a test project to verify tokens are estimated and written back correctly.

## Acceptance Criteria

- [ ] `forge/tools/estimate-usage.cjs` no longer uses `fs` or `path` for accessing `.forge/store/events`.
- [ ] All event reads use `store.getEvent` or `store.listEvents`.
- [ ] All event writes use `store.writeEvent`.
- [ ] `node --check` passes on `forge/tools/estimate-usage.cjs`.
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0.

## Operational Impact

- **Distribution:** Users will need to run `/forge:update` to receive the updated tool.
- **Backwards compatibility:** Fully preserved.
