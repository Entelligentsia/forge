# Store Schema: Event

## File Location

`.forge/store/events/{SPRINT_ID}/{EVENT_ID}.json`

## Event ID Format

`{ISO_TIMESTAMP}_{TASK_ID}_{ROLE}_{ACTION}`

Example: `20260415T141523000Z_ACME-S02-T03_engineer_implement`

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `eventId` | string | yes | Unique event identifier |
| `taskId` | string | yes | Task this event belongs to |
| `sprintId` | string | yes | Sprint this event belongs to |
| `role` | string | yes | Agent role (Engineer, Supervisor, Architect) |
| `action` | string | yes | Command invoked (e.g. `/implement`) |
| `phase` | string | yes | Pipeline phase (plan, review-plan, implement, etc.) |
| `iteration` | integer | yes | Which iteration of this phase (1-based) |
| `startTimestamp` | string | yes | ISO 8601 |
| `endTimestamp` | string | yes | ISO 8601 |
| `durationMinutes` | number | yes | Computed duration |
| `model` | string | yes | Full model identifier as reported by the host CLI (e.g. `claude-sonnet-4-6`, `gpt-4o`, `o3`) — use the full ID, not a short alias |
| `verdict` | string | no | For review phases: Approved / Revision Required |
| `notes` | string | no | Free-form notes |
| `inputTokens` | integer | no | Input token count (minimum 0) |
| `outputTokens` | integer | no | Output token count (minimum 0) |
| `cacheReadTokens` | integer | no | Cache-read token count (minimum 0) |
| `cacheWriteTokens` | integer | no | Cache-write token count (minimum 0) |
| `estimatedCostUSD` | number | no | Estimated cost in USD (minimum 0) |
| `tokenSource` | enum | no | `reported` / `estimated` — how token counts were obtained |

## JSON Schema

This block is the canonical machine-readable definition embedded in `validate-store.cjs`.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "forge/event.schema.json",
  "title": "Event",
  "type": "object",
  "required": [
    "eventId", "taskId", "sprintId", "role", "action",
    "phase", "iteration", "startTimestamp", "endTimestamp", "durationMinutes", "model"
  ],
  "properties": {
    "eventId":         { "type": "string" },
    "taskId":          { "type": "string" },
    "sprintId":        { "type": "string" },
    "role":            { "type": "string" },
    "action":          { "type": "string" },
    "phase":           { "type": "string" },
    "iteration":       { "type": "integer", "minimum": 1 },
    "startTimestamp":  { "type": "string", "format": "date-time" },
    "endTimestamp":    { "type": "string", "format": "date-time" },
    "durationMinutes": { "type": "number", "minimum": 0 },
    "model":           { "type": "string" },
    "verdict":            { "type": "string" },
    "notes":              { "type": "string" },
    "inputTokens":        { "type": "integer", "minimum": 0 },
    "outputTokens":       { "type": "integer", "minimum": 0 },
    "cacheReadTokens":    { "type": "integer", "minimum": 0 },
    "cacheWriteTokens":   { "type": "integer", "minimum": 0 },
    "estimatedCostUSD":   { "type": "number",  "minimum": 0 },
    "tokenSource":        { "type": "string",  "enum": ["reported", "estimated"] }
  },
  "additionalProperties": false
}
```
