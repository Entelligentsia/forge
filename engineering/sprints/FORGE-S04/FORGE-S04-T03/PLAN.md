# Plan: Port `collate.cjs` to store facade

## Context
The `collate.cjs` tool is responsible for regenerating the engineering knowledge base (MASTER_INDEX.md, feature pages, and sprint COST_REPORT.md) from the JSON store. Currently, it uses raw `fs` and `path` calls to read and write JSON files, which violates the goal of the Store Abstraction Layer (FORGE-S04).

## Objectives
Port all store interactions in `forge/tools/collate.cjs` to the `forge/tools/store.cjs` facade.

## Proposed Changes

### 1. Integration of Store Facade
- Remove `readConfig`, `readJson`, and `listJson` helper functions.
- Import the `store` singleton from `../tools/store.cjs`.

### 2. Logic Porting
- **Sprints:** Replace `listJson(path.join(storeRoot, 'sprints'))` with `store.listSprints()`.
- **Tasks:** Replace `listJson(path.join(storeRoot, 'tasks'))` with `store.listTasks()`.
- **Bugs:** Replace `listJson(path.join(storeRoot, 'bugs'))` with `store.listBugs()`.
- **Features:** Replace `listJson(path.join(storeRoot, 'features'))` with `store.listFeatures()`.
- **Events:** Replace `loadSprintEvents(sprintId)` (which uses `fs.readdirSync` and `readJson`) with `store.listEvents(sprintId)`.
- **State:** Replace `writeFile(path.join(storeRoot, 'COLLATION_STATE.json'), ...)` with a generic file write (since `COLLATION_STATE.json` is not a core entity managed by the facade) or determine if it should be a first-class entity. *Decision: Keep as raw file write for now as it's a tool-specific state file, not a core entity.*

### 3. Path Resolution
- The store facade handles the base store path via `config.json`. `collate.cjs` will continue to use `config.paths.engineering` for the output markdown files, as the store facade only manages the `.forge/store` directory.

## Verification Plan
- Run `node forge/tools/collate.cjs --dry-run` to verify no crashes.
- Run `node forge/tools/collate.cjs` and compare `MASTER_INDEX.md` and `COST_REPORT.md` with previous versions to ensure no regressions in data collation.
- Run `node --check forge/tools/collate.cjs` for syntax validation.
