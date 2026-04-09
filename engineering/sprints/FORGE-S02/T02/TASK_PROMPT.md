# FORGE-S02-T02: feature.schema.md — author Feature store-schema documentation

**Sprint:** FORGE-S02
**Estimate:** S
**Pipeline:** default

---

## Objective

Create `forge/meta/store-schema/feature.schema.md` — the human-readable
schema documentation for the new first-class Feature entity. This is the
source of truth that T03 (JSON schema), T01 (state diagram in feature.md),
and T07 (workflow wiring) all derive from. Write this first and freeze it
before those downstream tasks begin writing Feature-aware code.

## Acceptance Criteria

1. `forge/meta/store-schema/feature.schema.md` exists and defines:
   - `id` — string, format `FEAT-NNN`, required.
   - `title` — string, required.
   - `description` — string, optional.
   - `status` — enum: `draft | active | shipped | retired`, required.
   - `requirements[]` — array of strings (plain-text requirement lines), optional.
   - `sprints[]` — array of sprint IDs (back-refs), optional.
   - `tasks[]` — array of task IDs (back-refs), optional.
   - `created_at` — ISO date-time string, required.
   - `updated_at` — ISO date-time string, optional.
2. The document follows the format of existing `*.schema.md` files
   (`sprint.schema.md`, `task.schema.md`) in the same directory — field table,
   status enum description, relationship notes.
3. The document explicitly notes which fields are **required** vs **optional**,
   and states that `feature_id` on sprint/task manifests is nullable for
   backwards compatibility.
4. A `stateDiagram-v2` block is included covering: `draft → active`,
   `active → shipped`, `active → retired`, `shipped → retired`.
5. `node --check` passes on any JS modified (none expected for this task).

## Context

- Pattern reference: `forge/meta/store-schema/sprint.schema.md` and
  `task.schema.md` — match their heading structure and table format.
- Downstream consumers: T03 reads this to write `forge/schemas/feature.schema.json`;
  T01 reads this to write the `feature.md` state diagram; T07 reads this to
  understand what fields to populate during intake.
- Keep the schema minimal per the sprint constraint: only `id`, `title`,
  `description`, `status` are **required**. Everything else is optional.
  This reduces v1.1 breakage risk.

## Plugin Artifacts Involved

- **[NEW]** `forge/meta/store-schema/feature.schema.md`

## Operational Impact

- **Version bump:** Not required for this task — deferred to T10.
- **Regeneration:** No user action needed — schema documentation only, no
  generated files change at this step.
- **Security scan:** Required at T10 (covers all `forge/` changes). No scan
  needed for this individual task.
