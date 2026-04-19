# Plan 5 — Write-Boundary Schema Enforcement

**Category:** Quality / Safety (closes the probabilistic-bypass gap)
**Target version:** minor bump (introduces a new hook — user-visible behavior change)
**Estimated effort:** 4–5 engineer days
**Breaking:** No for well-formed data; YES for any existing tooling that writes malformed JSON to `engineering/` or `.forge/` (these writes will start being rejected)

---

## 1. Problem

Forge's intent — per the project owner's rule — is:

> Probabilistic agents MAY bypass deterministic tools, **as long as schema is enforced for data and messages.**

Today that rule is only partially honored:

- **`store-cli.cjs` has three unvalidated write paths** that accept agent-provided data without schema checks:
  - Sidecar event writes (`store-cli.cjs:592–611`) — only `eventId` presence is checked
  - Sidecar→event merge (`store-cli.cjs:670–689`) — no re-validation of the merged canonical event
  - Progress log append (`store-cli.cjs:730–759`) — `detail`, `agentName`, `bannerKey` pass through raw
  - Collation state writes (`store-cli.cjs:706–728`) — no schema exists
- **Nothing forces agents through `store-cli` in the first place.** A subagent can use the `Write` or `Edit` tools to overwrite `engineering/sprints/S1/tasks/T3/task.json` directly. `validate-store.cjs` catches this **post-hoc**, not at write time.

The load-bearing issue is the second one. Enforcement-inside-each-tool is leaky because tool use is not mandatory. Enforcement-at-the-filesystem-boundary is tight and preserves agent freedom.

## 2. Goal

Move schema enforcement from "inside each deterministic tool" to "at the write boundary" — a `PreToolUse` hook on `Write`/`Edit` that intercepts writes to known Forge paths, dispatches to the right schema, validates, and rejects malformed writes with a clear error. Agents remain free to use any tool; the schema invariant is preserved regardless.

Close the four remaining in-tool gaps as a companion tightening so the system is schema-tight on every code path.

## 3. Scope

**In scope:**

- A `PreToolUse` hook (`Write`, `Edit`, `MultiEdit`) that:
  - Matches target paths against a **write-boundary registry** (path pattern → schema)
  - Parses the proposed write, validates against schema, and either allows or blocks
  - Emits a structured rejection message telling the agent which field is wrong and how to fix it
- A **write-boundary registry** mapping Forge-owned path patterns to schemas
- New schemas for three under-covered entities: `event-sidecar`, `progress-entry`, `collation-state`
- Plug the four in-tool gaps (sidecar pre-write, post-merge re-validation, progress entry validation, collation state validation) by reusing the same schemas
- Documentation update in `meta-orchestrate.md` and persona frontmatter (from Plan 1) stating: "You may write Forge-owned JSON directly; writes are schema-validated at the boundary and will be rejected on violation"

**Out of scope:**

- Validating writes outside Forge-owned paths (user code, arbitrary repo files)
- Schema evolution / migration (reuses existing migration chain)
- Replacing `validate-store.cjs` — it remains as a post-hoc auditor and a backfill tool
- Blocking `Bash` writes (e.g. `cat > foo.json`) — out of scope; rely on workflows routing through `store-cli` for shell-driven paths

## 4. Files to touch

| File | Change |
|---|---|
| `forge/hooks/validate-write.js` | **NEW** — PreToolUse hook entry |
| `forge/hooks/hooks.json` | Register the new hook for `Write`, `Edit`, `MultiEdit` |
| `forge/hooks/lib/write-registry.js` | **NEW** — path pattern → schema mapping |
| `forge/hooks/lib/validate.js` | **NEW** — schema loader + Ajv-style validation (or hand-rolled if Ajv not already a dep — check first) |
| `forge/schemas/event-sidecar.schema.json` | **NEW** — subset of event schema, token fields only |
| `forge/schemas/progress-entry.schema.json` | **NEW** |
| `forge/schemas/collation-state.schema.json` | **NEW** |
| `forge/tools/store-cli.cjs` | Call the same validators on sidecar/progress/collation-state writes; add post-merge event re-validation |
| `forge/tools/__tests__/store-cli.test.cjs` | New test cases for the four gaps |
| `forge/hooks/__tests__/validate-write.test.js` | **NEW** — hook-level tests (if a hook test harness exists; otherwise add one) |
| `forge/.claude-plugin/plugin.json` | Version bump (minor) |
| `forge/migrations.json`, `CHANGELOG.md`, `forge/integrity.json`, `forge/commands/health.md` | Standard release checklist |
| `forge/meta/workflows/meta-orchestrate.md` | Add a "write-boundary" note for subagents |
| `docs/security/scan-v{VERSION}.md` | Security scan report |

## 5. Write-boundary registry

`forge/hooks/lib/write-registry.js` exports a prioritized list of `(pattern, schemaRef, recordKind)`:

```javascript
module.exports = [
  // Core store entities
  { pattern: /\/engineering\/features\/[^/]+\/feature\.json$/,                schema: 'feature.schema.json',          kind: 'feature' },
  { pattern: /\/engineering\/sprints\/[^/]+\/sprint\.json$/,                  schema: 'sprint.schema.json',           kind: 'sprint' },
  { pattern: /\/engineering\/sprints\/[^/]+\/tasks\/[^/]+\/task\.json$/,      schema: 'task.schema.json',             kind: 'task' },
  { pattern: /\/engineering\/sprints\/[^/]+\/bugs\/[^/]+\/bug\.json$/,        schema: 'bug.schema.json',              kind: 'bug' },

  // Events
  { pattern: /\/engineering\/sprints\/[^/]+\/events\/[^_][^/]*\.json$/,       schema: 'event.schema.json',            kind: 'event' },
  { pattern: /\/engineering\/sprints\/[^/]+\/events\/_[^/]+_usage\.json$/,    schema: 'event-sidecar.schema.json',    kind: 'event-sidecar' },

  // Metadata
  { pattern: /\/engineering\/COLLATION_STATE\.json$/,                         schema: 'collation-state.schema.json',  kind: 'collation-state' },

  // Progress log (Edit only — append pattern)
  { pattern: /\/engineering\/sprints\/[^/]+\/progress\.log$/,                 schema: 'progress-entry.schema.json',   kind: 'progress-line', format: 'line-pipe-delimited' },
];
```

**Semantics:**

- The FIRST matching pattern wins (order matters — sidecar pattern is more specific than general event pattern, so declare it after the more specific one if patterns overlap; current list avoids overlap).
- If NO pattern matches, the hook is a no-op (write proceeds unchecked). This preserves agent freedom for non-Forge-owned files.
- Patterns are anchored to **absolute path suffixes** to work across different project roots.

**The progress log is line-oriented, not JSON.** Its registry entry carries a `format: 'line-pipe-delimited'` marker. The validator parses the appended line(s) — detected by diffing current file contents vs. proposed — as pipe-delimited records and validates each.

## 6. Hook algorithm — `validate-write.js`

Claude Code `PreToolUse` hooks receive the proposed tool invocation via stdin as JSON and can approve (exit 0), block (exit non-zero with stderr message), or pass (exit 0, no output).

```
1. Read tool invocation from stdin.
2. If tool_name not in [Write, Edit, MultiEdit]: exit 0 (pass).
3. Resolve absolute target path from tool input.
4. Look up path in write-registry. If no match: exit 0 (pass).
5. Determine proposed final contents:
   - Write: content field verbatim
   - Edit/MultiEdit: apply old_string → new_string to current file (read from disk) to compute post-edit contents
6. Parse contents by format:
   - JSON: JSON.parse; on parse failure → block with "Invalid JSON: {error}"
   - line-pipe-delimited: split new lines only (diff vs. current), parse each as pipe-delimited record
7. Load referenced schema from forge/schemas/.
8. Validate. On failure: exit 2 with stderr:

   ❌ Forge schema violation — write blocked
   Path: {relativePath}
   Kind: {recordKind}
   Violation: {field}: {message}
   Hint: see forge/schemas/{schemaFile} for the full shape.
   If this write should bypass validation (emergency repair), set FORGE_SKIP_WRITE_VALIDATION=1 for this turn.

9. On success: exit 0 (allow).
```

**Emergency bypass.** `FORGE_SKIP_WRITE_VALIDATION=1` lets an operator disable the hook for a single turn — used for emergency store repair or migrating in externally-generated data. Logged to the sprint's `progress.log` as an audit trail (via the hook itself, before exiting).

**Performance.** The hook runs on every `Write`/`Edit`/`MultiEdit`. Budget: <50ms for non-matching paths (one regex scan), <150ms for matching paths (regex + read + parse + validate). Hook timeout in `hooks.json` set to 5000ms as a safety margin.

## 7. New schemas

### 7.1 `event-sidecar.schema.json`

Narrow schema covering only the fields written by the sidecar path. Uses `$ref` into `event.schema.json` so the two can't drift. Example:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Event Sidecar",
  "type": "object",
  "required": ["eventId"],
  "additionalProperties": false,
  "properties": {
    "eventId":           { "type": "string", "pattern": "^E[0-9]+$" },
    "inputTokens":       { "type": "integer", "minimum": 0 },
    "outputTokens":      { "type": "integer", "minimum": 0 },
    "cacheReadTokens":   { "type": "integer", "minimum": 0 },
    "cacheWriteTokens":  { "type": "integer", "minimum": 0 },
    "estimatedCostUSD":  { "type": "number", "minimum": 0 },
    "model":             { "type": "string", "maxLength": 80 },
    "durationMinutes":   { "type": "number", "minimum": 0 },
    "startTimestamp":    { "type": "string", "format": "date-time" },
    "endTimestamp":      { "type": "string", "format": "date-time" },
    "tokenSource":       { "type": "string", "enum": ["otel", "sdk", "manual", "estimated"] }
  }
}
```

**Drift guard:** add a test that asserts every field in `event-sidecar.schema.json` also exists in `event.schema.json` with a compatible type — if someone adds a token field to the sidecar schema without updating the event schema, CI fails.

### 7.2 `progress-entry.schema.json`

Fields after parsing a pipe-delimited line `timestamp|agentName|bannerKey|status|detail`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Progress Entry",
  "type": "object",
  "required": ["timestamp", "agentName", "bannerKey", "status"],
  "additionalProperties": false,
  "properties": {
    "timestamp":  { "type": "string", "format": "date-time" },
    "agentName":  { "type": "string", "pattern": "^[a-z0-9][a-z0-9_-]{0,63}$" },
    "bannerKey":  { "type": "string", "pattern": "^[a-z0-9][a-z0-9_-]{0,63}$" },
    "status":     { "type": "string", "enum": ["start", "progress", "done", "error"] },
    "detail":     { "type": "string", "maxLength": 500 }
  }
}
```

### 7.3 `collation-state.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Collation State",
  "type": "object",
  "required": ["collatedAt", "featureCount", "sprintCount", "taskCount", "bugCount"],
  "additionalProperties": false,
  "properties": {
    "collatedAt":    { "type": "string", "format": "date-time" },
    "featureCount":  { "type": "integer", "minimum": 0 },
    "sprintCount":   { "type": "integer", "minimum": 0 },
    "taskCount":     { "type": "integer", "minimum": 0 },
    "bugCount":      { "type": "integer", "minimum": 0 }
  }
}
```

## 8. In-tool gap closures (companion work)

Reuse the same validators inside `store-cli.cjs` so tool-driven writes are validated identically to direct writes.

### 8.1 Sidecar pre-write — `store-cli.cjs:593`

Replace the bare `eventId` check with `validateRecord(data, 'event-sidecar.schema.json')`. Reject with clear error on failure.

### 8.2 Post-merge event re-validation — `store-cli.cjs:682`

After merging sidecar fields into the canonical event, call `validateRecord(mergedEvent, 'event.schema.json')` before writing. Fail with the diff of offending fields.

### 8.3 Progress entry validation — `store-cli.cjs:741`

Parse the line being appended into its five fields, validate against `progress-entry.schema.json`, reject on violation.

### 8.4 Collation state validation — `store-cli.cjs:714`

Validate `data` against `collation-state.schema.json` before `store.writeCollationState(data)`.

**After all four closures, every `store-cli.cjs` write path goes through a schema — no exceptions.**

## 9. Tests (write failing first)

### Hook tests — `forge/hooks/__tests__/validate-write.test.js`

- Non-Forge path (e.g. `src/foo.ts`) → hook passes through.
- Valid task JSON write → allowed.
- Invalid task JSON (missing `taskId`) → blocked with message containing `taskId`.
- Invalid event JSON via `Write` → blocked.
- Edit that transforms valid task JSON into invalid → blocked (post-edit contents validated, not pre-edit).
- Sidecar write with `inputTokens: "not-a-number"` → blocked.
- Progress log append with oversize `detail` → blocked.
- Progress log append with valid line → allowed.
- `FORGE_SKIP_WRITE_VALIDATION=1` set → passes through, audit line written to `progress.log`.
- Unknown file path inside `engineering/` but not matching any registry entry → passes through (registry is an allowlist of validated paths, not a denylist of unknown ones).
- Hook completes in <150ms on a representative validated write (time-bound test).

### Store-cli tests — add to `forge/tools/__tests__/store-cli.test.cjs`

- Sidecar with invalid token field rejected at CLI boundary.
- Sidecar merge producing an invalid canonical event rejected.
- Progress entry with shell-metachar `agentName` rejected.
- Collation state with negative count rejected.
- All existing store-cli tests still pass.

### Drift guard — `forge/schemas/__tests__/sidecar-subset.test.js`

- Every property in `event-sidecar.schema.json` exists in `event.schema.json` with a compatible type definition.

## 10. Workflow documentation update

Add to `forge/meta/workflows/meta-orchestrate.md` (and propagate to persona frontmatter from Plan 1):

```markdown
### Write-boundary contract

You MAY write Forge-owned JSON (task.json, sprint.json, bug.json, events/*.json,
COLLATION_STATE.json, progress.log) directly using Write or Edit. You do NOT
need to route through store-cli.

However: ALL writes to these paths are schema-validated by the Forge
write-boundary hook. A malformed write will be rejected with an error telling
you which field is wrong. Fix the data and retry — do not attempt to disable
the hook.

store-cli is still the most convenient path (it handles ID allocation,
referential integrity backfills, and event emission), but it is not the only
path. Use what is natural for your task; the schema invariant is preserved
either way.
```

## 11. Rollout

1. Land Plan 3 first (gate checks) — gives the orchestrator a clean safety net to fall back on when the hook blocks a write.
2. Ship Plan 5 with the hook **active but non-blocking** for one release: log violations to a `progress.log` audit line and let the write proceed. This shakes out any false positives from existing workflows without causing user-visible breakage.
3. One release later, flip to **blocking mode** (default). Release notes emphasize the behavior change and the `FORGE_SKIP_WRITE_VALIDATION=1` escape hatch.
4. Measure: run a reference sprint end-to-end; expect zero hook rejections on well-formed workflows. If rejections appear, triage the workflow — do not loosen the schema.

## 12. Risks & rollback

| Risk | Mitigation |
|---|---|
| Hook blocks a legitimate write due to schema gap | Non-blocking mode in first release surfaces these cases. `FORGE_SKIP_WRITE_VALIDATION=1` is always available as a last resort. |
| Hook adds latency to every write | Regex-only for non-matching paths (<50ms); full validation only on Forge-owned paths. Hook timeout set to 5000ms. |
| Hook fails to start (node path, missing schema) | Hook script fails open (exit 0) with a stderr warning. Rationale: a broken validator must never block legitimate work; `validate-store.cjs` catches violations post-hoc as backup. |
| Sidecar schema drifts from event schema | Drift-guard test in §9 prevents this. |
| `Edit` diff computation produces wrong post-edit contents | Use the actual Edit semantics library (same one the tool uses) or read the file and apply the replacement literally. Test coverage on the Edit path. |

**Full rollback:** remove the hook registration from `forge/hooks/hooks.json`. Store-cli in-tool validations (§8) can stay — they are harmless additions. No persisted state to revert. Schemas added to `forge/schemas/` can remain unused.

## 13. Acceptance criteria

- [ ] Hook registered on `Write`, `Edit`, `MultiEdit`; passes through non-Forge paths.
- [ ] All four new/closed validation paths in `store-cli.cjs` enforce their schemas.
- [ ] Three new schema files present, referenced by the registry, and covered by tests.
- [ ] Drift-guard test asserts sidecar schema is a subset of event schema.
- [ ] Malformed write produces a clear, actionable error message.
- [ ] `FORGE_SKIP_WRITE_VALIDATION=1` escape hatch works and logs an audit line.
- [ ] All new tests pass; all existing tests still pass.
- [ ] Reference sprint completes with zero hook rejections on well-formed workflows.
- [ ] After Plan 5 ships, `validate-store.cjs` run against a fresh sprint reports zero violations without needing `--fix`.

## 14. Out-of-band artifacts

- `forge/migrations.json`: `regenerate: ["hooks", "schemas"]`, `breaking: false`
  (non-blocking first release) then `breaking: true` when blocking mode flips on,
  `manual: ["Run /forge:update to install the new write-boundary hook."]`
- `CHANGELOG.md` entries for both releases (non-blocking, then blocking).
- Security scan saved to `docs/security/scan-v{VERSION}.md`.
- `forge/tools/build-manifest.cjs` mapping updated if new schema files need to be tracked in the manifest.

---

## 15. Relationship to earlier plans

- **Plan 1 (persona by reference):** the persona frontmatter should include a `write_contract` bullet pointing at §10 so every persona reminds its subagent of the boundary contract.
- **Plan 2 (artifact summaries):** summaries are written to `task.summaries.*` via `store-cli set-summary`; Plan 5 makes that write path one of many valid routes (agent could also Edit task.json directly; the hook validates either way).
- **Plan 3 (gate checks):** preflight-gate verifies prerequisites before spawn; Plan 5 verifies data shape at write time. Complementary: Plan 3 guards state transitions, Plan 5 guards state contents.
- **Plan 4 (context pack):** orthogonal — context pack is a read optimization, not a write path.

Together, Plans 3 and 5 implement the full contract: **"agents are free to bypass deterministic tools, as long as they honor schema on data and messages."** Plan 3 ensures phases don't skip prerequisites; Plan 5 ensures writes can't violate schemas. With both in place, the probabilistic layer is constrained exactly where it must be — and nowhere else.
