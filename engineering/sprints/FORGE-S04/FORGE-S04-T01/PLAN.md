# PLAN — FORGE-S04-T01: Implement `forge/tools/store.cjs` facade

🌱 *Forge Engineer*

**Task:** FORGE-S04-T01
**Sprint:** FORGE-S04
**Estimate:** M

---

## Objective

Implement `forge/tools/store.cjs`, a backend-agnostic store interface and `FSImpl` (filesystem implementation). This facade will provide standardized CRUD operations for the five core store entities (Sprint, Task, Bug, Event, Feature), eliminating direct `fs` calls in tooling and enabling future backend flexibility.

## Approach

I will implement a `Store` class that defines the interface and a `FSImpl` class that implements the current JSON flat-file logic. The `Store` instance will be exported as the primary entry point.

**Core Interface Requirements:**
For each entity (Sprint, Task, Bug, Event, Feature), the following methods will be implemented:
- `get{Entity}(id)`: Retrieve a single record.
- `list{Entities}(filter?)`: List all records, optionally filtered.
- `write{Entity}(data)`: Create or update a record.
- `delete{Entity}(id)`: Remove a record.

**Implementation Details (`FSImpl`):**
- **Path Resolution:** Read `.forge/config.json` to resolve the `store` path.
- **Entity Mapping:** Map entities to their respective subdirectories (e.g., `Sprints` → `.forge/store/sprints/`).
- **File Operations:** Use `fs.readFileSync` and `fs.writeFileSync` with `JSON.stringify(data, null, 2) + '\n'` to maintain current file shapes.
- **Event Handling:** Events are stored in `{SPRINT_ID}` subdirectories. `writeEvent` will require the `sprintId` to determine the correct folder.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/tools/store.cjs` | Create new file | Implement the Store facade and FS implementation. |

## Plugin Impact Assessment

- **Version bump required?** Yes — introduces a new core tool distributed to users. New version: `0.6.13`.
- **Migration entry required?** Yes — users must run `/forge:update` to receive the new tool. `regenerate: ["tools"]`.
- **Security scan required?** Yes — any change to `forge/` requires a scan.
- **Schema change?** No — the facade manages existing schemas.

## Testing Strategy

- Syntax check: `node --check forge/tools/store.cjs`
- Functional validation: Since this is a backend facade, I will verify it by calling the methods within the `implement` phase before finalizing.
- Store integrity: `node forge/tools/validate-store.cjs --dry-run` to ensure no existing data is corrupted.

## Acceptance Criteria

- [ ] `node --check forge/tools/store.cjs` passes.
- [ ] All five entities (Sprint, Task, Bug, Event, Feature) support `get`, `list`, `write`, and `delete`.
- [ ] `FSImpl` reads/writes the same `.forge/store/` paths and file shapes as current tools.
- [ ] No new npm dependencies — Node.js built-ins only.
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0.

## Operational Impact

- **Distribution:** Users will need to run `/forge:update` to receive the new `store.cjs` tool.
- **Backwards compatibility:** Fully preserved. The `FSImpl` is designed to be transparently compatible with existing JSON store records.
