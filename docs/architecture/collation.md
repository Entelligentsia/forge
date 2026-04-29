# Collation

Collation regenerates markdown views from the JSON store. It is deterministic — no AI involved. It reads store JSON files and produces structured INDEX.md files and COST_REPORT.md files.

---

## What Collation Produces

| Output | Location | Purpose |
|--------|----------|---------|
| MASTER_INDEX.md | `{engineering}/` | Project-wide index: features, sprints, tasks, bugs |
| Feature INDEX.md | `{engineering}/features/INDEX.md` | Feature registry table |
| Per-feature page | `{engineering}/features/{id}.md` | Feature details, requirements, linked sprints |
| Sprint INDEX.md | `{engineering}/sprints/{sprint}/INDEX.md` | Sprint summary with task table |
| Task INDEX.md | `{engineering}/sprints/{sprint}/{task}/INDEX.md` | Task summary with document links |
| Bug INDEX.md | `{engineering}/bugs/{bug}/INDEX.md` | Bug summary with severity and cost |
| COST_REPORT.md | `{engineering}/sprints/{sprint}/COST_REPORT.md` | Token usage and cost analysis |
| COLLATION_STATE.json | `.forge/store/` | Timestamp and entity counts |

---

## When Collation Runs

Collation runs automatically after:
- Sprint close (`/retrospective`)
- Adding a task (`/forge:add-task`)
- Plugin update (`/forge:update`)

You can also run it manually:

```bash
/collate                  # Rebuild all indexes
/collate FORGE-S02        # Rebuild indexes for a specific sprint
/collate FORGE-BUG-007    # Rebuild bug index (auto-enables purge)
```

---

## COST_REPORT.md Sections

The cost report has four sections:

1. **Per-Task Totals** — Token usage and cost per task
2. **Per-Role Breakdown** — Token usage by role (Engineer, Supervisor, Architect)
3. **Revision Waste** — Token usage from review iterations > 1
4. **Model Split** — Token usage by model (opus, sonnet, haiku)

Each section includes input/output tokens, cache read/write tokens, and estimated cost in USD.

---

## Event Purging

```bash
/collate FORGE-S02 --purge-events
```

This generates COST_REPORT.md from all accumulated events, then deletes `.forge/store/events/{SPRINT_ID}/`. The cost report is the durable record. Raw event files are not retained after retrospective close.

Bug IDs auto-enable purge:

```bash
/collate FORGE-BUG-007    # Same as: collate FORGE-BUG-007 --purge-events
```

When purging events for a bug, cost data is aggregated from event files and embedded in the bug's INDEX.md before the events are deleted.

---

## Dry-Run Mode

```bash
/collate --dry-run
```

Previews all writes without modifying files. Reports what would be written and what would be deleted.

---

## Collation State

After each run, collation writes `COLLATION_STATE.json` to the store root:

```json
{
  "collatedAt": "2026-04-29T10:30:00.000Z",
  "featureCount": 2,
  "sprintCount": 3,
  "taskCount": 8,
  "bugCount": 1
}
```

---

## Preserved Sections

MASTER_INDEX.md preserves manually-written sections. If you add custom `##` headings to MASTER_INDEX.md outside the generated block, collation preserves them across regenerations. Only the generated sections (Feature Registry, Sprint Registry, Task Registry, Bug Registry) are overwritten.