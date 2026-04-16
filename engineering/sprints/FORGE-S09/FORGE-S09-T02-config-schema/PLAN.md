# PLAN — FORGE-S09-T02: Config schema — add calibrationBaseline + required-field annotations

🌱 *Forge Engineer*

**Task:** FORGE-S09-T02
**Sprint:** FORGE-S09
**Estimate:** S

---

## Objective

Extend `forge/sdlc-config.schema.json` to:

1. Define a `calibrationBaseline` property with four sub-fields required by the
   calibration (#34) feature: `lastCalibrated`, `version`, `masterIndexHash`,
   `sprintsCovered`.
2. Ensure `required` arrays at each nesting level correctly reflect fields that
   must be present after a complete init, so T03's incomplete-init guard can
   validate `.forge/config.json` completeness against the schema.

The `calibrationBaseline` object is written after Phase 5 (Generate Skills) during
`/forge:init` — not at discovery time — so it MUST NOT appear in the top-level
`required` array.

---

## Approach

Single-file change: edit `forge/sdlc-config.schema.json`.

Changes fall into two distinct groups:

### Group A — Add `calibrationBaseline` property

Add an optional `calibrationBaseline` object at the top level (not required).
Define its four sub-fields:

| Field | Type | Notes |
|---|---|---|
| `lastCalibrated` | `string`, format `date` | ISO date of last calibration |
| `version` | `string` | Plugin version at calibration time |
| `masterIndexHash` | `string` | SHA-256 hash of `MASTER_INDEX.md` semantic content |
| `sprintsCovered` | `array` of `string` | Sprint IDs covered at calibration time |

All four sub-fields are `required` within the `calibrationBaseline` object —
once the object is written, all fields must be present.

### Group B — Required-field annotation audit

The incomplete init guard (T03) validates `.forge/config.json` against the
`required` arrays in this schema. Audit every level:

| Path | Current `required` | Assessment |
|---|---|---|
| root | `["version","project","stack","commands","paths"]` | Correct — `pipeline`, `pipelines`, `installedSkills`, `sprint`, `calibrationBaseline` are all optional |
| `project` | `["prefix","name"]` | Correct — `description` is optional |
| `stack` | *(none)* | Correct — all fields are detected, any may be null |
| `commands` | `["test"]` | Correct — `build`, `lint`, `syntaxCheck`, `migrate`, `migrateCheck` are optional |
| `paths` | `["engineering","store","workflows","commands","templates"]` | Correct — `forgeRoot`, `customCommands` may be absent on fresh init before Phase 10 |
| `pipeline` | *(none)* | Correct — all pipeline settings are optional |
| `pipelines.*` | `["phases"]` | Correct |
| `pipelines.*.phases[]` | `["command","role"]` | Correct |

**Conclusion:** All existing `required` arrays are correctly annotated. No
changes to existing `required` arrays are needed. The only change is adding the
new `calibrationBaseline` property.

### Group C — `additionalProperties` gap (flagged for Supervisor)

The top-level schema object currently lacks `additionalProperties: false`.
The stack checklist mandates this to prevent schema drift. However, adding
it at the top level would be a **breaking change** for any existing
`.forge/config.json` that contains undocumented fields written by earlier
Forge versions (e.g., custom keys added via manage-config). 

**Decision for this task:** Do NOT add `additionalProperties: false` to the
top-level schema in this task. The sub-objects `stack`, `pipeline`, and `sprint`
also lack it. This is a separate hardening task (out of scope for T02).

The `calibrationBaseline` sub-object WILL have `additionalProperties: false`
since it is new and fully defined in this schema version.

> [?] Supervisor: confirm that adding `additionalProperties: false` to the
> existing top-level and sub-objects should be deferred to a separate hardening
> task, not bundled here.

---

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/sdlc-config.schema.json` | Add `calibrationBaseline` property with sub-fields; add `additionalProperties: false` to the new sub-object | Defines the type and structure T03 and T04 depend on |

**No other files require modification.** Specifically:
- No JS/CJS tool files change (validate-store.cjs uses embedded schemas, not this file directly at runtime)
- No command or workflow files change
- No migration entry in this task — deferred to T09

---

## Plugin Impact Assessment

- **Version bump required?** Yes — schema change is material (affects all installed instances).
  **Deferred to T09** per sprint convention (final task owns version number decision).
  Expected new version: `0.9.4` (T09 will confirm).
- **Migration entry required?** Yes — `regenerate: ["tools"]` (users must run `/forge:update-tools`
  to get an updated schema copy in `.forge/schemas/`). Deferred to T09.
- **Security scan required?** Yes — any change to `forge/` requires a security scan.
  Deferred to T09.
- **Schema change?** Yes — `forge/sdlc-config.schema.json` (the source schema distributed
  to user projects).

---

## Verification Plan

1. **Schema self-consistency:** The modified schema must be valid JSON.
   ```bash
   node -e "JSON.parse(require('fs').readFileSync('forge/sdlc-config.schema.json','utf8')); console.log('valid JSON')"
   ```

2. **No JS files modified** — `node --check` is not applicable for this task (no `.js`/`.cjs` files touched).

3. **Store validation (dry-run):**
   ```bash
   node forge/tools/validate-store.cjs --dry-run
   ```
   Expected: exits 0. Note: `validate-store.cjs` validates store records (sprint, task, bug, event
   schemas), not `sdlc-config.schema.json` itself — this check is for regression only.

4. **Manual spot-check:** Confirm that the dogfooding `.forge/config.json` (which lacks
   `calibrationBaseline`) still validates correctly — `calibrationBaseline` is optional,
   so its absence must not cause validation failures.

5. **JSON Schema draft 2020-12 compliance:** The schema header declares
   `"$schema": "https://json-schema.org/draft/2020-12/schema"`. Verify all keywords used
   (`type`, `properties`, `required`, `items`, `format`, `description`,
   `additionalProperties`) are valid in draft 2020-12. They are — no experimental keywords
   used.

---

## Acceptance Criteria

- [ ] `forge/sdlc-config.schema.json` contains a `calibrationBaseline` property with
      sub-fields: `lastCalibrated` (string, format date), `version` (string),
      `masterIndexHash` (string), `sprintsCovered` (array of string)
- [ ] `calibrationBaseline` is NOT in the top-level `required` array
- [ ] All four `calibrationBaseline` sub-fields are in the object's own `required` array
- [ ] `calibrationBaseline` sub-object has `additionalProperties: false`
- [ ] The modified schema is valid JSON (node -e JSON.parse passes)
- [ ] All existing top-level and nested `required` arrays are correct (audit confirms no
      gaps or over-inclusions)
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0 (no regression)
- [ ] The dogfooding `.forge/config.json` (which lacks `calibrationBaseline`) remains
      schema-valid (calibrationBaseline is optional)

---

## Operational Impact

- **Distribution:** Users must run `/forge:update-tools` after upgrading to get the
  updated `sdlc-config.schema.json` in their project's `.forge/schemas/` directory.
  The migration entry (in T09) will include `regenerate: ["tools"]`.
- **Backwards compatibility:** Fully backward compatible. `calibrationBaseline` is
  optional — existing configs without it remain valid. No existing field is modified
  or removed.
- **T03 dependency:** T03 (init calibration baseline write + incomplete init guard)
  depends on this schema being in place before implementation.
- **T04 dependency:** T04 (health checks) uses the schema's `required` arrays to
  determine which fields to validate for config-completeness check.
