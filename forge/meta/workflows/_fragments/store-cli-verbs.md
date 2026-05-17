# Fragment: store-cli Verb Cheat-Sheet

<!-- Canonical store-cli verb list. Referenced by meta workflows that issue
     store-cli calls. Surface it inline near the first store-cli invocation
     so subagents stop inventing REST-style verbs (`get`, `set`, `delete`)
     when they have to improvise a follow-up call. See forge#95 and
     FORGE-S22-T02 (read-aliases). -->

store-cli verbs: `read` | `list` | `write` | `emit` | `update-status` | `set-summary` | `set-bug-summary` | `describe` | `template` | `nlp` | `query` | `delete`

Read-aliases (FORGE-S22-T02): `get` | `get-task` | `get-bug` | `get-sprint` | `get-summary` | `get-bug-summary`

Notes for subagents:

- **`read`** is the canonical "fetch one record" verb. The aliases
  `get <entity> <id>`, `get-task <id>`, `get-bug <id>`, `get-sprint <id>`
  are accepted and delegate byte-equally to `read`. Prefer the canonical
  `read` form in new code; aliases exist to reduce friction when an agent
  reaches for REST-style verbs.
- **`get-summary <taskId> <phase>`** and **`get-bug-summary <bugId> <phase>`**
  are direct summary readers — they extract `record.summaries[phase]` and
  exit 1 if the phase is absent. They are NOT write verbs (do not confuse
  with `set-summary` / `set-bug-summary`).
- **`list`** filters by entity (`sprint`, `task`, `bug`, `event`, `feature`)
  and optional flags. There is no `find` or `search` — use `nlp` for
  natural-language lookup.
- **`update-status`** is the ONLY supported task/bug status mutation path.
  Do not `write` a task back with a new `status` field; the FSM is enforced
  by `update-status`.
- **`emit`** appends an event. There is no `append-event` / `add-event`.
- **`set-summary`** / **`set-bug-summary`** write summary sidecars referenced
  from the entity record. Do not inline summaries into the entity via `write`.
- If you need a verb not on this list, run
  `node "$FORGE_ROOT/tools/store-cli.cjs" --help` before improvising.
- If you supply an unknown verb, entity type, enum value, or field name,
  store-cli appends a **Did you mean?** suggestion to the error message.
  Suggestions use Levenshtein distance (≤ 2) and a curated drift map for
  common agent misconceptions (e.g., `completed` → `committed`,
  `task` → `taskId`, `set` → `set-summary`). See FORGE-S22-T03.
