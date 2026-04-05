# PLAN REVIEW — FORGE-S01-T01: Event schema — add optional token fields

**Reviewer:** Supervisor
**Task:** FORGE-S01-T01

---

**Verdict:** Approved

---

## Review Summary

The plan is accurate, well-scoped, and technically sound. It correctly identifies both schema files that require modification (canonical `forge/schemas/` and local mirror `.forge/schemas/`), uses appropriate JSON Schema types for each field, and explicitly preserves `"additionalProperties": false`. The scope is appropriate for an S estimate — this is a pure property-addition with no behavioural changes.

## Feasibility

The approach is realistic. Both files are the correct targets. Adding five optional properties to an existing `properties` object is a minimal, low-risk change. The plan correctly defers version bump and migration entry to T08, consistent with the task prompt's explicit instruction. Backward compatibility is fully preserved because none of the new fields are added to `required`.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes — explicitly deferred to T08 per task prompt instructions
- **Migration entry targets correct?** Yes — `regenerate: ["tools"]` is correct; users need `/forge:update-tools` to receive the updated schema
- **Security scan requirement acknowledged?** Yes — bundled in T08 (schema-only change with zero executable risk, but the process is followed)

## Security

No executable code is modified. JSON Schema files cannot contain prompt injection or data exfiltration vectors. The change adds five read-only type definitions with `minimum: 0` constraints. Risk is effectively zero.

## Architecture Alignment

- Follows existing schema conventions: `durationMinutes` uses `"type": "number", "minimum": 0` — identical pattern to `estimatedCostUSD`; integer token fields follow `"type": "integer", "minimum": 1` pattern (adjusted to 0 as appropriate for optional token counts)
- `"additionalProperties": false` explicitly preserved — no schema drift
- No path hardcoding (JSON schema file, not applicable)

## Testing Strategy

Testing strategy is adequate:
- `node --check` correctly identified as N/A for JSON files
- `validate-store.cjs --dry-run` is explicitly required and sufficient to confirm existing event records remain valid

---

## If Approved

### Advisory Notes

1. The orchestrator currently writes start events with `null` values for `endTimestamp`, `durationMinutes`, and `verdict`. The required field `endTimestamp` uses `"format": "date-time"` which rejects `null`. If `validate-store --dry-run` fails on start events, this is a pre-existing issue (not introduced by this task) that T03 is intended to address. The implementer should note this and not be surprised if the dry-run result depends on whether start events exist in `.forge/store/events/`.
2. Both schema files should be updated in a single atomic step to avoid a window where the canonical and local copies are out of sync.
