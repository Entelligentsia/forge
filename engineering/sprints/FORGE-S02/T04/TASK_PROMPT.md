# FORGE-S02-T04: seed-store.cjs — scaffold features/ directory on init

**Sprint:** FORGE-S02
**Estimate:** S
**Pipeline:** default

---

## Objective

Update `forge/tools/seed-store.cjs` to scaffold a `.forge/store/features/`
directory (and an empty `.gitkeep`) when `/forge:init` seeds a new project
store. Projects that have already been seeded should be handled gracefully —
the Forge update flow will create the directory if absent.

## Acceptance Criteria

1. `forge/tools/seed-store.cjs` creates `.forge/store/features/` (with `.gitkeep`)
   in the target project during initial seeding, alongside the existing
   `sprints/`, `tasks/`, `bugs/`, `events/` directories.
2. If `.forge/store/features/` already exists (upgrade scenario), the tool
   exits without error and without overwriting existing content.
3. `node --check forge/tools/seed-store.cjs` passes.
4. `node forge/tools/validate-store.cjs --dry-run` exits 0 against the
   existing store (no regressions).
5. A top-level exception handler is present (propagates the existing
   graceful-error pattern from other tools in the same file).

## Context

- Depends on T03 (the schema definition establishes what the `features/`
  directory will hold).
- Pattern reference: look at how `seed-store.cjs` currently creates
  `sprints/`, `tasks/`, `bugs/`, `events/` — add `features/` in the same
  place and with the same `.gitkeep` convention.
- The Forge project itself uses this tool for dogfooding — after T04 ships,
  running `node forge/tools/seed-store.cjs` in a fresh clone should create
  `.forge/store/features/`.

## Plugin Artifacts Involved

- **[MODIFY]** `forge/tools/seed-store.cjs`

## Operational Impact

- **Version bump:** Not required for this task — deferred to T10.
- **Regeneration:** No user action needed for seed-store logic change —
  the directory is only created on first init or via `/forge:update`.
- **Security scan:** Required at T10 (covers all `forge/` changes).
