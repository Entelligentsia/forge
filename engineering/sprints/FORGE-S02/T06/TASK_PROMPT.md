# FORGE-S02-T06: collate.cjs — generate engineering/features/INDEX.md and cross-link from MASTER_INDEX.md

**Sprint:** FORGE-S02
**Estimate:** M
**Pipeline:** default

---

## Objective

Extend `forge/tools/collate.cjs` to read `.forge/store/features/`, generate an
`engineering/features/INDEX.md` feature registry, and add a **Feature Registry**
section to the regenerated `engineering/MASTER_INDEX.md` that links into it.
Stores with no features produce an empty but valid registry — no errors.

## Acceptance Criteria

1. `collate.cjs` reads all `*.json` files in `.forge/store/features/` (if the
   directory exists; gracefully skips if absent).
2. Generates `engineering/features/INDEX.md` — a table with columns:
   `Feature ID`, `Title`, `Status`, `Sprints`, `Tasks`. Links each Feature ID
   to `engineering/features/<FEAT-ID>.md` (the per-feature mirror, see AC 3).
3. Generates a per-feature markdown mirror at `engineering/features/<FEAT-ID>.md`
   with the feature's full details (id, title, description, status,
   requirements list, linked sprints, linked tasks).
4. `engineering/MASTER_INDEX.md` gains a **Feature Registry** section that
   links to `engineering/features/INDEX.md` immediately after (or before) the
   Sprint Registry section.
5. Stores with zero features produce an `INDEX.md` with a "No features yet"
   note — no crash, no orphaned files.
6. `node --check forge/tools/collate.cjs` passes.
7. Running `node forge/tools/collate.cjs` in the Forge repo (which will have
   zero features initially) exits 0 and produces a valid `MASTER_INDEX.md`.
8. Top-level exception handler is present.

## Context

- Depends on T03 (JSON schemas define valid feature record structure).
- The Forge repo's `.forge/store/features/` directory will be created by T04
  (seed-store), but may not yet exist at test time — handle both cases.
- Pattern reference: study how `collate.cjs` currently generates
  `MASTER_INDEX.md` sprint/task sections and the `engineering/sprints/*/INDEX.md`
  pattern — apply the same consistent pattern for features.
- The MASTER_INDEX.md header note says "do not edit manually" — collate owns it.

## Plugin Artifacts Involved

- **[MODIFY]** `forge/tools/collate.cjs`

## Operational Impact

- **Version bump:** Not required for this task — deferred to T10.
- **Regeneration:** Users run `/forge:update` at T10; tools are regenerated
  then.
- **Security scan:** Required at T10 (covers all `forge/` changes).
