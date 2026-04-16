# CODE REVIEW — FORGE-S09-T02: Config schema — add calibrationBaseline + required-field annotations

🌿 *Forge Supervisor*

**Task:** FORGE-S09-T02

---

**Verdict:** Approved

---

## Review Summary

The implementation is a single, clean addition to `forge/sdlc-config.schema.json`. All four acceptance criteria sub-fields are present with correct types, the object's internal `required` array is complete, `additionalProperties: false` is correctly applied to the new sub-object only, and the schema is valid JSON. The dogfooding `.forge/config.json` (which lacks `calibrationBaseline`) satisfies all top-level `required` fields — the optionality is correctly implemented. Every claim in PROGRESS.md was independently verified.

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | N/A | Pure JSON schema — no `require()` calls |
| Hook exit discipline (exit 0 on error) | N/A | No hook files modified |
| Tool top-level try/catch + exit 1 on error | N/A | No tool files modified |
| `--dry-run` supported where writes occur | N/A | No writes in this change |
| Reads `.forge/config.json` for paths (no hardcoded paths) | N/A | Pure JSON, no path references |
| Version bumped if material change | △ Deferred to T09 | Plan-approved sprint convention — T09 owns version bump + migration |
| Migration entry present and correct | △ Deferred to T09 | `regenerate: ["tools"]` confirmed correct; T09 writes the entry |
| Security scan report committed | △ Deferred to T09 | `docs/security/scan-v0.9.3.md` exists for current version; T09 runs scan at new version |
| `additionalProperties: false` preserved in schemas | 〇 Pass | New `calibrationBaseline` sub-object has `additionalProperties: false`; existing top-level objects unchanged (not a regression — Group C hardening deferred per plan) |
| `node --check` passes on modified JS/CJS files | N/A | No JS/CJS files modified |
| `validate-store --dry-run` exits 0 | △ Pre-existing | 28 errors confirmed pre-existing — independently ran and matched PROGRESS.md output exactly. All are `path` field / legacy event issues tracked under T08 |
| No prompt injection in modified Markdown files | N/A | Only `forge/sdlc-config.schema.json` (JSON) modified |

## Independent Verification Results

```
# JSON validity (independently run):
$ node -e "JSON.parse(require('fs').readFileSync('forge/sdlc-config.schema.json','utf8')); console.log('valid JSON')"
valid JSON

# Sub-field check (independently run):
calibrationBaseline present: true
type: object
sub-fields: [ 'lastCalibrated', 'version', 'masterIndexHash', 'sprintsCovered' ]
top-level required: [ 'version', 'project', 'stack', 'commands', 'paths' ]
calibrationBaseline NOT in required: true
calibrationBaseline required: [ 'lastCalibrated', 'version', 'masterIndexHash', 'sprintsCovered' ]
additionalProperties: false: true
lastCalibrated format: date
sprintsCovered type: array  items type: string

# Dogfooding config check (independently run):
Top-level required fields: [ 'version', 'project', 'stack', 'commands', 'paths' ]
Missing from config: none — config is valid
calibrationBaseline in config: false

# Keywords used in calibrationBaseline (all valid draft 2020-12):
type, description, required, additionalProperties, properties, format, items
Unknown/potentially invalid keywords: none

# validate-store (independently run — 28 errors, all pre-existing):
EXIT CODE 1, 28 errors matching PROGRESS.md description exactly
```

## Issues Found

None. All acceptance criteria pass independently.

---

## If Approved

### Advisory Notes

1. **`masterIndexHash` minLength:** The plan review (Supervisor) noted that adding `"minLength": 64` would make the SHA-256 contract explicit. Non-blocking — can be added in T05 or T09 when the calibration command is built and the exact hash format is confirmed.

2. **`sprintsCovered` uniqueItems:** The plan review noted `"uniqueItems": true` would prevent duplicate sprint IDs. Non-blocking — can be added in T05 when the calibration write logic is implemented.

3. **`lastCalibrated` format:** The field uses `format: date` (YYYY-MM-DD). If `/forge:calibrate` (T05) ultimately records full datetime precision, this may need amending to `format: date-time`. Monitor during T05 implementation.

4. **Security scan deferral is valid:** The plan-review Supervisor explicitly approved the T09 deferral of version bump and security scan. The change is pure JSON with no executable code, no Markdown instruction changes, and no hooks/tools — the risk profile is minimal. T09 must run the security scan before any push.
