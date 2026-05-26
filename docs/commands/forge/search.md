# /forge:search
Query the Forge store by natural language or exact flags.
## What it does
Searches the Forge JSON store for tasks, bugs, sprints, and features. Supports two modes: natural language (describe what you want) and exact flags (specify filters). Returns matching entities with IDs, titles, status, relationships, and excerpts from their knowledge base pages.
## Invocation
```
/forge:search open bugs in S12
/forge:search FORGE-S01-T03
/forge:search --sprint S12 --status in-progress
/forge:search --keyword auth
/forge:search schema
```
## Query modes
### Natural language
If the argument does not start with `--`, Forge parses it as a natural language intent:
```
/forge:search open bugs in S12
/forge:search tasks blocked by T03
/forge:search what's the status of S01?
```
The NLP engine extracts entity type, status filters, sprint references, and keywords. It reports confidence levels: `high` (filters were valid), `low` (some filters were stripped).

### Flag-based
If the argument starts with `--`, Forge treats it as a flag-based query:
```
/forge:search --sprint S12 --status in-progress
/forge:search --entity bug --severity critical
/forge:search --keyword auth
```

### Schema reference
```
/forge:search schema
```
Dumps the project's entity schemas and NLP grammar vocabulary. Use this to discover valid enum values and queryable fields.
## Output fields
| Field | Meaning |
|---|---|
| `results[].id` | Entity ID |
| `results[].title` | Entity title |
| `results[].status` | Current status |
| `results[].type` | `task`, `bug`, `sprint`, or `feature` |
| `results[].relationships` | FK IDs (sprintId, featureId, blockedBy, etc.) |
| `results[].fileRefs.md` | Path to the entity's INDEX.md |
| `results[].excerpt` | First 4 sentences from INDEX.md |
| `traversalTrace` | NLP parse steps and confidence |
| `meta.totalTimeMs` | Query wall-clock time |

## Related commands
- [`/forge:repair`](repair.md) — repair corrupted store records
- [`/forge:ask`](ask.md) — conversational queries via Tomoshibi
