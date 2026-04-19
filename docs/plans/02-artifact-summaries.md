# Plan 2 — Artifact Summaries in Task Manifest

**Category:** Token Economy (primary), Speed (secondary)
**Target version:** minor bump after Plan 1 ships
**Estimated effort:** 4–5 engineer days
**Breaking:** No (schema fields are optional; old tasks remain valid)

---

## 1. Problem

Across a task's lifecycle, `PLAN.md`, `CODE_REVIEW.md`, `VALIDATION.md`, and
similar artifacts are re-read by subagents 6+ times (plan, plan-review,
implement, review-code, validate, approve, commit). Each read pulls the full
artifact into the subagent's prompt. For a 1,500-line `PLAN.md` across 6
phases, that is ~9,000 lines of redundant context per task. Over a 10-task
sprint this dominates token spend.

Most downstream phases only need a compressed view of prior artifacts:
objective, key changes, findings, verdict. The full artifact is an escalation
path, not a default.

## 2. Goal

Cache terse, structured summaries on the task record as each phase completes.
Inject summaries (not full artifacts) into downstream subagent prompts.
Subagents retain the ability to read full artifacts from disk when the
summary is insufficient.

## 3. Scope

**In scope:**
- Add optional `summaries` object to the task schema (and bug schema)
- New `store-cli set-summary` subcommand
- Each phase workflow emits a terse `SUMMARY.json` sidecar alongside its full artifact
- Orchestrator reads summaries from task state and injects into downstream prompts
- Fallback: if summary missing, prompt instructs subagent to read full artifact

**Out of scope:**
- Auto-generating summaries from artifact contents (subagent produces them
  explicitly as part of the phase)
- Retrofitting summaries onto completed tasks
- Schema changes to artifacts themselves (still full markdown on disk)

## 4. Files to touch

| File | Change |
|---|---|
| `forge/schemas/task.schema.json` | Add optional `summaries` field |
| `forge/schemas/bug.schema.json` | Same |
| `forge/tools/store-cli.cjs` | New `set-summary` subcommand |
| `forge/tools/__tests__/store-cli.test.cjs` | New test cases |
| `forge/meta/workflows/meta-plan-task.md` | Emit `PLAN-SUMMARY.json`, call `set-summary` |
| `forge/meta/workflows/meta-implement.md` | Emit `IMPLEMENTATION-SUMMARY.json` |
| `forge/meta/workflows/meta-review-plan.md` | Emit `REVIEW-PLAN-SUMMARY.json` |
| `forge/meta/workflows/meta-review-implementation.md` | Emit `REVIEW-IMPL-SUMMARY.json` |
| `forge/meta/workflows/meta-validate.md` | Emit `VALIDATION-SUMMARY.json` |
| `forge/meta/workflows/meta-orchestrate.md` | Inject `task.summaries.*` into phase prompts |
| `forge/meta/workflows/meta-fix-bug.md` | Same integration for bug phases |
| `forge/migrations.json`, `CHANGELOG.md`, `forge/integrity.json`, `forge/commands/health.md` | Standard release checklist |
| `docs/concepts/task.md` | Update if lifecycle changes (fields-only, no state machine change — confirm with reviewer) |

**Manifest rebuild required:** No meta/ file additions unless a new workflow
template is introduced. Confirm during implementation.

## 5. Schema change

Add to `forge/schemas/task.schema.json` (and analogue in `bug.schema.json`):

```json
{
  "summaries": {
    "type": "object",
    "description": "Terse structured summaries of phase artifacts. Optional; full artifacts on disk remain authoritative.",
    "properties": {
      "plan":           { "$ref": "#/definitions/phaseSummary" },
      "review_plan":    { "$ref": "#/definitions/phaseSummary" },
      "implementation": { "$ref": "#/definitions/phaseSummary" },
      "code_review":    { "$ref": "#/definitions/phaseSummary" },
      "validation":     { "$ref": "#/definitions/phaseSummary" }
    },
    "additionalProperties": false
  },
  "definitions": {
    "phaseSummary": {
      "type": "object",
      "required": ["objective", "written_at"],
      "properties": {
        "objective":   { "type": "string", "maxLength": 280 },
        "key_changes": { "type": "array", "items": { "type": "string", "maxLength": 200 }, "maxItems": 12 },
        "findings":    { "type": "array", "items": { "type": "string", "maxLength": 200 }, "maxItems": 12 },
        "verdict":     { "type": "string", "enum": ["approved", "revision", "n/a"] },
        "written_at":  { "type": "string", "format": "date-time" },
        "artifact_ref":{ "type": "string", "description": "Relative path to the full artifact" }
      },
      "additionalProperties": false
    }
  }
}
```

**Invariant:** summary size is bounded by schema (max ~2KB per phase). This
caps worst-case prompt bloat even if all summaries are present.

**Concepts diagram check:** per `CLAUDE.md`, schema changes affecting
lifecycle require updating `docs/concepts/*.md`. This change adds fields
but does not alter the state machine. Still, review `docs/concepts/task.md`
and add a fields section if one does not exist.

## 6. `store-cli set-summary` subcommand

Shape:

```
store-cli set-summary <taskId> <phase> <jsonFile>
```

Behaviour:

1. Load current task JSON.
2. Validate `<jsonFile>` against `phaseSummary` definition — reject on
   schema violation with a clear error.
3. Merge into `task.summaries[<phase>]`, overwriting any prior value.
4. Write task JSON back atomically (tmp + rename).
5. Exit 0 on success; non-zero on schema failure or missing task.

Bug analogue: `store-cli set-bug-summary <bugId> <phase> <jsonFile>`.

## 7. Workflow changes (per phase)

Each phase workflow gains a short closing section:

```markdown
## Emit summary sidecar

Before ending your turn, write `{PHASE}-SUMMARY.json` to the task directory:

{
  "objective": "One sentence describing what this phase set out to do.",
  "key_changes": ["Max 12 bullets, 200 chars each"],
  "findings":    ["Required for review phases; reviewer's key observations"],
  "verdict":     "approved | revision | n/a",
  "written_at":  "<ISO 8601>",
  "artifact_ref":"PLAN.md"
}

Then call:

  node .forge/tools/store-cli.cjs set-summary {task_id} {phase} \
    engineering/sprints/{sprint}/tasks/{task}/{PHASE}-SUMMARY.json

If set-summary fails, fix the sidecar and retry. Do not proceed without
a valid summary.
```

## 8. Orchestrator prompt injection

`meta-orchestrate.md` phase-prompt composer gains:

```
Prior phase summaries (fast path — full artifacts on disk if you need more):

- Plan: {task.summaries.plan.objective}
  Key changes: {task.summaries.plan.key_changes, bulleted}
  Full artifact: {task.summaries.plan.artifact_ref}

- Code review: {task.summaries.code_review.objective}
  Findings: {task.summaries.code_review.findings, bulleted}
  Verdict: {task.summaries.code_review.verdict}
  Full artifact: {task.summaries.code_review.artifact_ref}

If any summary above is missing or marked "unavailable", read the
corresponding full artifact directly before proceeding.
```

**Graceful degradation:** if `task.summaries.{phase}` is absent, emit
`"Summary unavailable — read {artifact_ref} for full context."` instead. This
keeps old tasks (created pre-upgrade) functional without migration.

## 9. Tests (write failing first)

### `store-cli.test.cjs` additions

- `set-summary` round-trips a valid summary and produces correctly shaped task JSON.
- Schema violation (missing `objective`) rejects with non-zero exit and clear stderr.
- Overlong `key_changes` array (>12) rejects.
- Overlong `objective` (>280 chars) rejects.
- Unknown phase name rejects.
- Repeated `set-summary` for same phase overwrites, does not append.
- Missing task ID exits non-zero with "task not found".
- Atomic write: simulated failure mid-write leaves prior JSON intact (no partial writes).

### Schema conformance test (if not already covered)

- Example task JSON with populated `summaries` validates.
- Example task JSON with `summaries: {}` validates (optional field).
- Example task JSON with extra property inside a summary rejects.

## 10. Rollout

1. Ship schema change + `set-summary` subcommand + tests in one commit.
2. Ship workflow edits in a follow-up commit (or same release) so summaries
   start populating from the first run after upgrade.
3. Old in-flight tasks (no summaries) continue to work via graceful
   degradation — subagents read full artifacts as before.
4. After one full release cycle, measure prompt token count per phase on a
   reference sprint. Target: downstream phases show noticeable reduction in
   per-prompt artifact content size.

## 11. Risks & rollback

| Risk | Mitigation |
|---|---|
| Summary drifts from artifact (subagent writes misleading summary) | Summary is produced by the same subagent that wrote the artifact — same context, same turn. Reviewer personas can flag divergence. |
| Downstream subagent over-trusts the summary and misses detail in the full artifact | Prompt explicitly offers `artifact_ref` and says "read if summary insufficient." Reinforce in persona responsibilities (Plan 1 frontmatter). |
| Schema migration surprises | Additive optional field; no migration of existing data needed. |
| Atomic write race on concurrent phase execution | Orchestrator already serializes phases per task. Document the invariant in the tool. |

**Full rollback:** remove the `summaries` read from workflow prompts (they
fall back to existing "read full artifact" behaviour). Schema fields can
remain — they are optional. No destructive migration.

## 12. Acceptance criteria

- [ ] Schema change validates against a representative fixture set.
- [ ] `store-cli set-summary` subcommand implemented with full test coverage.
- [ ] All 5 phase workflows emit summaries and invoke `set-summary`.
- [ ] Orchestrator injects summaries with graceful fallback.
- [ ] Missing-summary fallback tested on a synthetic old-format task.
- [ ] All new tests pass; all existing tests still pass.
- [ ] Reference-sprint measurement shows measurable reduction in re-read
      content injected into downstream phase prompts.

## 13. Out-of-band artifacts

- `forge/migrations.json`: `regenerate: ["workflows"]`, `breaking: false`,
  `manual: []`, notes: `"Tasks gain optional summaries field; phases emit summary sidecars. Old tasks continue to work unchanged."`
- `CHANGELOG.md` entry.
- `docs/concepts/task.md` reviewed for fields-section update.
- Security scan saved to `docs/security/scan-v{VERSION}.md`.
