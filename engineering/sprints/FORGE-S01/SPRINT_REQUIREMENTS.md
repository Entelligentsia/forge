# Sprint FORGE-S01 — Token Usage Tracking

## Sprint Goal

Give Forge users transparent, per-phase token usage metrics so they can understand plugin efficiency and provide actionable data in bug reports. Establish baselines for continuous improvement.

**Observable outcome:** After a sprint completes, users see a `COST_REPORT.md` with per-task, per-role, per-model, and revision-waste breakdowns. Bug reports optionally include cost data (user-prompted opt-in).

---

## Must-Have Items

### 1. Event Schema Extension

**Change to:** `forge/schemas/event.schema.json`
**Distributed:** Yes (version bump required)

Add optional token fields to the event schema:

- `inputTokens` (integer, >= 0)
- `outputTokens` (integer, >= 0)
- `cacheReadTokens` (integer, >= 0)
- `cacheWriteTokens` (integer, >= 0)
- `estimatedCostUSD` (number, >= 0)

**Acceptance criteria:**
- `validate-store.cjs` passes with events that include the new fields
- `validate-store.cjs` passes with events that omit the new fields (backward-compatible)
- Schema validates types and minimum values correctly

### 2. Subagent Self-Reporting (Primary Mechanism)

**Change to:** `forge/meta/workflows/meta-orchestrate.md`
**Distributed:** Yes (version bump required)

Each phase subagent captures its own token usage via `/cost` before returning, writes a sidecar JSON file:

`.forge/store/events/{sprintId}/_{eventId}_usage.json`

Format:
```json
{
  "inputTokens": 4200,
  "outputTokens": 1800,
  "cacheReadTokens": 1200,
  "cacheWriteTokens": 300,
  "estimatedCostUSD": 0.04
}
```

The orchestrator reads the sidecar after the subagent returns, merges fields into the event JSON, and deletes the sidecar.

**Acceptance criteria:**
- Orchestrator meta-workflow includes self-reporting instructions for subagents
- Orchestrator reads sidecar, merges into event, deletes sidecar
- If sidecar is missing (subagent failed to report), event is emitted without token fields — no failure

### 3. Estimation Fallback Tool

**New file:** `forge/tools/estimate-usage.cjs`
**Distributed:** Yes (version bump required)

Deterministic Node.js tool (built-ins only) that back-fills token estimates from duration + model using throughput heuristics.

Usage modes:
- Single event: `node estimate-usage.cjs --event <path>`
- Batch: `node estimate-usage.cjs --sprint <SPRINT_ID>`
- Only fills events that lack token fields (does not overwrite self-reported data)

**Acceptance criteria:**
- `node --check estimate-usage.cjs` exits 0
- Back-fills missing token fields on events that have `durationMinutes` and `model`
- Skips events that already have `inputTokens` set
- Outputs summary: `N events updated, M skipped (already populated)`

### 4. Collation: COST_REPORT.md

**Change to:** `forge/tools/collate.cjs`
**Distributed:** Yes (version bump required)

Generate `engineering/sprints/{SPRINT_ID}/COST_REPORT.md` containing:

- **Per-task totals** — input/output/cache tokens, estimated cost
- **Per-role breakdown** — engineer vs. supervisor vs. architect token spend
- **Revision waste** — tokens consumed in iterations that preceded a later revision
- **Model split** — tokens and cost per model (sonnet/opus/haiku)
- Values labelled as "estimated" when derived from heuristic, "reported" when from subagent self-report

**Acceptance criteria:**
- `COST_REPORT.md` is generated for any sprint that has events with token fields
- Report includes all four breakdown sections
- Sprints with zero token data get a note: "No token data available — run `estimate-usage` to back-fill"

### 5. Retrospective Cost Analysis

**Change to:** `forge/meta/workflows/meta-retrospective.md`
**Distributed:** Yes (version bump required)

Extend Step 2 (Analyse Patterns) to include:

- Total token usage and estimated cost for the sprint
- Most expensive tasks (sorted)
- Review overhead ratio (review tokens / total tokens)
- Comparison to baselines if `COST_BASELINES.json` exists

Extend Step 5 (Write Retrospective) to include a "Cost Analysis" section.

**Acceptance criteria:**
- Retrospective template includes cost analysis section
- Analysis uses data from events; gracefully handles events without token fields

### 6. Cost Baselines

**New file concept:** `.forge/store/COST_BASELINES.json`
**Project-internal:** Yes (no version bump for the file itself — the workflow that writes it is distributed)

Updated after each retrospective:

```json
{
  "medianTokensPerEstimate": { "S": 8000, "M": 18000, "L": 35000, "XL": 70000 },
  "medianReviewOverhead": 0.35,
  "sampleSize": 12,
  "lastUpdated": "2026-04-05T12:00:00Z"
}
```

**Acceptance criteria:**
- Retrospective workflow creates/updates `COST_BASELINES.json`
- Baselines computed from all completed sprints with token data
- Used in future retrospectives for comparison

### 7. Bug Report Opt-In

**Change to:** `forge/meta/workflows/meta-fix-bug.md` or report-bug command
**Distributed:** Yes (version bump required)

When filing a bug via `/forge:report-bug`, prompt the user:

> "Include token usage data from the relevant sprint in this report? (Helps the Forge team diagnose efficiency issues) [Y/n]"

Options:
- User can set a default in `.forge/config.json` → `pipeline.includeTokenDataInBugReports` (boolean)
- If default is set, skip the prompt and use the default
- If no default, prompt per-report

**Acceptance criteria:**
- `/forge:report-bug` prompts for token data inclusion (or uses config default)
- If opted in, `COST_REPORT.md` content is appended to the GitHub issue body
- If opted out, no cost data included

### 8. validate-store.cjs Update

**Change to:** `forge/tools/validate-store.cjs`
**Distributed:** Yes (bundled with schema change)

Update validation logic to handle the new optional event fields.

**Acceptance criteria:**
- Events with valid token fields pass
- Events without token fields pass
- Events with invalid token fields (negative, wrong type) fail validation

---

## Not Doing This Sprint

- OpenTelemetry integration
- Claude API direct integration
- Per-conversation token tracking (only per-phase via subagent isolation)
- Historical back-fill of pre-existing events (users can run `estimate-usage.cjs` manually)

## Constraints

- Node.js built-ins only — no npm packages
- Schema changes are additive (optional fields) — backward compatible
- Users must regenerate workflows and tools after upgrading (`/forge:update`)

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `/cost` unavailable inside subagent context | Low | Fallback to `estimate-usage.cjs` heuristic — no data loss |
| `/cost` output format changes | Low | Single parsing point in orchestrator; easy to patch |
| Token heuristics diverge significantly from actual usage | Medium | Label estimates clearly; baselines self-correct over sprints |

---

## Dependencies

```
1. Schema Extension (no deps)
2. validate-store update (depends on 1)
3. Subagent self-reporting in orchestrator (depends on 1)
4. estimate-usage.cjs tool (depends on 1)
5. collate.cjs COST_REPORT (depends on 1)
6. Retrospective cost analysis (depends on 5, 6 — baselines)
7. Cost baselines (depends on 1)
8. Bug report opt-in (depends on 5)
```
