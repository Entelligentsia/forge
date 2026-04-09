# FORGE-S03-T01: Eliminate tools regenerate target and embed store schemas

**Sprint:** FORGE-S03
**Estimate:** M
**Pipeline:** default

---

## Objective

Remove the `tools` regeneration target entirely and make `validate-store.cjs`
self-contained by embedding full JSON schemas internally. The `tools` target
was always a misnomer — it only copied schema files to `.forge/schemas/`.
Tools ship with the plugin and have never needed per-project regeneration.
After this task, `.forge/schemas/` is no longer a required project artifact.

## Acceptance Criteria

1. `validate-store.cjs` passes all validations without `.forge/schemas/` present — the embedded schemas must be complete, not just the existing FALLBACK field lists.
2. `node --check forge/tools/validate-store.cjs` passes.
3. `node forge/tools/validate-store.cjs` on this repo exits 0.
4. `forge/commands/init.md` no longer references Phase 8 or `.forge/schemas/` generation.
5. `forge/commands/regenerate.md` has no `tools` category section.
6. `forge/commands/update.md` has no references to `tools` as a regeneration target.
7. All five `forge/meta/store-schema/*.md` files no longer say "emitted verbatim to `.forge/schemas/` during init" — they are framed as design documents.

## Implementation Notes

### validate-store.cjs

The current tool has two mechanisms:
1. `loadSchema()` — reads `.forge/schemas/<name>.schema.json` and returns parsed JSON, or null on failure
2. `FALLBACK` object — field lists used when schemas are missing

Replace both with a single embedded schema object. Source the canonical JSON schema blocks directly from `forge/meta/store-schema/*.md` (the `## JSON Schema` code block in each file). These are the complete JSON Schema definitions including all fields, enums, and `additionalProperties: false`.

The `validateRecord(record, schema, fallback)` function already handles both paths. With embedded schemas, the `schema` argument is always present — the `fallback` path becomes dead code but can remain as a safety net.

Remove:
- `loadSchema()` function
- `schemasPath` variable  
- The `schemas` object that loads from disk
- The `missingSchemas` warning block
- The `"Using fallback required-field lists"` warning message

The embedded schemas object should be named `SCHEMAS` and defined near the top of the file, after the existing constants.

### init.md

Find Phase 8 — it copies `$FORGE_ROOT/meta/store-schema/*.json` (or similar) to `.forge/schemas/`. Remove it entirely. Add a one-line note where Phase 8 was:

> Schema validation is handled internally by `validate-store.cjs` — no schema files are copied to the project.

Renumber subsequent phases if needed.

### regenerate.md

Remove the entire `## Category: tools — refresh schemas only` section. Update the arguments table to remove the `tools` row. Update the `## Default (no argument)` section if it mentions tools.

### update.md

Search for every mention of `tools` as a regeneration target:
- Step 2A "After install, Forge will regenerate" list
- Step 4 dispatch table / descriptions
- Step 6 summary

Remove or replace with accurate language. Do not remove structural references to the `tools/` directory (those are about invoking the packaged tools, not the regeneration target).

### forge/meta/store-schema/*.md

For each of the five files (`task.schema.md`, `sprint.schema.md`, `bug.schema.md`, `event.schema.md`, `feature.schema.md`):

1. Remove or rewrite the sentence that says the JSON block is "emitted verbatim to `.forge/schemas/` during init (Phase 8)".
2. Replace with: "This block is the canonical machine-readable definition embedded in `validate-store.cjs`."
3. Do not remove the JSON Schema block itself — it remains as the authoritative reference.

## Plugin Artifacts Modified

- `forge/tools/validate-store.cjs`
- `forge/commands/init.md`
- `forge/commands/regenerate.md`
- `forge/commands/update.md`
- `forge/meta/store-schema/task.schema.md`
- `forge/meta/store-schema/sprint.schema.md`
- `forge/meta/store-schema/bug.schema.md`
- `forge/meta/store-schema/event.schema.md`
- `forge/meta/store-schema/feature.schema.md`

## Operational Impact

- **Version bump:** Deferred to T03.
- **Regeneration:** None required for users. The tool change is internal to the plugin.
- **Security scan:** Deferred to T03.
