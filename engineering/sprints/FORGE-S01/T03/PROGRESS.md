# PROGRESS — FORGE-S01-T03: Orchestrator meta-workflow — subagent self-reporting and sidecar merge

**Task:** FORGE-S01-T03
**Sprint:** FORGE-S01

---

## Summary

Updated `forge/meta/workflows/meta-orchestrate.md` with four additive changes:
(1) a new Token Self-Reporting section placed immediately after Context Isolation, instructing
subagents to run `/cost` and write a sidecar file before returning;
(2) updated Execution Algorithm to compute `eventId` before spawning, extend the subagent prompt
with the sidecar write instruction, and perform sidecar check/merge/delete after the subagent
returns and before `emit_event(complete)`;
(3) updated the Event Emission optional fields list to include all five token fields;
(4) added a Generation Instructions bullet documenting the sidecar merge pattern for generated
orchestrators.

## Syntax Check Results

Not applicable — this task modifies only a Markdown file (`forge/meta/workflows/meta-orchestrate.md`).
No JS/CJS files were changed.

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
ERROR  .forge/store/events/FORGE-S01/2026-04-05T05:39:07.997Z_FORGE-S01-T01_plan_start.json: missing required field: "endTimestamp"
ERROR  .forge/store/events/FORGE-S01/2026-04-05T05:39:07.997Z_FORGE-S01-T01_plan_start.json: missing required field: "durationMinutes"
ERROR  .forge/store/events/FORGE-S01/2026-04-05T05:40:02.632Z_FORGE-S01-T01_engineer_plan-task.json: missing required field: "model"
ERROR  .forge/store/events/FORGE-S01/2026-04-05T05:40:51.822Z_FORGE-S01-T01_review-plan_start.json: missing required field: "endTimestamp"
ERROR  .forge/store/events/FORGE-S01/2026-04-05T05:40:51.822Z_FORGE-S01-T01_review-plan_start.json: missing required field: "durationMinutes"
ERROR  .forge/store/events/FORGE-S01/2026-04-05T05:57:41.172Z_FORGE-S01-T02_architect_approve.json: missing required field: "role"
...
16 error(s) found.
```

Note: These 16 errors are pre-existing in the event store from prior tasks (T01, T02) and are
unrelated to this task. This task makes no schema changes. The errors will need to be addressed
separately (likely as a store backfill in T08 or a dedicated bug fix).

## Files Changed

| File | Change |
|---|---|
| `forge/meta/workflows/meta-orchestrate.md` | Added Token Self-Reporting section; updated Execution Algorithm with eventId pre-computation and sidecar merge; extended subagent prompt with sidecar write instruction; updated Event Emission optional fields; added Generation Instructions bullet |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| Token Self-Reporting section present with sidecar write instruction | ✅ Pass | Placed after Context Isolation section as specified |
| Subagent prompt includes sidecar write instruction with correct path template | ✅ Pass | `_{eventId}_usage.json` path included in spawn_subagent prompt |
| Execution Algorithm shows sidecar check/merge after spawn, before emit_complete | ✅ Pass | `token_fields = {}; if file_exists(sidecar_path): merge+delete` |
| If sidecar found: token fields merged into event, sidecar deleted | ✅ Pass | `read_json` → `delete_file` → `emit_event(..., extra_fields=token_fields)` |
| If sidecar missing: event emitted without token fields (no error) | ✅ Pass | `token_fields = {}` default ensures graceful fallback |
| Event Emission table optional fields includes all five token fields | ✅ Pass | `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD` |
| Generation Instructions bullet about sidecar merge pattern | ✅ Pass | Added as final bullet under Generation Instructions |
| `node --check` passes | ✅ Pass | N/A — Markdown-only change |
| `validate-store --dry-run` exits 0 | ❌ Pre-existing failures | 16 pre-existing errors unrelated to this task; no schema changes in T03 |

## Plugin Checklist

- [ ] Version bumped in `forge/.claude-plugin/plugin.json` — deferred to T08
- [ ] Migration entry added to `forge/migrations.json` — deferred to T08 (`regenerate: ["workflows"]`)
- [ ] Security scan run and report committed — deferred to T08 per sprint plan

## Knowledge Updates

No updates to `engineering/architecture/` or `engineering/stack-checklist.md` required.
The sidecar pattern is already consistent with the verdict-detection pattern documented in the
architecture; this task applies the same principle to token usage collection.

## Notes

- The `eventId` format passed to the subagent in the prompt matches exactly the format in the
  Event Emission section (`{ISO_TIMESTAMP}_{TASK_ID}_{role}_{action}`), per the Supervisor's
  advisory note.
- The sidecar prompt instruction is kept concise (single-line in the algorithm) per the
  Supervisor's advisory note about context window competition.
- The 16 validate-store errors are pre-existing (from incomplete event records written during
  T01/T02 development). This task introduces no schema changes so they are out of scope here.
  They should be tracked separately.
