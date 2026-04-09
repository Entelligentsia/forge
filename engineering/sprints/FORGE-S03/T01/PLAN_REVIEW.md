# PLAN REVIEW — FORGE-S03-T01: Eliminate tools regenerate target and embed store schemas

🌿 *Forge Supervisor*

**Task:** FORGE-S03-T01

---

**Verdict:** Approved

---

## Review Summary

The revised plan (iteration 2) correctly incorporates the required change: `forge/init/generation/generate-tools.md` is now listed in Files to Modify with a precise description of what to change (remove Step 2, retain Steps 1 and 3). All task prompt acceptance criteria are now covered. The embedded-schema approach is sound, the testing strategy is adequate, and the security and plugin-impact assessments are consistent with the task spec.

## Feasibility

All files are correctly identified. The embed approach using the JSON Schema blocks from `forge/meta/store-schema/*.md` as source is accurate. The `feature.schema.md` gap (no existing JSON Schema block in markdown) is correctly identified and addressed by sourcing from `forge/schemas/feature.schema.json`.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes — deferred to T03 per task spec.
- **Migration entry targets correct?** Yes — deferred to T03.
- **Security scan requirement acknowledged?** Yes — deferred to T03 per explicit task prompt instruction.

## Security

No prompt injection risk. All Markdown edits are removals or rewrites of neutral documentation text. The embedded schemas are static literal objects — no external input or dynamic construction. No data exfiltration risk.

## Architecture Alignment

- Built-ins only: no new `require()` calls planned.
- `additionalProperties: false`: no schema shape changes; the embedded schemas preserve this.
- Paths from config: `validate-store.cjs` continues to read `.forge/config.json` for `paths.store`.

## Testing Strategy

`node --check` + `validate-store --dry-run` + full `validate-store` run is adequate for this change. The optional smoke test (renaming `.forge/schemas/`) is a sound verification approach.

---

## Advisory Notes

1. When embedding schemas in `validate-store.cjs`, verify that the `feature.schema.json` block matches what is in the actual `forge/schemas/feature.schema.json` (not just the markdown). The markdown file currently has no `## JSON Schema` block, so sourcing from the JSON file directly is correct.
2. In `generate-tools.md`, the Outputs section currently lists `.forge/schemas/` — update it to remove that line and add a note that schema validation is embedded in `validate-store.cjs`.
3. The `FALLBACK` object in `validate-store.cjs` can remain as a dead-code safety net as the task notes — do not remove it, as it avoids crashes if the embedded `SCHEMAS` constant is ever accidentally trimmed in a future edit.
