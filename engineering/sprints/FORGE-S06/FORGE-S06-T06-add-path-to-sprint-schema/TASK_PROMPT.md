# FORGE-S06-T06: Add `path` field to sprint schema

**Sprint:** FORGE-S06
**Estimate:** S
**Pipeline:** default

---

## Objective

Add a required `path` field to the sprint schema, bringing parity with the task schema. This is the foundation for slug-named sprint directories (requirements 4a, 4b, 4c, 4d). This closes SPRINT_REQUIREMENTS item 4a.

## Acceptance Criteria

1. `forge/schemas/sprint.schema.json` includes a `path` field (type: string)
2. The embedded sprint schema in `forge/tools/validate-store.cjs` includes the `path` field
3. `validate-store` accepts sprint records with `path`; warns on sprints missing `path` (does not error — backward compatible)
4. `node --check forge/tools/validate-store.cjs` passes
5. `node forge/tools/validate-store.cjs --dry-run` exits 0

## Context

Tasks already have a `path` field (required). Sprints do not. Adding `path` to sprints enables:
- Slug-aware directory resolution (T07, T08, T09)
- Consistent path handling across sprint and task entities

The `path` field should be string type, not required initially (additive, nullable/optional). The `validate-store` should warn on missing `path` rather than error, for backward compatibility with existing stores.

**Schema changes needed:**

In `forge/schemas/sprint.schema.json`:
- Add `"path": { "type": "string" }` to properties
- Keep it optional (not in `required` array) for backward compat

In `forge/tools/validate-store.cjs`:
- Add `"path": { "type": "string" }` to the embedded `SCHEMAS.sprint` properties
- Add a validation check: if `path` is missing, emit a warning (not an error)

## Plugin Artifacts Involved

- `forge/schemas/sprint.schema.json`
- `forge/tools/validate-store.cjs` (embedded schema + optional warning)

## Operational Impact

- **Version bump:** required — schema change
- **Regeneration:** no user action needed (schemas are embedded in validate-store, not regenerated)
- **Security scan:** required