# PLAN — FORGE-S03-T01: Eliminate tools regenerate target and embed store schemas

🌱 *Forge Engineer*

**Task:** FORGE-S03-T01
**Sprint:** FORGE-S03
**Estimate:** M

---

## Objective

Remove the `tools` regeneration target from Forge entirely and make
`validate-store.cjs` self-contained by embedding all five JSON schemas
internally. The `tools` target was a misnomer — it only copied schema files to
`.forge/schemas/`. Tools ship with the plugin and never needed per-project
regeneration. After this task, `.forge/schemas/` is no longer a required
project artifact and the `missingSchemas` warning is gone.

## Approach

1. Embed all five schemas as a top-level `SCHEMAS` constant in
   `validate-store.cjs`, sourced from the `## JSON Schema` blocks in
   `forge/meta/store-schema/*.md`. Remove `loadSchema()`, `schemasPath`, the
   `schemas` object, and the `missingSchemas` warning block.
2. Remove Phase 8 from `forge/init/sdlc-init.md` (the init master orchestration
   that references Phase 8 — "Install Tools"). Add a one-line note in its place.
3. Remove the `tools` category section from `forge/commands/regenerate.md` and
   clean the arguments table.
4. Remove all references to `tools` as a regeneration target in
   `forge/commands/update.md` (Steps 2A, 4, 6).
5. Reframe the `## JSON Schema` sections in all five
   `forge/meta/store-schema/*.md` files — replace "emitted verbatim to
   `.forge/schemas/` during init" with "embedded in `validate-store.cjs`".

Note: `feature.schema.md` currently has no JSON Schema block in the markdown
file. The JSON schema lives only in `forge/schemas/feature.schema.json`. The
plan embeds that schema from the `.json` source file directly and adds the
canonical block to the markdown file.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/tools/validate-store.cjs` | Add `SCHEMAS` constant with all 5 embedded schemas; remove `loadSchema()`, `schemasPath`, `schemas` object, `missingSchemas` warning | Makes tool self-contained |
| `forge/init/sdlc-init.md` | Remove Phase 8 ("Install Tools") body; replace with one-line note; keep Phase 9 as-is | Schema copy orchestration step is obsolete |
| `forge/init/generation/generate-tools.md` | Remove Step 2 ("Copy schemas") and update Outputs section; retain Step 1 (record `paths.forgeRoot`) and Step 3 (verify) | This is the actual file that performs the schema copy — must be updated or init still copies schemas |
| `forge/commands/regenerate.md` | Remove `## Category: tools` section; remove `tools` row from arguments table; update Default section if it mentions tools | `tools` target no longer valid |
| `forge/commands/update.md` | Remove `tools` from Step 2A regeneration list, Step 4 dispatch, Step 6 summary | `tools` no longer a regeneration target |
| `forge/meta/store-schema/task.schema.md` | Reframe intro sentence in `## JSON Schema` section | No longer "emitted verbatim" |
| `forge/meta/store-schema/sprint.schema.md` | Reframe intro sentence in `## JSON Schema` section | No longer "emitted verbatim" |
| `forge/meta/store-schema/bug.schema.md` | Reframe intro sentence in `## JSON Schema` section | No longer "emitted verbatim" |
| `forge/meta/store-schema/event.schema.md` | Reframe intro sentence in `## JSON Schema` section | No longer "emitted verbatim" |
| `forge/meta/store-schema/feature.schema.md` | Add `## JSON Schema` section with canonical block; reframe intro | No canonical block existed |

## Plugin Impact Assessment

- **Version bump required?** No — deferred to T03 which covers the release.
- **Migration entry required?** No — deferred to T03.
- **Security scan required?** Yes — any `forge/` change requires a scan. Deferred to T03 per task spec.
- **Schema change?** No — no store schema fields are added or removed. The schemas are moved from `.forge/schemas/` files into the tool itself.

## Testing Strategy

- Syntax check: `node --check forge/tools/validate-store.cjs`
- Store validation: `node forge/tools/validate-store.cjs --dry-run` (validates this project's store with the embedded schemas, without needing `.forge/schemas/` present)
- Full run: `node forge/tools/validate-store.cjs` (should exit 0)
- Optional: rename `.forge/schemas/` temporarily and verify validate-store still exits 0

## Acceptance Criteria

- [ ] `validate-store.cjs` passes all validations without `.forge/schemas/` present — embedded schemas are complete
- [ ] `node --check forge/tools/validate-store.cjs` exits 0
- [ ] `node forge/tools/validate-store.cjs` on this repo exits 0
- [ ] `forge/init/sdlc-init.md` Phase 8 body removed; replaced with a one-line note
- [ ] `forge/commands/regenerate.md` has no `tools` category section and no `tools` row in the arguments table
- [ ] `forge/commands/update.md` has no references to `tools` as a regeneration target
- [ ] All five `forge/meta/store-schema/*.md` files no longer say "emitted verbatim to `.forge/schemas/` during init"
- [ ] `node --check` passes on all modified JS/CJS files

## Operational Impact

- **Distribution:** No user action needed — `validate-store.cjs` is a plugin-shipped tool. Users simply get the updated tool on their next plugin update.
- **Backwards compatibility:** Fully preserved. Users with `.forge/schemas/` present are unaffected (the tool no longer reads those files but doesn't delete them). Users without `.forge/schemas/` no longer see the "fallback" warning.
