# PLAN — FORGE-S02-T06: collate.cjs — generate engineering/features/INDEX.md and cross-link from MASTER_INDEX.md

🌱 *Forge Engineer*

**Task:** FORGE-S02-T06
**Sprint:** FORGE-S02
**Estimate:** M

---

## Objective

Extend `forge/tools/collate.cjs` to aggregate JSON data from `.forge/store/features/`, produce a feature registry index, and generate individual markdown pages per feature. Finally, link this index in the MASTER_INDEX.md.

## Approach

Update `collate.cjs`. We will add a feature data loading step, map through the store files, output `engineering/features/INDEX.md` and feature-specific files, and adjust the MASTER_INDEX.md generation block to include the Feature Registry.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/tools/collate.cjs` | Add feature loading and markdown export | Meet task acceptance criteria |

## Plugin Impact Assessment

- **Version bump required?** No — Deferred to T10 as per task prompt.
- **Migration entry required?** No
- **Security scan required?** No — Deferred to T10.
- **Schema change?** No

## Verification Plan

- `node --check forge/tools/collate.cjs`
- `node forge/tools/collate.cjs` handles missing folder and valid folder correctly.
