# Fragment: store-cli Verb Cheat-Sheet

<!-- Canonical store-cli verb list. Referenced by meta workflows that issue
     store-cli calls. Surface it inline near the first store-cli invocation
     so subagents stop inventing REST-style verbs (`get`, `set`, `delete`)
     when they have to improvise a follow-up call. See forge#95. -->

store-cli verbs: `read` | `list` | `write` | `emit` | `update-status` | `set-summary` | `set-bug-summary` | `describe` | `template` | `nlp` | `query` | `delete`

Notes for subagents:

- **`read`** is the canonical "fetch one record" verb. There is no `get`.
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
