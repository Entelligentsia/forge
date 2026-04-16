# Sprint Requirements — FORGE-S04

**Captured:** 2026-04-12
**Source:** sprint-intake interview

---

## Goals

1. Ship `forge/tools/store.cjs` — a backend-agnostic store interface + `FSImpl` — covering full CRUD and a planner-proposed utility set for all five store entities (Sprint, Task, Bug, Event, Feature).
2. Port all store-CRUDing tools through the facade so no tool retains direct `fs` calls on store paths.

## Feature

**FEAT-001** — Store Abstraction Layer

## In Scope

### `forge/tools/store.cjs` — interface + FSImpl [must-have]
Define and implement a clean store access module. Exports: full CRUD for Sprint, Task, Bug, Event, Feature; plus a planner-proposed utility set derived from what the ported tools actually need (e.g. filtered list methods, summary accessors). No backend-switching logic this sprint — FSImpl is the only implementation.

**Acceptance criteria:**
- `node --check forge/tools/store.cjs` passes
- All five entities have at minimum: `get{Entity}(id)`, `list{Entities}(filter?)`, `write{Entity}(data)`, `delete{Entity}(id)`
- FSImpl reads/writes the same `.forge/store/` paths and file shapes as today
- Utility methods are limited to those provably used by at least one ported tool
- No new npm dependencies — Node.js built-ins only

### Port `validate-store.cjs` through the facade [must-have]
Replace all direct `fs` reads/writes on store paths with facade calls. `--fix` mutations use facade write methods.

**Acceptance criteria:**
- `node --check forge/tools/validate-store.cjs` passes
- `validate-store` output is identical before and after the port (same validation results, same fix behaviour)
- No direct `fs.readFileSync` / `fs.writeFileSync` calls on `.forge/store/` paths remain

### Port `collate.cjs` through the facade [must-have]
Replace all direct store reads with facade calls. Collated markdown output unchanged.

**Acceptance criteria:**
- `node --check forge/tools/collate.cjs` passes
- Generated `engineering/` markdown files are byte-for-byte identical before and after the port

### Port `seed-store.cjs` through the facade [must-have]
Replace all direct store writes with facade calls.

**Acceptance criteria:**
- `node --check forge/tools/seed-store.cjs` passes
- Seeded store files match previous output exactly

### Port `estimate-usage.cjs` through the facade [must-have]
Replace all direct event file reads/writes with facade calls.

**Acceptance criteria:**
- `node --check forge/tools/estimate-usage.cjs` passes
- Token backfill output is identical before and after the port

### Version bump + security scan [must-have]
Bump `forge/.claude-plugin/plugin.json`, add `migrations.json` entry, run `/security-watchdog:scan-plugin`, save report to `docs/security/`.

**Acceptance criteria:**
- Version incremented from current (0.6.11)
- `migrations.json` entry includes `"regenerate": ["tools"]` (new tool distributed to users)
- Security scan report saved to `docs/security/scan-v{VERSION}.md`
- README Security table updated

## Out of Scope

- Any DB backend (SQLite, LevelDB, etc.) — FSImpl only this sprint
- `manage-config.cjs` — manages `.forge/config.json`, not store entities
- `generation-manifest.cjs` — SHA integrity tracking, not store entities
- Any CLI-visible behaviour changes — pure internal refactor
- New marketplace listing, CI/CD, test suite

## Nice-to-Have *(attempt if must-haves complete)*

- JSDoc comments on all exported interface methods

## Constraints

- **Plugin compatibility:** must not break users on 0.6.0+
- **Distribution:** changes to `forge/` require version bump and security scan
- **Dependencies:** Node.js built-ins only — no new npm packages
- **Store layout:** `.forge/store/` directory structure and file format unchanged
- **Interface shape:** clean separation — interface definition + FSImpl in `store.cjs`; backend switching deferred

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `validate-store.cjs` embeds schemas inline — most complex tool to port, facade boundary harder to draw | Medium | Treat as its own task; plan the porting boundary explicitly before implementation |
| Utility method scope creep — "imaginative" utils could expand design surface | Low | Planner caps util list to methods provably needed by ported tools |

## Carry-Over from FORGE-S03

None — all S03 carry-over items confirmed resolved before this sprint.
