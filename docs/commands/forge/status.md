# /forge:status

Quick overview of the current sprint and task state.

## What it does

Reads the active sprint from the store and renders a summary: sprint name, task status counts, and recent activity. Useful for a quick check between sessions.

## Invocation

```
/forge:status
```

No arguments. Reads the most recent active sprint automatically.

## Output

```
Sprint: PROJ-S03 (active)
───────────────────────────
planned          2
implementing     1
committed        4
escalated        1

Recent activity:
  PROJ-S03-T04  committed  2026-05-22
  PROJ-S03-T03  escalated  2026-05-21
  PROJ-S03-T02  committed  2026-05-20
```

## Related commands

- [`/forge:ask`](ask.md) — conversational status queries via Tomoshibi
- [`/forge:search`](search.md) — structured store queries
- [`/forge:health`](health.md) — full health diagnostic
