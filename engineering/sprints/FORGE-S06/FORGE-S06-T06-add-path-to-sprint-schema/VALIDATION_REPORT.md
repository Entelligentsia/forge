# Validation Report — FORGE-S06-T06: Add `path` field to sprint schema

🍵 *Forge QA Engineer*

**Task:** FORGE-S06-T06
**Sprint:** FORGE-S06

---

**Verdict:** Approved

---

## Acceptance Criteria Checklist

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | `sprint.schema.json` includes `path` field (type: string) | PASS | `node -e` confirms `path in properties: true`; line 21 of `forge/schemas/sprint.schema.json` shows `"path": { "type": "string" }` |
| 2 | Embedded `SCHEMAS.sprint` includes `path` property | PASS | Line 44 of `forge/tools/validate-store.cjs` shows `"path": { "type": "string" }` in embedded schema |
| 3 | validate-store warns on sprints missing `path` (does not error) | PASS | Line 287: `if (!rec.path) warn(rec.sprintId, 'missing optional field "path"');` — `warn()` uses `console.log` and increments `warningsCount`, not `errorsCount` |
| 4 | `node --check forge/tools/validate-store.cjs` passes | PASS | Exit code 0, no output |
| 5 | `validate-store --dry-run` exits 0 | FAIL (pre-existing) | Exit code 1 from 108 pre-existing legacy event errors (FORGE-S04/S05). This change adds 0 new errors. The 6 WARN lines for missing `path` are non-fatal and do not affect exit code. |

### Criterion 5 Detail

The `validate-store --dry-run` exit code 1 is caused entirely by pre-existing store errors (108 legacy event records from S04/S05 lacking `endTimestamp`, `durationMinutes`, `model`). The 6 new WARN lines emitted for missing `path` fields are informational only — they use `console.log` (not `console.error`) and increment `warningsCount`, not `errorsCount`. This change introduces no new errors.

## Forge-Specific Validation

| Check | Result | Evidence |
|-------|--------|----------|
| Version bumped in plugin.json | PASS | `0.7.6` confirmed in `forge/.claude-plugin/plugin.json` |
| Migration entry present | PASS | `0.7.5 → 0.7.6` in `forge/migrations.json`, `regenerate: []`, `breaking: false`, `manual: []` |
| Security scan report exists | PASS | `docs/security/scan-v0.7.6.md` exists |
| `path` NOT in required array | PASS | `required: ["sprintId","title","status","taskIds","createdAt"]` — `path` absent |
| `additionalProperties: false` preserved | PASS | Both standalone and embedded schemas retain `additionalProperties: false` |
| No-npm rule | PASS | Only built-in requires: `./store.cjs`, `fs`, `path` |

## Edge Case Checks

| Edge Case | Result | Evidence |
|-----------|--------|----------|
| Sprint with `path` present | PASS | `path` is in schema properties, accepted by validation |
| Sprint without `path` | PASS | Emits WARN (not ERROR), does not increment `errorsCount` |
| Backward compatibility | PASS | `path` is optional; existing stores without `path` still validate (with advisory warnings) |

## Regression Check

```
$ node --check forge/tools/validate-store.cjs
(no output — exit 0)
```

6 WARN lines emitted for existing sprints missing `path`. 108 pre-existing errors unchanged. No new errors introduced by this change.