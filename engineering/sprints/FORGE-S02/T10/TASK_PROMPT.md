# FORGE-S02-T10: Release engineering — version bump to v0.6.0, migration entry, security scan

**Sprint:** FORGE-S02
**Estimate:** S
**Pipeline:** default

---

## Objective

Ship the FORGE-S02 changes as Forge v0.6.0. This task is the release gate:
it must not start until all other sprint tasks are committed. It bumps the
plugin version, adds a migration entry documenting the Feature tier and
required tool/workflow regeneration, runs the mandatory security scan, and
verifies a clean in-place upgrade path.

## Acceptance Criteria

1. `forge/.claude-plugin/plugin.json` version field set to `"0.6.0"`.
2. `forge/migrations.json` gains a new entry keyed `"0.5.9"` → version `"0.6.0"`:
   ```json
   {
     "version": "0.6.0",
     "date": "2026-04-{DD}",
     "notes": "FORGE-S02 — Foundational Concepts Documentation + Feature Tier: new Feature entity (feature.schema.json, .forge/store/features/), feature_id nullable field added to sprint and task schemas, collate generates engineering/features/ registry, validate-store enforces feature referential integrity, seed-store scaffolds features/ on init, sprint-intake/plan wired to feature linkage, /forge:health reports per-feature FEAT-ID test coverage, docs/concepts/ section added, default-workflows.md absorbed into concepts, README and vision synced.",
     "regenerate": ["tools", "workflows"],
     "breaking": false,
     "manual": []
   }
   ```
3. Security scan run per `CLAUDE.md` instructions. Scan report saved to
   `docs/security/scan-v0.6.0.md`.
4. `README.md` Security Scan History table gains the v0.6.0 row with a link
   to `docs/security/scan-v0.6.0.md`.
5. `/forge:update` upgrade test: run against a pristine clone of this repo.
   Existing stores without `features/` must continue to validate (backwards
   compatible baseline). No errors on `validate-store --dry-run` after upgrade.
6. `node --check` passes on all modified JS/CJS files.
7. `node forge/tools/validate-store.cjs --dry-run` exits 0 in the Forge repo.

## Context

- This task must start **only after** T01–T09 are all committed.
- The migration `regenerate: ["tools", "workflows"]` instructs `/forge:update`
  to re-copy both tool files and meta-workflows into the project. This is
  required because both `forge/tools/*.cjs` (T04–T06) and
  `forge/meta/workflows/*.md` (T07) changed.
- The migration `manual: []` — no manual steps required for end users; the
  `features/` directory is automatically created by `/forge:update` if absent
  (handled by seed-store changes in T04 and the update command's seeding step).
- Version target is `0.6.0`. The sprint requirements named v1.0.0 as the
  aspirational candidate, but the actual number is decided at commit time.
  v0.6.0 is the resolved target for this sprint.
- Reference `CLAUDE.md` for the exact security scan procedure.

## Plugin Artifacts Involved

- **[MODIFY]** `forge/.claude-plugin/plugin.json` — version `0.6.0`
- **[MODIFY]** `forge/migrations.json` — new `"0.5.9"` entry
- **[NEW]** `docs/security/scan-v0.6.0.md` — security scan report
- **[MODIFY]** `README.md` — Security Scan History row for v0.6.0

## Operational Impact

- **Version bump:** Required — `0.5.9 → 0.6.0`.
- **Regeneration:** Users MUST run `/forge:update` — both tools and workflows changed.
  Migration notes say so explicitly.
- **Security scan:** Required — run per CLAUDE.md. Report committed before push.
