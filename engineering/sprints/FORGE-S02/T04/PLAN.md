# PLAN — FORGE-S02-T04: seed-store.cjs — scaffold features/ directory on init

🌱 *Forge Engineer*

**Task:** FORGE-S02-T04
**Sprint:** FORGE-S02
**Estimate:** S

---

## Objective

This plan details how to update `seed-store.cjs` to scaffold the `features/` directory (both in `engineering/features` and implicitly `.forge/store/features` if necessary) when the command is run. This fulfills the requirement to prepare the directory structure for the new Feature Tier introduced in Sprint 2.

## Approach

1.  **Update `seed-store.cjs`:** Add logic to create the `engineering/features` directory if it does not already exist, similar to how we might expect directories to be guaranteed. Since `seed-store.cjs` currently only *reads* `sprints` and `bugs` directories without creating them, we will add an explicit scaffolding section at the beginning (or before we process other items) that creates the `features` directory under `engPath` (and optionally `storePath/features`).
2.  **No JSON seeding yet:** The task only requires scaffolding the directory. Seed-store currently reads markdown from `sprints/` and `bugs/` to create JSON. For features, we will just create the directory as requested.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/tools/seed-store.cjs` | Add `fs.mkdirSync(path.join(cwd, engPath, 'features'), { recursive: true });` | Ensures the feature directory is scaffolded natively on project initialization when `seed-store` runs. |

## Plugin Impact Assessment

- **Version bump required?** Yes — `v0.5.x` to represent the addition of Feature scaffolding logic (although task S02-T10 handles exact version bumping for the Sprint. We will flag it as material).
- **Migration entry required?** Yes — For existing projects, running `seed-store.cjs` will scaffold the `features` directory.
- **Security scan required?** Yes — Modifies a file in `forge/`.
- **Schema change?** No — Schemas were handled in T03.

## Testing Strategy

- Syntax check: `node --check forge/tools/seed-store.cjs`
- Store validation: `node forge/tools/validate-store.cjs --dry-run`
- Manual smoke test: Run `node forge/tools/seed-store.cjs` and verify `engineering/features/` is created.

## Acceptance Criteria

- [ ] `forge/tools/seed-store.cjs` creates the `engineering/features` directory if it does not exist.
- [ ] `node --check forge/tools/seed-store.cjs` passes.
- [ ] Running the script locally actually creates the directory (or acts appropriately in dry-run mode).

## Operational Impact

- **Distribution:** Will require users to get the updated tool.
- **Backwards compatibility:** Yes, it simply creates a directory if missing.
