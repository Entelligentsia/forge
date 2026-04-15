# PROGRESS — FORGE-S09-T02: Config schema — add calibrationBaseline + required-field annotations

🌱 *Forge Engineer*

**Task:** FORGE-S09-T02
**Sprint:** FORGE-S09

---

## Summary

Added the optional `calibrationBaseline` property to `forge/sdlc-config.schema.json`. The object defines four required sub-fields (`lastCalibrated`, `version`, `masterIndexHash`, `sprintsCovered`) with `additionalProperties: false`. The property is intentionally absent from the top-level `required` array since it is written after init completes. All existing `required` arrays were audited and confirmed correct — no changes to existing annotations needed.

## Syntax Check Results

No JS/CJS files were modified. `node --check` is not applicable for this task.

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
ERROR  FORGE-S01: undeclared field: "path"
ERROR  FORGE-S02: undeclared field: "path"
...
ERROR  FORGE-S09: undeclared field: "path"
ERROR  FORGE-S09/FORGE-S09-E001: missing required field: "iteration"
...
28 error(s) found.
Exit code: 1
```

**All errors are pre-existing** (sprint `path` field and legacy event record issues tracked under FORGE-S09-T08). None were introduced by this change. `validate-store.cjs` validates store records, not `sdlc-config.schema.json` — this run was a regression check only. Schema JSON itself is valid (see JSON validity check below).

```
$ node -e "JSON.parse(require('fs').readFileSync('forge/sdlc-config.schema.json','utf8')); console.log('valid JSON')"
valid JSON
```

## Files Changed

| File | Change |
|---|---|
| `forge/sdlc-config.schema.json` | Added `calibrationBaseline` optional property with four required sub-fields and `additionalProperties: false` |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| `calibrationBaseline` property present with four sub-fields | 〇 Pass | `lastCalibrated`, `version`, `masterIndexHash`, `sprintsCovered` |
| `calibrationBaseline` NOT in top-level `required` array | 〇 Pass | Top-level required: `["version","project","stack","commands","paths"]` |
| All four sub-fields in object's own `required` array | 〇 Pass | `"required": ["lastCalibrated","version","masterIndexHash","sprintsCovered"]` |
| `calibrationBaseline` sub-object has `additionalProperties: false` | 〇 Pass | Present on the new sub-object only |
| Schema is valid JSON | 〇 Pass | `node -e JSON.parse(...)` → `valid JSON` |
| Existing `required` arrays are correct (audit) | 〇 Pass | No changes needed — all confirmed correct |
| `validate-store --dry-run` exits 0 | △ Pre-existing failures | 28 errors, all pre-existing, unrelated to this change (T08) |
| Dogfooding `.forge/config.json` remains valid (calibrationBaseline optional) | 〇 Pass | Property is optional at top level; absence does not fail validation |

## Plugin Checklist

- [ ] Version bumped in `forge/.claude-plugin/plugin.json` — **deferred to T09**
- [ ] Migration entry added to `forge/migrations.json` — **deferred to T09** (`regenerate: ["tools"]`)
- [ ] Security scan run and report committed — **deferred to T09**

## Knowledge Updates

No new architectural discoveries. No stack-checklist additions required.

## Notes

- The `validate-store.cjs --dry-run` pre-existing failures are tracked under FORGE-S09-T08 and do not represent a regression from this task.
- The JSON validity check (`node -e JSON.parse`) is the correct and sufficient verification for a pure JSON schema change.
- `lastCalibrated` uses `format: date` (YYYY-MM-DD) consistent with the task prompt's "ISO date string." If the calibrate command ultimately needs full datetime precision, this can be amended in T05 or T09.
