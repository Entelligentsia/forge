# PLAN REVIEW — FORGE-S07-T05: Implement store-cli.cjs — deterministic store custodian CLI

🌿 *Forge Supervisor*

**Task:** FORGE-S07-T05

---

**Verdict:** Approved

---

## Review Summary

The plan is well-scoped, correctly identifies the single new file, and addresses
all acceptance criteria from the task prompt. The approach of wrapping the
existing `store.cjs` facade with schema validation and transition enforcement is
sound and follows established patterns. Version bump and security scan are
correctly deferred to T09 per the task prompt's explicit instruction.

## Feasibility

The approach is realistic. A single ~450-line CJS script wrapping `store.cjs`
is consistent with the existing tool patterns (e.g., `seed-store.cjs`,
`estimate-usage.cjs`). The schema-loading and validation logic can be adapted
from `validate-store.cjs` without introducing new dependencies. The L estimate
is appropriate given the 11 commands, schema validation, transition tables,
and sidecar handling.

Files to modify: only `forge/tools/store-cli.cjs` (new). No other `forge/`
files are touched — the skill, workflow migrations, command migrations, and
release engineering are separate tasks (T06, T07, T08, T09). Correct.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes — correctly deferred to T09 per the
  task prompt's "Version bump: Required (included in T09)" statement.
- **Migration entry targets correct?** N/A — no version bump in T05.
- **Security scan requirement acknowledged?** Yes — acknowledged and deferred to
  T09. Correct per the task prompt's "Security scan: Required (included in T09)."

## Security

No security concerns for the new CLI tool itself:
- Pure CJS script, no Markdown prompt injection surface.
- No HTTP calls, no credential access, no env-var reads.
- JSON parsing of CLI arguments is safe — `JSON.parse` on strings from
  `process.argv` cannot execute arbitrary code.
- Path traversal: `store.cjs` already has a path-traversal guard in
  `purgeEvents`. The CLI delegates all path resolution to the facade.
- `update-status --force` is a potential abuse vector but is appropriately
  documented as "migration/repair scenarios only" with a stderr warning.

## Architecture Alignment

- Follows existing tool patterns: `'use strict'`, CJS, `fs`/`path` built-ins,
  `require('./store.cjs')` for store access.
- Paths read from store facade (which reads `.forge/config.json`) — correct,
  no hardcoding.
- `additionalProperties: false` enforcement is explicitly planned — this
  addresses the key gap in `validate-store.cjs`.
- No hooks involved — no hook exit discipline needed.
- Not a hook: the tool is a CLI, so `process.exit(1)` on failure is correct
  (unlike hooks which must exit 0).

## Testing Strategy

Adequate. Includes:
- `node --check forge/tools/store-cli.cjs` — syntax check
- `node forge/tools/validate-store.cjs --dry-run` — store integrity
- Three acceptance tests from the task prompt
- Additional smoke tests for transition enforcement, sidecar, filters, etc.

No schema changes, so no `validate-store` schema drift concern.

---

## If Approved

### Advisory Notes

1. **Missing-record edge case for `update-status`:** The plan does not
   explicitly state what happens when `update-status` is called on an entity
   that does not exist (e.g., a task ID not in the store). The implementation
   should exit 1 with a stderr message like `"Entity not found: task {id}"`.
   This is straightforward and does not require a plan revision.

2. **Sidecar validation leniency:** The plan lists accepted sidecar fields but
   does not specify whether unknown fields are rejected or silently preserved.
   Since sidecars are ephemeral, recommend being lenient: write whatever fields
   are provided, and only merge the known token fields during `merge-sidecar`.
   Rejecting unknown fields in sidecars would create unnecessary coupling
   between the CLI and future sidecar format changes.

3. **`--help` and no-argument behavior:** The plan does not mention what
   happens when the CLI is invoked with no arguments or `--help`. Consider
   printing a usage summary to stdout and exiting 0. Not a blocking issue.

4. **Feature entity ID field:** The `feature` entity uses `id` as its primary
   key field (not `feature_id`). The `read`, `delete`, and `update-status`
   commands need to map the CLI `<id>` argument to the correct primary key
   field per entity type. The plan's "Entity ID Field Mapping" table covers
   this correctly.

5. **`list` filter parsing:** The plan says "key=value pairs" for the `list`
   command filter. The store facade `_matches` uses AND logic (all filter
   entries must match). The implementation should parse multiple `key=value`
   arguments and construct a filter object that the facade's `_matches` method
   consumes. This is straightforward given the existing facade API.