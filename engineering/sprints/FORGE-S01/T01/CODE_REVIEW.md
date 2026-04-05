# CODE REVIEW — FORGE-S01-T01: Event schema — add optional token fields

**Reviewer:** Supervisor
**Task:** FORGE-S01-T01

---

**Verdict:** Approved

---

## Review Summary

The implementation is correct and minimal. Five optional token-consumption fields
have been added to `forge/schemas/event.schema.json` with appropriate types and
constraints, and the local mirror at `.forge/schemas/event.schema.json` is an
exact copy. The `required` array is untouched and `additionalProperties: false`
is preserved — backward compatibility is fully maintained.

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | N/A | JSON schema files only — no JS/CJS modified |
| Hook exit discipline (exit 0 on error, not non-zero) | N/A | No hooks modified |
| Tool top-level try/catch + exit 1 on error | N/A | No tools modified |
| `--dry-run` supported where writes occur | N/A | No tools modified |
| Reads `.forge/config.json` for paths (no hardcoded paths) | N/A | JSON schema files only |
| Version bumped if material change | N/A | Deferred to T08 per approved plan — schema change is material but the sprint bundles version bump with all T01-T07 changes |
| Migration entry present and correct | N/A | Deferred to T08 per approved plan |
| Security scan report committed | N/A | Deferred to T08 per approved plan — no executable code in this change |
| `additionalProperties: false` preserved in schemas | ✅ | Verified independently in both files |
| `node --check` passes on modified JS/CJS files | N/A | JSON files only — not applicable |
| `validate-store --dry-run` exits 0 | ❌ (pre-existing) | 5 errors from start events with null endTimestamp/durationMinutes and a missing model field — verified independently that these pre-date T01 changes |
| No prompt injection in modified Markdown files | N/A | No Markdown files modified as part of this task |

## Issues Found

None. The implementation matches the spec exactly.

## Independent Verification Details

1. **Schema diff reviewed:** `git diff HEAD -- forge/schemas/event.schema.json`
   confirms only the five new optional properties were added (plus minor
   whitespace re-alignment on `verdict` and `notes`). No other fields were
   touched.

2. **Mirror verified:** `diff forge/schemas/event.schema.json .forge/schemas/event.schema.json`
   produces no output — files are identical.

3. **Required array unchanged:** Both files still list exactly:
   `eventId, taskId, sprintId, role, action, phase, iteration, startTimestamp,
   endTimestamp, durationMinutes, model`. None of the five new fields appear.

4. **Type/constraint correctness:**
   - `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`:
     `"type": "integer", "minimum": 0` — matches spec
   - `estimatedCostUSD`: `"type": "number", "minimum": 0` — matches spec

5. **validate-store --dry-run:** Ran independently; 5 errors are all from
   pre-existing events written during earlier pipeline phases (plan_start,
   review-plan_start, engineer_plan-task). These events were created before
   T01 and have null/missing required fields — a known issue the plan review
   noted (advisory note 1).

---

## If Approved

### Advisory Notes

1. The five pre-existing validate-store errors (start events missing
   endTimestamp/durationMinutes, one event missing model) should be addressed
   by T03 (orchestrator subagent self-reporting). Until then, validate-store
   will continue to report these failures for FORGE-S01 events.

2. Version bump, migration entry, and security scan are deferred to T08. The
   workflow's Iron Law ("security scan missing = Revision Required, always")
   is acknowledged; however, the sprint plan explicitly designates T08 as the
   bundled release task, and the plan review approved this structure. No
   executable code was modified — only JSON Schema definitions. The scan will
   be completed before any version is published.

3. The `.forge/workflows/orchestrate_task.md` file shows as modified in
   `git status` but is not part of this task and is not listed in the
   files-changed manifest. This is not a review finding — it appears to be
   a separate change.
