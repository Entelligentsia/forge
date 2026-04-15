# PLAN REVIEW — FORGE-S09-T02: Config schema — add calibrationBaseline + required-field annotations

🌿 *Forge Supervisor*

**Task:** FORGE-S09-T02

---

**Verdict:** Approved

---

## Review Summary

The plan is narrow, correct, and well-reasoned. A single JSON file is modified; the optionality of `calibrationBaseline` at the top level is correctly handled; all four sub-fields are required within the object; and the deference of version bump, migration entry, and security scan to T09 follows the established sprint convention. No JS, no npm, no hook changes — verification requirements are correctly scoped.

## Feasibility

Approach is realistic and correctly scoped for an S estimate. `forge/sdlc-config.schema.json` is the right artifact — it is the source config schema, distinct from the store schemas in `forge/schemas/`. The required-field audit (Group B) is correct when cross-referenced against the actual schema on disk. Scope is appropriate for one task.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes — deferred to T09 per sprint convention. Material change (schema change to config schema).
- **Migration entry targets correct?** Yes — `regenerate: ["tools"]` is correct; users need the updated schema copy in `.forge/schemas/`.
- **Security scan requirement acknowledged?** Yes — explicitly stated, deferred to T09.

## Security

Pure JSON addition to a schema file. No Markdown command/workflow files touched, no executable code introduced, no external network access, no credential patterns. No prompt injection risk. No security concerns for this change.

## Architecture Alignment

- No npm dependencies. No `require()` calls. Pure JSON. ✓
- `additionalProperties: false` added only to the new `calibrationBaseline` sub-object — correct. Existing top-level and sub-objects already lack it; not adding it is not a regression. ✓
- No hardcoded paths introduced. ✓
- No hooks or tools modified. ✓
- The Group C decision (defer top-level `additionalProperties: false` hardening) is correct — adding it to objects with potentially undocumented legacy fields would be a breaking change.

## Testing Strategy

- JSON validity: `node -e JSON.parse(...)` — adequate for a pure JSON change. ✓
- `validate-store --dry-run` included for regression coverage. ✓
- Manual spot-check of dogfooding `.forge/config.json` described (confirms optionality). ✓
- `node --check` correctly excluded — no JS/CJS files modified. ✓

---

## If Approved

### Advisory Notes

1. **`lastCalibrated` format:** The plan uses `format: date` (`YYYY-MM-DD`). The task prompt says "ISO date string" which is consistent. If the calibration feature (#34) ultimately records a full datetime, the field type could be amended in T09 or the calibrate command task. Non-blocking for this task.

2. **`masterIndexHash` description:** Consider adding a `"minLength": 64` constraint to the `masterIndexHash` field to make the SHA-256 contract explicit in the schema. Advisory only — the plan does not require this and it can be added when the calibration feature is built.

3. **`sprintsCovered` items:** Consider adding `"minItems": 0` or a `"uniqueItems": true` constraint to `sprintsCovered` to prevent duplicate sprint IDs. Advisory only.

These are non-blocking observations. The implementation should proceed exactly as planned.
