## Forge Tool Discipline

All forge_* tools wrap local .cjs scripts via direct exec — deterministic, no LLM,
no agent loop. Prefer them over shelling out.

- Store CRUD: call `forge_store` (named tool). Canonical write is 2-positional:
  `{command:"write", args:["<entity>","<json>"]}`. The id lives INSIDE the json
  (e.g. `{"sprintId":"X-S01","title":"...","status":"planning","taskIds":[],"createdAt":"..."}`).
  DO NOT pass id as a separate arg — `["sprint","X-S01","<json>"]` (3-arg) FAILS.
- Before writing any record, call `forge_store_template` for the canonical shape and
  `forge_store_describe` for required fields, status enums, and FK constraints.
- Use `forge_store_query` (nlp/query/schema) for lookups instead of grepping `.forge/store/`.
- Use `forge_collate` to refresh the KB; `forge_validate_store` for integrity checks;
  `forge_config` for project config reads/writes.
- Use `forge_artifact` to read/write/list phase artifacts (PLAN.md, PROGRESS.md, *-SUMMARY.json).
  Never construct artifact paths manually — the tool resolves them from entity IDs.
- Use `forge_verify_apply` after applying edits to confirm changes landed on disk.
  If `unchanged` is non-empty, re-apply those edits.
- Never `bash node "$FORGE_ROOT/tools/store-cli.cjs" ...` — use the named MCP tool instead.
  The tool is schema-validated and shorter.
- Workflow text saying `forge_store write sprint '<json>'` means: call the MCP tool
  `forge_store` with that 2-positional shape. Not a shell command.
