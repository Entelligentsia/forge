# Fragment: Event Emission Schema

<!-- Canonical required/optional event field table for orchestrator workflows.
     Referenced by meta-orchestrate.md and meta-fix-bug.md. -->

Every phase emits a structured event via `/forge:store emit {sprintId} '{event-json}'`.

**Required fields** (defined in `.forge/schemas/event.schema.json`):

| Field | Value |
|-------|-------|
| `eventId` | `{ISO_TIMESTAMP}_{TASK_ID}_{role}_{action}` e.g. `20260415T141523000Z_ACME-S02-T03_implement_plan-task` |
| `taskId` | Task ID from the task manifest |
| `sprintId` | Sprint ID from the task manifest |
| `role` | Pipeline phase role (e.g. `plan`, `review-plan`, `implement`, `review-code`, `approve`, `commit`) |
| `action` | Slash command invoked in namespaced form (e.g. `/forge:implement`, `/forge:review-plan`) |
| `phase` | Pipeline phase name (e.g. `plan`, `review-plan`, `implement`, `review-code`, `approve`, `commit`) |
| `iteration` | 1-based iteration count for this phase |
| `startTimestamp` | ISO 8601 timestamp recorded **before** spawning the phase subagent |
| `endTimestamp` | ISO 8601 timestamp recorded **after** the subagent returns |
| `durationMinutes` | Decimal minutes elapsed between start and end |
| `model` | Resolved model identifier (e.g. `claude-sonnet-4-6`). Read from `CLAUDE_CODE_SUBAGENT_MODEL` on single-cluster runtimes, or `ANTHROPIC_DEFAULT_{TIER}_MODEL` on tiered clusters. |

**Optional fields** (merged from sidecar when present):
`verdict`, `notes`, `inputTokens`, `outputTokens`, `cacheReadTokens`,
`cacheWriteTokens`, `estimatedCostUSD`.

Use only the field names above — no aliases (`agent`, `status`, `timestamp`, `details`).
When in doubt, read `.forge/schemas/event.schema.json` directly.
