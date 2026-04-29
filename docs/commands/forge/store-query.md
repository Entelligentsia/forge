# /forge:store-query

Query the Forge store by natural language or exact flags.

## What it does

Searches the Forge JSON store for tasks, bugs, sprints, and features. Supports two modes: natural language (describe what you want) and exact flags (specify filters). Returns matching entities with IDs, titles, status, relationships, and excerpts from their knowledge base pages.

## Invocation

```
/forge:store-query open bugs in S12
/forge:store-query FORGE-S01-T03
/forge:store-query --sprint S12 --status in-progress
/forge:store-query --keyword auth
/forge:store-query schema
```

## Query modes

### Natural language

If the argument does not start with `--`, Forge parses it as a natural language intent:

```
/forge:store-query open bugs in S12
/forge:store-query tasks blocked by T03
/forge:store-query what's the status of S01?
```

The NLP engine extracts entity type, status filters, sprint references, and keywords. It reports confidence levels: `high` (filters were valid), `low` (some filters were stripped).

### Exact flags

If the argument starts with `--`, Forge treats it as a flag-based query:

```
/forge:store-query --sprint S12 --status in-progress
/forge:store-query --entity bug --severity critical
/forge:store-query --keyword auth
```

### Schema reference

```
/forge:store-query schema
```

Dumps the project's entity schemas and NLP grammar vocabulary. Use this to discover valid enum values and queryable fields.

## Output fields

| Field | Meaning |
|-------|---------|
| `results[].id` | Entity ID |
| `results[].title` | Entity title |
| `results[].status` | Current status |
| `results[].type` | `task`, `bug`, `sprint`, or `feature` |
| `results[].relationships` | FK IDs (sprintId, featureId, blockedBy, etc.) |
| `results[].fileRefs.md` | Path to the entity's INDEX.md |
| `results[].excerpt` | First 4 sentences from INDEX.md |
| `traversalTrace` | NLP parse steps and confidence |
| `meta.totalTimeMs` | Query wall-clock time |

## Related

- [`/forge:store-repair`](store-repair.md) — repair corrupted store records
- [`/forge:ask`](ask.md) — conversational queries via Tomoshibi