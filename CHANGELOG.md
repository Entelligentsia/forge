# Changelog

All notable changes to Forge are documented here.
Format: newest first. Breaking changes are marked **△ Breaking**.

---

## [0.44.7] — 2026-05-21

**#105 fix — build-persona-pack.cjs schema mismatch.** Tool now accepts both:

- **Base-pack format** (no frontmatter, `init/base-pack/personas/`): derives `id`, `role`, `summary`, `responsibilities`, `outputs`, `file_ref` from content and filename. Previously threw "no frontmatter block found".
- **Meta format** (YAML frontmatter, `meta/personas/`): existing behavior preserved; `file_ref` must be in frontmatter.

Skills: `file_ref` is now derived from the file path when absent from frontmatter (base-pack skills). Previously threw "frontmatter missing required field 'file_ref'".

Guard: `buildPack()` throws when both dirs are empty, preventing silent empty-pack writes that caused `/forge:health` to report persona-pack permanently stale.

**Regenerate:** tools:build-persona-pack

---

## [0.44.6] — 2026-05-20

**P1 bug-fix batch (forge-cli#25 — defects C, D, E).** Three tool fixes to address defects discovered in the forge-cli 0.11.0 dogfooding session.

**C — substitute-placeholders.cjs base-pack path stale.** Tool now probes `.base-pack/` (bundled install layout) before `init/base-pack` (source layout) when no `--base-pack` flag is supplied. `--help`/`-h` now short-circuits before any path resolution so the usage text is always accessible.

**D — store-cli list event.** The `list` subcommand previously exited 1 with "Unknown entity type: event" despite `event` being in the documented entity set. Fixed by adding an `event` case to `listEntities()` that traverses all sub-directories under `.forge/store/events/` (`bugs/`, `enhancement/`, and per-sprint `<sprintId>/` dirs) and returns the union. Sidecar files (`_`-prefixed) are skipped.

**E — substitute-placeholders.cjs --category flag.** New `--category <name[,name]>` flag limits materialisation to the specified subdirectory names (e.g. `--category personas` writes only `.forge/personas/` and skips workflows, skills, templates, and commands). `commands/regenerate.md` documents the scope-enforcement rule for callers that invoke the tool directly during per-category regeneration.

**Regenerate:** tools:substitute-placeholders, tools:store-cli, commands:regenerate

---

## [0.44.5] — 2026-05-20

**Migration apply path + config schema.** Two FORGE-S23 contributions to the plugin distribution. First, `migrations.json` gains the `0.44.4→0.44.5` entry consumed by forge-cli's new `runMigrations()` deterministic engine: semver-range traversal `[from, to)` on keys, per-category resolver covering 84 unique category strings, idempotency ledger at `.forge/applied-migrations.json`, always-on schema refresh post-pass, fileOps forward-compat, and path-traversal defense. The `/forge:update` flow in forge-cli prompts to apply pending migrations after upgrade (`FORGE_NON_INTERACTIVE=1` auto-applies); the `update_plan` and `plan_task` workflows reference the new application steps. Second, `forge/schemas/config.schema.json` is added so the validate-write hook (also ported to forge-cli in this sprint) can enforce `.forge/config.json` structure at write time. No tool or persona changes — the plugin's role is to ship the migration entry and the new schema; the engine lives in forge-cli (v0.11.0).

**Regenerate:** workflows:update_plan, workflows:plan_task

---

## [0.44.4] — 2026-05-19

**Supervisor persona forbids FSM writes from review phases.** `meta-supervisor.md` gains a top-level Iron Law: "The Supervisor NEVER writes entity status — the workflow orchestrator owns all FSM transitions. Do not call `store-cli update-status` from a review phase. The verdict signal travels through the SUMMARY's `verdict` field, not `entity.status`." The workflow-level guard at `meta-review-plan.md:76` and `meta-review-implementation.md:82` ("Bug mode — NO status write") already existed; this is the persona-level reinforcement so the model never attempts the write in the first place. Surfaced during FORGE-BUG-003 re-run testing of the forge-cli stale-ctx fix: a supervisor subagent called `update-status bug FORGE-BUG-003 status plan-approved` against a bug already in terminal `fixed` state. `store-cli` correctly rejected the illegal transition and the run completed (the rails held), but the persona now discourages the attempt.

**Regenerate:** personas:supervisor

---

## [0.44.3] — 2026-05-19

**phaseSummary accepts `route`.** Add `route: { enum: ["A", "B"] }` to `bug.schema.json` § `$defs.phaseSummary` and the mirrored `PHASE_SUMMARY_SCHEMA` constant in `forge/tools/store-cli.cjs`. Both must stay in sync — the JSON schema validates entity reads, the constant validates `set-summary`/`set-bug-summary` writes. EMG-BUG-001 v0.44.2 first run failed at `route: undeclared field` because the schema's `additionalProperties: false` rejected the new field even though meta-fix-bug had declared it as the canonical triage-route signal. Tests added covering valid (`route: "A"`) and invalid (`route: "C"`) writes.

**Regenerate:** tools:store-cli, schemas:bug

---

## [0.44.2] — 2026-05-19

**parse-gates accepts `n/a` verdict.** `forge/tools/parse-gates.cjs` hardcoded the `after <phase> = <verdict>` verdict set to `{approved, revision}`, even though `read-verdict.cjs § ALLOWED_VERDICTS` accepts a third value `n/a` (the legitimate verdict for setup phases that produce no review signal — plan, implement, triage). The new fix-bug meta uses `after triage = n/a` to gate plan/review-plan/implement on triage having completed, which caused EMBERGLOW-BUG-001 (v0.44.1 second run) to halt at preflight exit 2 ("gate misconfigured"). Parser now matches read-verdict's verdict set. Test added covering the n/a path.

**Regenerate:** tools:parse-gates

---

## [0.44.1] — 2026-05-19

**Field-name fix in meta-fix-bug Triage Judgement.** The Path A/B decision field is now `summaries.triage.route` (was `summaries.triage.path` in v0.44.0). First-run testing on emberglow (EMBERGLOW-BUG-001) surfaced a collision: the triage subagent reliably wrote `"path": "A"` onto the bug record's top-level `path` field (whose actual purpose is the artifact directory), causing `TRIAGE.md` to land under `.forge/store/bugs/` instead of `engineering/bugs/`. The collision was runtime-agnostic — observed on both Claude Code and pi. Renaming the field eliminates the trap. The meta now carries a "Field-naming caution" callout citing the regression.

**Regenerate:** workflows:fix_bug

---

## [0.44.0] — 2026-05-19

**fix-bug workflow rewrite.** Single-track triage with a post-triage Path A (short-circuit) / Path B (full loop) branch — the only structural deviation from the run-task pipeline. Aligns personas, phases, gates, and event emission with `meta-orchestrate.md` otherwise.

### Added

- `meta-fix-bug.md` — full rewrite. Pipeline phases: `triage → [Path A or B] → finalize`. Path A skips plan-fix and review-plan when triage classifies the bug as `minor`, single-file, ≤20-line diff, no schema/API/migration impact, regression test obvious from repro. Path B is the default and runs the full plan/review/implement/review/approve/commit shape. Triage subagent records the path decision in `summaries.triage.path ∈ {"A","B"}`; orchestrator selects `phases_A` or `phases_B` before entering the main loop. No mid-pipeline switching.
- Iron Laws specific to fix-bug — path decided once; status writes only in triage (`reported → triaged → in-progress`) and commit (`in-progress → fixed`); no silent phase skipping.
- `store.cjs purgeBugEvents(bugId)` — purges only the matching bug's events (filtered by `event.bugId`) from the shared `events/bugs/` virtual sprint dir, plus sidecars whose `_{eventId}_usage.json` filename matches a purged primary. Other bugs' events untouched.
- Reserved virtual sprint dir `bugs` in `store-cli emit` and `validate-store` — extends the existing `SYS-*` carve-out so bug-phase events land cleanly in `.forge/store/events/bugs/` per `validate-store.spec.md`.
- Dual-mode entity-kind resolution in six sub-workflow metas (plan-task, implement, review-plan, review-implementation, approve, commit). Each preamble detects `--task {id}` vs `--bug {id}` and routes status writes, summary writes (`set-summary` vs `set-bug-summary`), and preflight calls accordingly. Bug mode suppresses all status writes except commit (`→ fixed`).
- Preflight gate defences `forbid bug.status == approved|verified` on every fix-bug phase — belt-and-suspenders against future re-introduction of those enum values.

### Changed

- **bug.schema.json status enum** — collapsed from `["reported","triaged","in-progress","fixed","approved","verified"]` to `["reported","triaged","in-progress","fixed"]`. The `approved` and `verified` values were vestigial: no workflow phase wrote them, and their presence in the enum invited LLM-translated task workflows to attempt `update-status bug ... approved`, which is what produced FORGE-BUG-002.
- `store-cli.cjs BUG_TRANSITIONS` — terminal state is now `fixed`. Removed `approved` and `verified` rows and their cross-edges.
- `store-cli.cjs TERMINAL_STATES` — bug terminal is now `fixed` (was `verified`).
- `collate.cjs` — bug-phase cost aggregation now reads from the shared `events/bugs/` dir filtered by `event.bugId`. Previously called `loadSprintEvents(bug.bugId)` which targeted the non-existent `events/{bugId}/` path, silently losing cost-summary data and leaking disk via never-purged events.
- `collate.cjs --purge-events` — when given a bug ID, dispatches to `purgeBugEvents` (filtered delete) instead of `purgeEvents` (whole-directory delete). The shared `events/bugs/` dir is preserved for other bugs.
- `meta/store-schema/bug.schema.md` and `meta/tool-specs/store-cli.spec.md` — documented state machine collapsed to match the 4-state enum. Both files explain the FORGE-BUG-002 trap and why `approved`/`verified` were removed.
- `meta-approve.md` — gained a required step 5 (set-summary / set-bug-summary). For bugs this is the canonical approve-verdict signal read by `read-verdict.cjs § BUG_PHASE_VERDICT_SOURCE`.

### Fixed

- FORGE-BUG-002 — `Illegal transition: verified → approved` during the fix-bug approve phase. Root cause was the schema enum trap (described above) combined with no preflight gate against terminal-state re-entry. Fixed at the source by removing the enum members; preflight gates remain as belt-and-suspenders.
- "Unknown sprintId: bugs" warning on every bug-phase event emit. The shared virtual dir is now a reserved name.
- Silent cost-summary data loss in bug INDEX.md. Bug runs now emit their token cost into the bug artifact's `## Cost Summary` section as designed.
- Disk leak: bug events were never purged because the workflow purged `events/{bugId}/` (empty) while emitting to `events/bugs/` (shared). Now the purge targets the matching events in the correct dir.

**Regenerate:** workflows:fix_bug, workflows:plan_task, workflows:implement_plan, workflows:review_plan, workflows:review_code, workflows:architect_approve, workflows:commit_task, tools:store-cli, tools:store, tools:validate-store, tools:collate, schemas:bug

> Manual: if any bug record in `.forge/store/bugs/` carries status `approved` or `verified`, transition it to `fixed` before regeneration (the enum values were removed). Use: `FORGE_ALLOW_FORCE=1 node .forge/tools/store-cli.cjs update-status bug <BUG-ID> status fixed --force`.

---

## [0.43.19] — 2026-05-17

**FORGE-S22 STORE-TIGHTEN closure.** Sprint goal: drop store-op aggregate failure rate from 21.8% baseline to ≤12%. Closed PASS at 9.27% on the emberglow fresh-corpus capture (151 ops / 18 transcripts / 2 tasks). Versions 0.43.17 (G3 aliases), 0.43.18 (G4 vocab drift), and 0.43.19 (G7 FK-check) collectively deliver the sprint goals. Verification harness: forge-cli `test/analysis/store-friction/` (Mode A SHA256-pinned regression + Mode C live LLM testbench).

**G7 — Emit FK-check + reserved-prefix carve-out + orphan event-dir flagger.**

### Added

- `store-cli emit` — foreign-key check on `sprintId` arg. Rejects bare/unknown IDs
  (e.g. `S01` instead of `FORGE-S01`) with structured error message including
  `Unknown sprintId: <X>` + "Did you mean?" suggestion using Levenshtein + suffix
  matching from `lib/suggest.cjs`.
  Valid IDs = directory listing of `.forge/store/sprints/` + reserved `SYS-*` prefix.
- `store-cli emit --allow-synthetic` — new flag bypasses the FK check for synthetic
  or test-harness events. Documented in `--help`.
- Reserved-prefix carve-out: any `SYS-*` pattern is accepted unconditionally
  (system-generated events that predate sprint records).
- `validate-store` Pass 2b — scans `.forge/store/events/` for subdirectories whose
  name is not a known sprintId and does not match `SYS-*`. Flags each as
  `ORPHAN_EVENT_DIR` warning (category preserved in `--json` mode). No auto-delete.

### Tests

All `node --test forge/tools/__tests__/*.test.cjs` pass (1302 tests). New FK-check
cases in `store-cli.test.cjs`; new orphan-dir cases in `validate-store.test.cjs`.

---

## [0.43.18] — 2026-05-17

**G4 — Vocab-drift detector + "Did you mean?" suggestions.** Pairs with G3 (0.43.17) to make store-cli self-correcting under LLM-driven friction.

### Added

- `forge/tools/lib/suggest.cjs` — Levenshtein-based suggestion engine with curated `DRIFT_MAP`
  (8 entries covering the most common LLM token drifts: `task` for `tasks`/`taske`,
  `implementing` for `implementign`, `Approved` for `approved`/`approve`, etc.).
  Public surface: `levenshtein()`, `suggest()`, `normalizeForMatch()`,
  `formatSuggestion()`, `suggestEntityType()`.
- `store-cli.cjs` — suggestions attached at 12 error sites: 7 entity-type rejection paths,
  1 "No transition rules" error, 1 "Illegal transition" error, 2 "Unknown entity" paths,
  and 1 "Unknown command" path.
- `lib/validate.js` — enum-validation and undeclared-field errors now append a suggestion
  when the offending value is within Levenshtein-2 of a valid alternative.

### Why

Fresh-corpus evidence (FORGE-S22-T06 emberglow capture) confirms agents self-correct
when offered a suggestion: a `list tasks` → "Did you mean `task`?" cycle recovers
on the next turn instead of escalating. Without the suggestion, the agent typically
mis-attributes the failure.

### Tests

46 new unit tests in `suggest.test.cjs`; 10 new CLI integration tests in
`store-cli.test.cjs`. All `node --test forge/tools/__tests__/*.test.cjs` pass.

**Regenerate:** tools:store-cli, tools:validate-store

---

## [0.43.17] — 2026-05-17

**G3 — Six read-aliases for high-friction `get` ops on `store-cli`.**

### Added

- `store-cli get <entity> <id>` — bare alias rewritten to `read <entity> <id>`.
- `store-cli get-task <id>` — alias for `read task <id>`.
- `store-cli get-bug <id>` — alias for `read bug <id>`.
- `store-cli get-sprint <id>` — alias for `read sprint <id>`.
- `store-cli get-summary <taskId> <phase>` — direct switch case `cmdGetSummary`
  (never routed through `write`).
- `store-cli get-bug-summary <bugId> <phase>` — direct switch case `cmdGetBugSummary`.

`ALIAS_MAP` rewrites argv to `['read', entity, id, ...flags]` for the four bare
read-aliases; the two summary aliases stay on their own switch arms to avoid any
write-path coupling.

### Why

T01 friction fixture (927 ops, 21.8% baseline failure rate) had 39 erroring
`get*` ops — agents reaching for `get-task`/`get-sprint`/`get-summary` patterns
that did not exist. Adding the aliases eliminates 37 of those 39 (94.9%) without
schema change or removed verbs.

### Tests

15 new node:test cases in `store-cli.test.cjs` covering each alias plus
byte-equality pairs (`get-task X` == `read task X`) and error variants
(missing args, unknown entity).

**Regenerate:** tools:store-cli, workflows:_fragments_store-cli-verbs

---

## [0.43.16] — 2026-05-15

**Sprint finalization ceremony (Plan 12).** Pairs with forge-cli `v0.6.6`.

### Added

- `event.schema.json` — `sprint-complete` and `sprint-halted` event variants admitted via `allOf` / `if` / `then` branches keyed on `type`. Sprint-scoped requireds (`taskCount`, `completedTaskIds`, `verdict`) and forward-compat fields (`waveCount`, `maxConcurrency`, `pausedAfterTaskIndex`, `haltedAtTaskIndex`, `haltedAtTaskId`, `lastError`) declared at top level so `additionalProperties: false` admits them, made required only within the conditional branches.
- `meta-review-sprint-completion.md` — step-4 finalize block now gated on step-3 verdict:
  - `Approved` → transition sprint to `completed` via `store-cli update-status`.
  - `Revision Required` + orchestrator `mode=partial` → transition to `partially-completed`.
  - `Revision Required` + orchestrator `mode=complete` → no transition; orchestrator surfaces the verdict to the user.

### Changed

- `event.schema.json` top-level `required` array — `taskId`, `phase`, `iteration` moved out of unconditional-required and into a new task-scoped `allOf` branch keyed on every task-event `type` value. Existing task events still validate identically; sprint events no longer carry dishonest task-scoped fields. **△ Schema variant change** — backward-compat by construction (every previously-valid event remains valid).
- `validate-store.cjs` — `allOf` `if`/`then` interpreter extended to support `enum` predicates in `if.properties`, not just `const`. Required so the task-scoped branch (which uses an enum of every task-event type) compiles to the correct conditional.

### Removed

- Broken `sprint-collate-complete` event payload shape — never persisted (schema-rejected at every emit attempt); replaced by the schema-valid `sprint-complete` variant above. No migration data: rejected payloads were never written.

### Tests

All `node --test forge/tools/__tests__/*.test.cjs` pass. New schema-positive cases for `sprint-complete` / `sprint-halted` variants; new schema-negative cases (sprint event with task-scoped `taskId` → rejected by `not` clause).

---

## [0.43.15] — 2026-05-14

**Slice-2 fragment-sweep completion.**

v0.43.14 introduced the orchestrator-emits-everything contract and surgically rewrote the five phase workflows on the run-task chain (plan / review-plan / implement / validate / commit) plus their meta sources. But 16 other workflow bodies — every remaining base-pack workflow — still carried the pre-Slice-2 `Emit the complete event ... via store-cli emit` directive and the `Execute Token Reporting` step in their Finalize blocks. Any subagent reading those workflows (fix-bug, sprint-intake, sprint-plan, collate, retrospective, review-sprint-completion, approve, update-plan, update-implementation, review-code) would faithfully reproduce the exact hallucination class Slice 2 was built to kill.

This patch closes the gap.

### Workflows swept

Meta sources (10): `meta-approve`, `meta-update-implementation`, `meta-review-implementation`, `meta-review-sprint-completion`, `meta-sprint-intake`, `meta-sprint-plan`, `meta-collate`, `meta-update-plan`, `meta-fix-bug`, `meta-retrospective`.

Base-pack mirrors (10): `architect_sprint_plan`, `sprint_retrospective`, `architect_approve`, `collator_agent`, `architect_review_sprint_completion`, `fix_bug`, `update_implementation`, `architect_sprint_intake`, `update_plan`, `review_code`.

In each:
- "Emit the complete event …" bullet → "Do NOT emit a phase event yourself. The orchestrator (or kickoff handler) owns event emission …"
- "Execute Token Reporting" bullet removed (both `(see Generation Instructions)` and `(see _fragments/finalize.md)` variants).

Additionally:
- `meta-fix-bug.md` + `base-pack/fix_bug.md` friction-emit code block → friction-emit.cjs reference (matches the pattern shipped for `meta-orchestrate.md` in v0.43.14).

### Honest absence vs continued hallucination

For workflows that are kickoff-only standalones today (sprint-intake, sprint-plan, collate, retrospective, review-sprint-completion), removing the hardcoded emit means events for those operations are not produced until the corresponding forge-cli kickoff handlers learn to emit on the LLM's behalf. That follow-up is filed; in the meantime, no event is strictly better than a hallucinated one.

### Tests

1202 pass.

### Not in this patch

- forge-cli kickoff handler emit wiring (separate concern).
- T03/T07 native handler implementation (separate sprint task work).

---

## [0.43.14] — 2026-05-14

**Telemetry contract Slice 2 — orchestrator-emits-everything.**

Slice 1 (v0.43.13) made `provider` required and moved cost out of the schema. But subagents were still hand-building 14-field event JSON containing runtime facts — and hallucinating them. The HLO-S01-T05 evidence: events recorded `provider: "anthropic"` and `model: "claude-sonnet-4-20250514"` while the subagent transcript showed it actually ran on `glm-5.1:cloud`. The LLM is the wrong actor for runtime facts; every guess will be wrong by construction. Slice 2 makes runtime attribution the orchestrator's responsibility end-to-end.

**Workflow / fragment changes.**

- `meta/workflows/_fragments/event-emission-schema.md` (and base-pack mirror) rewritten. Replaces "build a 14-field event JSON" with "write `{PHASE}-SUMMARY.json`; the orchestrator emits the event". **Removes ALL hardcoded example model strings** — the source of pattern-copy hallucination.
- `meta/workflows/_fragments/friction-emit.md` (and base-pack mirror) rewritten around the new `friction-emit.cjs` tool. Subagents record judgement only; the orchestrator drains the file at phase-end and stamps runtime attribution.
- Phase meta workflows (`meta-plan-task`, `meta-review-plan`, `meta-implement`, `meta-validate`, `meta-commit`) and their base-pack mirrors (`plan_task`, `review_plan`, `implement_plan`, `validate_task`, `commit_task`) drop the `Emit the complete event ... via store-cli emit` line and the `Execute Token Reporting` step. Subagents now only write SUMMARY and return.
- `meta-orchestrate.md` + base-pack `orchestrate_task.md` Event Emission and Friction Emit sections rewritten to describe the new contract: orchestrator captures runtime telemetry (model, provider, usage), brackets wall times, reads SUMMARY judgement, composes the canonical event, and emits it. Orchestrator-experienced friction emits inline (`persona: "orchestrator"`).

**Tool changes.**

- New `forge/tools/friction-emit.cjs` — judgement-only CLI: `--workflow --persona --issue [--subkind --evidence]`. Refuses any runtime-attribution flag (`--model`, `--provider`, `--eventId`, timestamps, tokens) with a clear error. Appends one record per call to `.forge/cache/FRICTION-{workflow}.jsonl`. Test-first per Iron Law 2 (20 tests).
- New `forge/tools/backfill-provider.cjs` — one-shot migration helper for the 0.43.13 manual[] item. Walks `.forge/store/events/**/*.json`, stamps `provider: "unknown"` on any event missing the field, skips sidecars. Test-first per Iron Law 2 (7 tests).

**Runtime emit site.**

The matching forge-cli change (`run-task.ts` composes and emits the canonical event after each subagent returns; drains FRICTION-{phase}.jsonl) ships in forge-cli v0.6.5.

**Migration.**

The 0.43.13 manual[] note promised a backfill helper for legacy events missing `provider`. It now ships: `node $FORGE_ROOT/tools/backfill-provider.cjs`. Run once after upgrade.

**Tests.** 1202 pass.

---

## [0.43.13] — 2026-05-14

**Telemetry contract fix (Slice 1) — orchestrator owns token capture, subagents stop self-probing.**

The previous capture pipeline asked every subagent to invoke `/cost` and write a `tokenSource: "missing"` placeholder when the probe failed — which it always did, because the pi runtime has no `/cost` probe, and the schema enum is `[reported, estimated]`. Every HLO-S01-T04 phase logged 8 `schema_drift` errors and the dataset captured nothing usable.

**Schema changes.**

- `event.schema.json` and `event-sidecar.schema.json` add `provider` (required on the canonical event, optional on the sidecar). Same model is priced differently across providers (Anthropic direct vs Bedrock vs Vertex; ZAI cloud vs self-host); cost is unattributable without it.
- Both schemas drop `estimatedCostUSD` entirely. Cost is derived at collate time from `(provider, model, tokens)` via `tools/lib/pricing.cjs`. Persisting cost on records makes the dataset lie when pricing changes.
- `tokenSource` enum stays `[reported, estimated]`. The "missing" case is dead: if no telemetry is available, the event is emitted without token fields. Honest absence beats placeholder zeros.

**Workflow changes.**

- `meta/workflows/_fragments/finalize.md` (and its base-pack mirror) no longer instruct subagents to probe or write sidecars. New rule: subagents MUST NOT write token sidecars; the orchestrator emits the canonical event with provider-reported usage on their behalf.
- Slice 2 (the forge-cli runtime emit site) will wire the orchestrator side — out of scope here. With this slice landed, sidecar writes from subagents stop producing schema_drift errors.

**Tool changes.**

- `store-cli.cjs` — `record-usage` accepts `--provider`; `--estimated-cost-usd` is explicitly rejected with a pointer to `lib/pricing.cjs`. New `discoverProvider()` helper mirrors `discoverModel()`: reads `FORGE_PROVIDER` / `CLAUDE_CODE_PROVIDER`, falls back to `"unknown"`. `emit` auto-populates `provider` the same way it auto-populates `model`.
- `estimate-usage.cjs` — removed the `PRICE_PER_1M` heuristic table and `DEFAULT_PRICE_PER_1M`. The estimator now returns `{inputTokens, outputTokens, tokenSource: "estimated"}` only. Pricing lives in `lib/pricing.cjs` exclusively.
- `collate.cjs` — dropped the `missing` bucket from `tokenSourceCounts`. Token-less events surface as husks in the Ingestion Quality section (where they already were), not as a separate bucket.

**Compatibility note.** Existing event records that lack `provider` or carry `estimatedCostUSD` will fail strict validation. The migration entry lists this as a manual step — a one-shot `backfill-provider.cjs` will ship as a follow-up. For dogfooding here in `forge-engineering`, the affected events under `.forge/store/events/` either have no tokens (and won't be re-validated) or pre-date this contract.

Tests: 1173 pass (1 pre-existing `FRAGMENT_MAP has 4 entries` failure on `main`, unrelated to this slice — that's a separate stale-allowlist test left over from the 0.43.11 fragment-count change).

---

## [0.43.10] — 2026-05-13

**Verdict-source refactor — preflight gates read the store, not markdown.**

`parse-verdict.cjs` is gone. The `after <phase> = approved` predicate in `preflight-gate.cjs` previously regex-parsed a literal `**Verdict:**` line from review markdown files (PLAN_REVIEW.md, CODE_REVIEW.md, VALIDATION_REPORT.md, ARCHITECT_APPROVAL.md). The structured signal was already present one `store.getTask(id)` call away — `set-summary` writes `task.summaries.<canonical>.verdict ∈ {approved, revision, n/a}` validated against `PHASE_SUMMARY_SCHEMA`, and the approve phase transitions `task.status` to `"approved"`. The markdown layer was both fragile (smaller models invent equivalent prose) and redundant.

**New module.** `forge/tools/read-verdict.cjs` centralises:

- `PHASE_VERDICT_SOURCE` map: `review-plan → review_plan`, `review-code → code_review`, `validate → validation`, `approve → STATUS_SOURCE` (sentinel).
- `readVerdict({ record, phase })` returns `{ verdict, source, key }` for diagnostic error messages.
- CLI shim: `read-verdict.cjs --phase X --task Y`.

**Three bug classes collapsed into one fix.**

- [forge#91](https://github.com/Entelligentsia/forge/issues/91) — architect wrote `## Approval Status: ✅ APPROVED` instead of `**Verdict:**`. Now reads `task.status`.
- [forge-cli#11](https://github.com/Entelligentsia/forge-cli/issues/11) — `review-code → code_review` (reversed words). Now centrally mapped.
- The underscore-swap defensive fallback dance in run-task.ts — still works, no longer needed.

**Removed.** `forge/tools/parse-verdict.cjs` + its test. `preflight()`'s `verdictSources` parameter. `resolveVerdictSources` helper. Markdown read of review files.

**meta-approve.md** updated to clarify the `**Verdict:**` markdown line is a human breadcrumb only; the load-bearing source is `task.status`.

**Byte-budget lint** asserting presence of `**Verdict:**` in base-pack workflows is retained but documented as advisory — useful for generated workflow readability, not gating.

**Tests.** 1166 (was 1172): −10 (parse-verdict suite deleted) +11 (read-verdict suite added) +2 (approve via task.status; revision-in-store) −5 (verdictSources-shaped fixtures collapsed into one happy-path). Live testbench HLO-S01-T01 commit preflight: EXIT=0.

---

## [0.43.9] — 2026-05-13

**meta-approve.md — canonical Verdict-line contract.**

`parse-verdict.cjs` (consumed by the commit-phase preflight gate) recognizes only the literal `**Verdict:** [Approved | Revision Required]` line. The review-plan / review-code / validate meta workflows already document this; `meta-approve.md` did not. Architect personas (especially smaller models) wrote `## Approval Status: ✅ APPROVED` — semantically equivalent, but not parseable.

**Live trigger.** `/forge:run-task HLO-S01-T01` phase 8 (commit):

```
× preflight gate failed for phase commit (exit 1); halting.
Gate failed for phase "commit":
  - predecessor review for "approve" has no parseable **Verdict:** line
    (.../HLO-S01-T01/ARCHITECT_APPROVAL.md)
```

**Fix.** `meta-approve.md` Step 3 (Sign Off) now mandates the canonical `**Verdict:**` line and notes that downstream gates parse this exact form. Added Generation Instruction `Verdict Detection` mirroring meta-review-plan / meta-review-implementation / meta-validate.

**Structural lint.** `base-pack-byte-budget.test.cjs` gains a new describe block asserting every verdict-emitting phase file (`review_plan.md`, `review_code.md`, `validate_task.md`, `architect_approve.md`) contains the literal `**Verdict:**` token. A future drop-through fails the build, not the smoke test.

---

## [0.43.8] — 2026-05-13

**preflight-gate.cjs — gate-less phases pass through instead of escalating.**

Some run-task pipeline phases are gate-less by design — `writeback` (collator deterministic regen) has no predecessor verdict to check. Previously `preflight-gate.cjs` exited 2 (misconfiguration) when no workflow declared the phase OR when the located workflow lacked a `gates phase=<role>` fence. Live regression at phase 7 of `/forge:run-task HLO-S01-T01`:

```
× forge:run-task — preflight gate escalated for phase writeback (exit 2);
  manual intervention required.
```

Exit 2 is now reserved for real misconfiguration (bad CLI args, parse errors). Both gate-less paths (`no workflow declares phase` and `workflow exists but declares no gate block`) exit 0 with an informational stderr note:

```
preflight-gate: no preflight gates defined for phase "writeback" — skipping
```

`forge:run-task`'s preflight check sees exit 0 and advances to dispatch normally.

**Regression test.** One existing test that asserted `exit 2 when no workflow file contains the requested phase` flipped to assert `exit 0` (with the writeback example baked in). Added a sibling test: workflow declares the phase via frontmatter but has no gates fence → also exit 0.

---

## [0.43.7] — 2026-05-13

**Kickoff-shim materialization markers — third (final) wave + structural lint.**

The kickoff-shim materialization markers (Iron Laws, Store-Write Verification, `forge_store` token, `.forge/personas/<name>.md`) were already added to plan/implement (0.43.2) and review-plan/review-code (0.43.5). This release fixes the remaining six subagent-targeted meta workflows that the run-task pipeline traverses:

- `meta-validate.md`
- `meta-approve.md`
- `meta-collate.md`
- `meta-commit.md`
- `meta-update-plan.md`
- `meta-update-implementation.md`

**Live trigger.** Phase 5 (validate) of `/forge:run-task HLO-S01-T01` hard-failed:

```
× workflow regression: Store-Write Verification not found in
  /home/boni/src/forge-testbench/hello/.forge/workflows/validate_task.md
× workflow regression: Iron Laws not found in …
× workflow regression: forge_store not found in …
```

Same root cause as 0.43.2 / 0.43.5: meta workflows missing the four anchor markers that forge-cli's `runForgeSubagent` kickoff shim checks for. Three waves of one-phase-at-a-time discovery is the cost of not having a structural assertion.

**Regression lint.** `forge/tools/__tests__/base-pack-byte-budget.test.cjs` gains a new describe block — `phase files carry kickoff-shim markers` — that iterates every `PHASE_FILES` entry and asserts presence of all four markers. A future wave-four drop-through fails the build, not the smoke test.

**Byte-budget bumps.** Per-file budgets bumped to fit the marker blocks:

- `meta-validate.md`: 4096 → 5120
- `meta-approve.md`: 3072 → 4096
- `meta-commit.md`: 3072 → 4096

Base-pack workflow byte budgets unchanged.

---

## [0.43.6] — 2026-05-13

**preflight-gate.cjs — artifact directory resolution + filename fallback.**

Two compounding defects in `forge/tools/preflight-gate.cjs` surfaced live during `/forge:run-task HLO-S01-T01` phase 3 (implement). Pipeline hard-failed:

```
× forge:run-task — preflight gate failed for phase implement (exit 1); halting.
Gate failed for phase "implement":
  - cannot read predecessor review for "review-plan" at
    .../HLO-S01-T01/TASK_PROMPT.md/PLAN_REVIEW.md: ENOTDIR
```

Root causes:

1. `resolveTaskArtifactDir` Pass 1 required `entry.startsWith(taskId + '-')` — rejecting directories named exactly `<taskId>` (modern convention, no slug). Pass 2's `<sprintId>-` prefix didn't help when taskId already embeds sprintId (e.g. `HLO-S01-T01` against sprintId `S01`). Returned `null`.
2. The fallback then set `taskArtifactPath = taskRecord.path`. But `taskRecord.path` is the **primary source file** (e.g. `TASK_PROMPT.md`), not a directory. Predecessor-review resolution then appended `PLAN_REVIEW.md` to the file path → bogus `.../TASK_PROMPT.md/PLAN_REVIEW.md` → ENOTDIR on every `after <phase>` gate.

### Changed

- `forge/tools/preflight-gate.cjs:resolveTaskArtifactDir` Pass 1: now matches `entry === taskId || entry.startsWith(taskId + '-')`. Exact-match acceptance preserves backward compat with legacy `-<slug>` naming.
- `forge/tools/preflight-gate.cjs` `taskArtifactPath` fallback: when `taskRecord.path` has a file extension, dirname() it.
- `forge/tools/__tests__/preflight-gate.test.cjs`: new regression test for the testbench naming pattern (sprint dir `S01`, artifact dir `HLO-S01-T01`).

### Migration

Non-breaking. `regenerate: ["tools:preflight-gate"]`. Bundled forge-cli payloads pick up the fix on next package rebuild; standalone plugin users re-run `/forge:update`.

---

## [0.43.5] — 2026-05-13

**Pack-06 marker regression fix — second wave (review-plan + review-code).**

Adds Iron Laws + Store-Write Verification sections (plus `.forge/personas/supervisor.md` persona-load step and `forge_store` token) to `meta-review-plan.md` and `meta-review-implementation.md` so generated `review_plan.md` and `review_code.md` carry the four markers required by forge-cli's per-phase kickoff shim. Without these markers, every fresh init since 0.43.2 shipped review workflows that hard-failed phase 2 (and phase 4) of `/forge:run-task` with `× workflow regression: Store-Write Verification not found ...`.

Surfaced via forge-cli dogfooding of `/forge:run-task HLO-S01-T01` on 2026-05-13: phase 1 (plan) completed with warnings; phase 2 (review-plan) hard-rejected immediately on the four-marker check. See forge#85.

Root cause: migration 0.43.1 → 0.43.2 ("Pack-06 materialization-marker regression fix") patched `meta-plan-task.md` and `meta-implement.md` to add the markers, but the symmetric review metas were missed.

### Changed

- `forge/meta/workflows/meta-review-plan.md`: "Iron Law" (singular philosophy block) restructured to "Iron Laws" (plural bullets) including `.forge/personas/supervisor.md` and `forge_store` references; new `## Store-Write Verification` section.
- `forge/meta/workflows/meta-review-implementation.md`: same pattern.
- `forge/tools/__tests__/base-pack-byte-budget.test.cjs`: per-file overrides for `review_plan.md` and `review_code.md` (4096→5120) to fit the marker blocks.
- `forge/tools/__tests__/phase-frontmatter.test.cjs`: budgets bumped for `meta-review-plan.md` (3200→4500) and `meta-review-implementation.md` (4200→5500).

### Migration

Non-breaking. `regenerate: ["workflows:review_plan", "workflows:review_code"]`. Existing installs re-running `/forge:update` will re-materialize the two review workflows from the new metas.

---

## [0.43.4] — 2026-05-13

**meta-sprint-intake.md — Project Orientation block for non-Claude runtime portability.**

Inserts a step 0 "Project Orientation" into `meta-sprint-intake.md` that tells the subagent its cwd is the project root and points it at `.forge/config.json` (+ `forge_config` MCP) for config and `engineering/` for knowledge. Philosophy: orientation, not enforcement — we give the model the project context it needs so its work stays focused, we do not restrict its tools. Existing steps renumbered 0→1, 1→2, …, 4→5.

Why: forge-cli dogfooding on the pi runtime with `glm-5.1:cloud` (ollama provider) produced a transcript where the subagent — without project context — (a) issued `cd /home/user/project && cat .forge/config.json` with a hallucinated placeholder path, then (b) ran `find / -name "config.json" -path "*/.forge/*"` and wandered into five unrelated sibling project roots (`savesquad`, `Carelytics/*`, `walkinto.in`) before the user aborted. Claude Code's implicit cwd knowledge masks this; pi/openai-completions surfaces it. The fix gives the subagent the orientation it was missing. See forge#83.

### Changed

- `forge/meta/workflows/meta-sprint-intake.md`: new step 0 "Project Orientation"; existing 0→1, 1→2, …, 4→5; `MASTER_INDEX.md` reference now explicit `engineering/MASTER_INDEX.md` and `SPRINT_REQUIREMENTS.md` now explicit `engineering/sprints/<SPRINT_ID>/SPRINT_REQUIREMENTS.md`.

### Added

- `forge/tools/__tests__/meta-sprint-intake-cwd-anchor.test.cjs`: regression guard with three assertions (cwd is project root; `.forge/config.json` + `forge_config` MCP referenced; `engineering/` referenced as the knowledge root).

### Migration

Non-breaking. `regenerate: ["workflows:sprint_intake"]`. Existing installs re-running `/forge:update` will re-materialize `sprint_intake.md` from the new meta.

---

## [0.43.1] — 2026-05-10

**Direct-exec contract patch — workflow store-CLI form unification.**

Every `/forge:store ...` slash-command reference in `init/base-pack/workflows/*.md` (and `_fragments/*.md`) replaced with the canonical `node "$FORGE_ROOT/tools/store-cli.cjs" ...` direct-cjs form already used by `meta/workflows/*.md`. Pairs with `@entelligentsia/forgecli@0.5.1`, which adds a bin fast-path that exec's `.tools/store-cli.cjs` directly when users (or models) shell `forge store ...`.

Why: cartographer testbench observed haiku-4-5 burning 26-220s per `bash forge store ...` invocation — each shell-out cold-started a fresh pi/agent loop because `forge` had no `store` subcommand. Models took the workflow text as license to bash-shell the colloquial form. Fix: unify workflow text to the deterministic direct-cjs form, and have forge-cli's bin route that form to a fast-path.

### Changed

- All 18 base-pack workflow files (commands/, fragments/) rewritten from `\`/forge:store ...\`` to `\`node "$FORGE_ROOT/tools/store-cli.cjs" ...\``. Mechanical sed replacement; semantics unchanged. Bumped `integrity.json` and `structure-manifest.json` accordingly.

### Migration

Non-breaking. Users on v0.43.0 → run `/forge:update`; no manual steps required. Existing `.forge/workflows/*.md` continue to work because forge-cli's bin fast-path interprets `forge store ...` shell-outs as direct cjs exec.

---

## [0.43.0] — 2026-05-10

**FORGE-S20 Sprint A — Friction emit channel + schema extension.**

T00 (FORGE-S20-T00) lands the writer side of the friction channel: `event.schema.json` gains `type:"friction"` enum with conditional required `{workflow, persona, issue}` via a JSON-Schema `allOf if/then` block; `validate-store.cjs` gains a minimal `allOf if/then required` interpreter; five meta-workflows (`meta-implement.md`, `meta-fix-bug.md`, `meta-validate.md`, `meta-plan-task.md`, `meta-orchestrate.md`) now carry an explicit Friction Emit section describing trigger conditions and the canonical flat-payload `node "$FORGE_ROOT/tools/store-cli.cjs" emit` shape. Shared fragment: `forge/meta/workflows/_fragments/friction-emit.md`.

T01 (FORGE-S20-T01) narrows the optional slots reserved by T00:
- `subkind` is constrained to a frozen enum `(skill_unused | skill_failed | skill_missing | skill_stale | skill_redundant)` plus a reserved `^x_[a-z_]+$` experimental namespace (no migration required for `x_*`), encoded as a single combined regex pattern.
- `evidence` is shaped into a closed object: `{ trajectory_excerpt: string, tool_errors: string[], retrieval_score: number ∈ [0,1], skillId: string }`.
- `validate-store.cjs` gains a minimal `pattern` interpreter on string fields.

Unblocks Plan 08 Phase B (dynamic skill curation): `/forge:enhance --phase 2` reader has been waiting for typed writers since S13-T08.

**Non-breaking:** events without `type` continue to validate exactly as before. T00-shaped friction events without `subkind`/`evidence` remain valid because those slots are not in the friction `allOf` then-required block.

**Regenerate:** `events:friction-emit` `events:friction-subkind` `workflows:implement,fix-bug,validate,plan-task,orchestrate` `tools:store-cli` `tools:validate-store` `schemas:event`

**Marketplace:** `skillforge/.claude-plugin/marketplace.json` `ref` advances from `v0.42.0` → `v0.43.0` (only after forge-cli v0.5.0 is published and post-publish verified).

---

## [0.42.0] — 2026-05-10

Release-routine catch-up. Single tag promotes v0.40.3 + v0.41.0 cumulatively to skillforge marketplace; v0.41.0 was never tagged separately. Bump-only — no new code beyond what already shipped on `main`.

**Cumulative content (since v0.40.2 marketplace pin):**

- **v0.40.3** (2026-05-08, FORGE-S16-T01) — `tools/substitute-placeholders.cjs` gains `--target pi` mode for forge-cli base-pack production. New `walkBasePackPi()` + `PI_TARGET_SUBDIRS` constant produce flat pi-shaped output trees from `init/base-pack/` with `{{KEY}}` tokens preserved. No user-side action required.
- **v0.41.0** (2026-05-09, FORGE-BUG-029-friction) — `tools/store-cli.cjs` adds `describe <entity>` and `template <entity>` subcommands; `lib/validate.js` errors now include a hint pointing at `template`/`describe` when the entity is known. Reduces write→reject→retry friction on weak/non-Anthropic models. No breaking changes.

**Migration path:**
- Users on v0.40.x → `/forge:update` is non-breaking.
- Users on <v0.40 → still must follow the v0.40.0 manual migration (run `/forge:update` then `/forge:migrate`; pre-migration `.forge/` is archived).

**Marketplace:** `skillforge/.claude-plugin/marketplace.json` `ref` advances from `v0.40.2` → `v0.42.0`.

---

## [0.40.2] — 2026-05-05

v0.40.2 hotfix bundle (FORGE-S14) — init/update/migrate reliability fixes. 17 FRs and 2 ADRs.

**ADR-S14-01** — `/forge:update` completion semantics: update ends in one of three states (complete, pending with auto-migration attempt, pending awaiting manual `/forge:migrate`). `updateStatus`, `pendingReason`, and `pendingMigrations` fields in `update-check-cache.json` track the state.

**ADR-S14-02** — `calibrationBaseline.sprintsCovered` semantics: cumulative provenance log (union-merge). `/forge:update` preserves existing entries and appends new ones; never destructively replaces.

**Tool fixes (T03 — FR-001/005/012/013/014/015):**
- `manage-versions.cjs` — three-resolution FORGE_ROOT priority (env var, `__dirname/..`, actionable error) + `--source` flag + zero-retry idempotent init
- `manage-config.cjs` — `set` on absent config creates minimal valid file; `resolve-forge-root` subcommand; `forgeRef` write/read support
- `build-persona-pack.cjs` / `build-context-pack.cjs` — `source_hash` field in output packs
- `build-overlay.cjs` — smoke-test exit code matches spec (exit 0 for "not found")
- `check-update.js` — `updateStatus`/`pendingReason`/`pendingMigrations` fields in cache; completion gate
- New shared libraries: `tools/lib/forge-root.cjs` (FORGE_ROOT resolution) and `tools/lib/paths.cjs` (commands subfolder path)

**Init/manifest fixes (T04 — FR-004/006/007):**
- `substitute-placeholders.cjs` — `_fragments/` directory fan-out during Phase 3; commands subfolder uses `paths.cjs` single source of truth
- `check-structure.cjs` — reads commands subfolder from `paths.cjs`; validates manifest entries exist in base-pack
- `structure-manifest.json` — ships `migrate_structural.md` and `CUSTOM_COMMAND_TEMPLATE.md` in base-pack
- `build-manifest.cjs` — release-time guard validates base-pack completeness

**Workflow/command patches (T05 — FR-002/003/008/009/010/011/016/017):**
- `/forge:update` — completion gate (ADR-S14-01), subagent probe (FR-009), `sprintsCovered` union-merge (ADR-S14-02), `forgeRef` portability (FR-010), contiguous phase numbering (FR-017)
- `/forge:init` — CLAUDE.md creation prompt at Phase 4 end (FR-008), `.gitignore` store/events/ unconditional (FR-016)
- `/forge:migrate` — `export FORGE_ROOT` on every bash block (FR-011)
- `_fragments/finalize.md` — updated to reference `/forge:update` completion states

**Regenerate:** tools (manage-versions, manage-config, substitute-placeholders, check-structure, build-manifest, build-persona-pack, build-context-pack, build-overlay, lib/forge-root, lib/paths), commands (update, init, migrate), workflows (migrate_structural, _fragments), schemas (config, update-check-cache, structure-manifest)

> **No breaking changes.** Users on v0.40.x can run `/forge:update` to apply all fixes. Users on pre-v0.40 should run `/forge:migrate` after updating.

---

## [0.40.1] — 2026-05-02

Read-side collate patch — corrects COST_REPORT.md generation by merging sidecars by `eventId` (eliminates duplicate-counting), adding an Ingestion Quality (IQ) section that surfaces missing / malformed sidecar events, canonicalizing model names via the new `tools/lib/pricing.cjs` library (29 tests, covers all Claude 3 / 3.5 / 3.7 / 4 model IDs plus aliases), and computing costs deterministically from the canonical model rather than trusting potentially-stale sidecar values. The `(unknown)` row that appeared when a model string couldn't be resolved is gone — unresolvable models are captured in the IQ section instead. This is a read-side-only fix; no emit-side behavior, schemas, or workflows changed. v0.41 will add the companion emit-side improvements.

**Regenerate:** `tools:collate`, `tools:pricing`

---

## [0.40.0] — 2026-05-02 **△ Breaking**

Base-pack init with progressive enhancement (FORGE-S13). Replaces multi-minute LLM cold-start init with a deterministic 4-phase pipeline (Collect → Discover → Materialize → Register, ~30–45s) and ships every workflow / template / persona as a working artefact with `{{KEY}}` placeholders that the init substitutes from `config.json` + `project-context.json`. No LLM in materialisation. Adds an enhancement agent and post-init / post-sprint hooks that progressively refine generated artefacts as the project's KB grows, plus a migration agent that converts pre-v0.40 installations onto the new substrate.

**T02 — `project-context.schema.json`:** New schema at `forge/schemas/project-context.schema.json` defines the structured project facts that drive substitution (project, architecture, entities, conventions, impact categories, technical debt, deployment, verification, skill wiring). `additionalProperties: false` throughout. JSON Schema annotations carry `x-placeholder` hints used by the init's discovery → context construction step.

**T03 — `substitute-placeholders.cjs`:** New ~506-line tool at `forge/tools/substitute-placeholders.cjs` walks the base-pack and substitutes `{{KEY}}` placeholders by joined key path (`project.name`, `architecture.frameworks.backend`, etc.). Supports default-on-missing (`{{KEY:default}}`) and is honoured `--dry-run` aware. Output directory mapping in the tool's `SUBDIR_OUTPUT_MAP` (commands → `.claude/commands/forge/`, personas → `.forge/personas/`, etc.). 624-line test suite at `__tests__/substitute-placeholders.test.cjs`.

**T04 — 4-phase `sdlc-init.md`:** Init flow rewritten end-to-end. `forge/init/sdlc-init.md` and `forge/commands/init.md` now drive: Phase 1 Collect (5 parallel discovery prompts → `config.json`), Phase 2 Discover (KB doc fan-out + inline `project-context.json` construction + calibration baseline), Phase 3 Materialize (substitute base-pack into `.forge/`), Phase 4 Register (tools registration, snapshot v0 in `structure-versions.json`, generation manifest, persona/context packs, store seed, update-check cache, refresh-kb-links, gitignore hygiene). `--fast` and `--full` are now CLI aliases — same 4-phase pipeline runs for both. Old 12-phase `init-progress.json` checkpoints are deleted automatically on resume.

**T05 — `structure-versions.json` + `manage-versions.cjs`:** New file at `.forge/structure-versions.json` carries versioned snapshots of the structural element set (workflows, commands, personas, skills, templates, schemas). New ~364-line tool at `forge/tools/manage-versions.cjs` is the single gateway for snapshot writes — `init`, `snapshot`, `enhance`, `migrate`, and `list` subcommands. Snapshot v0 is written by Phase 4 with `source: "base-pack"`; subsequent snapshots from enhancement / migration carry `source: "enhancement" | "migration"` and `enhancedElements[]` / `migratedFrom`. 518-line test suite.

**T06 — `npm run build-base-pack`:** New ~851-line tool at `forge/tools/build-base-pack.cjs` regenerates `forge/init/base-pack/` from the meta sources by walking `forge/meta/` and applying genericisation rules from `forge/tools/build-base-pack-rules.json` (replaces hardcoded "Forge" persona names with `{{PROJECT_NAME}}` placeholders). Exposed as `npm run build-base-pack` via `forge/package.json`. Test suites: `__tests__/build-base-pack.test.cjs` and `__tests__/placeholder-coverage.test.cjs`.

**T08 — Enhancement agent:** New meta workflow at `forge/meta/workflows/meta-enhance.md` and command at `forge/commands/enhance.md`. Three phases: Phase 1 (post-init `{{KEY}}` fills based on freshly-discovered context), Phase 2 (post-sprint dry-run diff proposals against newly-accumulated KB), Phase 3 (drift detection comparing live structural elements against snapshot baselines — produces a drift report; T08 augments `/forge:calibrate` to call Phase 3). Proposals are never auto-applied; the user reviews `.forge/enhancement-proposals/`.

**T09 — Enhancement hooks:** Two new fail-open hooks at `forge/hooks/post-init.cjs` and `forge/hooks/post-sprint.cjs` fire enhancement Phase 1 / Phase 2 on the appropriate trigger event. Hooks emit `enhancement-trigger`, `enhancement-completed`, and `enhancement-error` events via store-cli (event schema enum extended; no schema-shape change). Both hooks honour `process.on('uncaughtException', () => process.exit(0))` and never block init or retrospective happy paths. Observability: `/forge:store-query 'events where action = "enhancement-trigger"'`.

**T10 — Migration agent:** New meta workflow at `forge/meta/workflows/meta-migrate.md` and command at `forge/commands/migrate.md`. Synthesises `project-context.json` from existing `.forge/` artefacts (config.json, KB docs, store entries) using JSON-Schema-validated extraction passes; archives the pre-migration `.forge/` contents to `.forge/archive/pre-migration/`; writes snapshot v0 with `source: "migration"` and `migratedFrom` set. `/forge:health` clean post-migration; rollback path documented.

**T11 — Bucket-A friction reconciliation:** Eight sub-fixes covering `forge#71` (7 sub-bugs in `/forge:update`) and `forge#72` (preflight-gate workflow shadowing). Highlights: `/forge:update` Step 1 baseline derivation now uses `localVersion ?? migratedFrom ?? LOCAL_VERSION`; `LOCAL > REMOTE` decision-table case handled; `_fragments` directory fan-out in `regenerate.md`; integrity.json release-time guard regenerates from current hashes; `paths.forgeRoot` updated in Step 4 (was Step 6, leaving stale path baked into regenerated workflows); `hooks` and `schemas` regenerate categories explicitly omitted with documentation pointing at `/forge:update-tools`. `preflight-gate.cjs` no longer requires the `--workflow orchestrate_task` workaround for task pipelines.

**Substrate fixup (FR-007):** Phase 4 of `sdlc-init.md` now creates `.forge/enhancements/` and explicitly copies `project-overlay.schema.json` into `.forge/schemas/` (idempotent, defence-in-depth on the wildcard copy in Step 4-1). Closes the slipped FR-007 carry-over from T04 / T05.

**Regenerate:** 21 workflows (every base-pack workflow plus the new `enhance` and `migrate_structural`), 6 commands (`init`, `enhance`, `migrate`, `calibrate`, `update`, `regenerate`), 4 tools (`substitute-placeholders`, `manage-versions`, `build-base-pack`, `preflight-gate`). Categories `hooks` and `schemas` are deliberately omitted — hooks ship with the plugin (project copy is no-op), schemas are installed via `/forge:update-tools`.

> **Breaking:** Init flow is observably different (4 phases, ~30–45s). `--fast` aliases to default. `init-progress.json` schema changes from 12-phase to 4-phase. Two net-new files at `.forge/`: `structure-versions.json` and `project-context.json`. Downstream tooling that wrote to `structure-versions.json` directly must now route through `manage-versions.cjs`. Existing v0.28–v0.30.x installations: run `/forge:update`, then `/forge:update-tools` to install the three new schemas, then `/forge:migrate` to synthesise `project-context.json` and reformat `.forge/`, then `/forge:health` to verify.
>
> Manual: see `migrations.json` `0.32.0` entry for the full upgrade sequence and the `/forge:update-tools` rationale.

---

## [0.30.0] — 2026-05-01 **△ Breaking**

Prompt-efficiency structural cut (T01_6) — locks in the 40–50% per-task token reduction from the redesign analysis.

**Phase/orchestrator split:** `meta-orchestrate.md` and `meta-fix-bug.md` now carry `audience: orchestrator-only` and contain no per-phase subagent prose. All 9 phase meta sources (`meta-plan-task.md`, `meta-implement.md`, `meta-review-plan.md`, `meta-review-implementation.md`, `meta-validate.md`, `meta-approve.md`, `meta-commit.md`, `meta-update-plan.md`, `meta-update-implementation.md`) carry `audience: subagent` with a `context:` block (5 keys) that governs orchestrator prompt assembly. Byte budgets enforced: plan/implement/review-code/validate ≤4kB, remaining ≤3kB. Five forbidden strings (MASTER_INDEX.md, defensive read phrasing, etc.) absent from all subagent files — enforced by CI tests.

**PROJECT_OVERLAY:** New `build-overlay.cjs` tool materialises a ≤1kB task-scoped index slice (task row + sprint siblings from MASTER_INDEX.md, last phase summary, tool commands). The orchestrator calls it per-spawn and injects `overlay_md` instead of instructing subagents to read the full MASTER_INDEX.md. Architecture context block is now conditional on `phase.context.architecture` (true only for plan and approve phases). New schema: `project-overlay.schema.json`.

**`store-cli` silence:** Success-path stdout is now silent. Pass `--verbose` for legacy JSON echo. Error paths still write to stderr. Callers that parsed stdout must be updated.

**`_fragments/finalize.md`:** New shared fragment carries the `/cost` + sidecar emission contract. Per-phase `/cost` prose replaced with `file_ref:` to this fragment.

**Diff-mode defaults:** `review-code` and `validate` phases carry `diff_mode: true` — diff-first instruction instructs subagents to read `git diff` before loading full source files.

**Regenerate:** workflows (all phase files + orchestrator), schemas, tools (build-overlay, store-cli)

> **Breaking:** `store-cli` JSON stdout is no longer emitted on success. Any downstream script that parses `store-cli` output must pass `--verbose` or read results from disk.
>
> Manual: Run `/forge:update` to regenerate all workflows, tools, and schemas.

---

## [0.28.0] — 2026-04-29

Escalation hardening (GH-66): orchestrator now validates subagent responses and retries once with a simplified prompt before escalating on second failure; blocks tasks with `blocked` or `escalated` status via phase gates and a pre-task guard; inlines the four-step escalation procedure at every call site so the LLM agent sees the full mandatory steps; adds an Iron Law prohibiting silent workarounds; expands Error Recovery table to cover all failure modes. No schema changes — `blocked` and `escalated` were already in the task status enum.

**Regenerate:** workflows, personas

> Manual: Run `/forge:update` to regenerate workflows and personas. Tasks previously stuck in `blocked`/`escalated` status will now be skipped by the orchestrator instead of re-attempted.

---

## [0.27.1] — 2026-04-28

Fix `check-structure.cjs` false-negative for namespaced commands (GH-70): `structure-manifest.json` was missing `"prefixed": true` on the `commands` namespace entry, causing the tool to probe `.claude/commands/approve.md` instead of `.claude/commands/{prefix}/approve.md`. The tool had correct prefix-resolution logic at line 62 but the manifest never activated it. Fix adds `prefixed: true` in `build-manifest.cjs` and regenerates `structure-manifest.json`. Root cause: `configuration` — manifest generator omission.

---

## [0.27.0] — 2026-04-23

Store query engine: deterministic NLP-based store querying integrated from the store-query marketplace experiment. A 5-stage rule-based parser (no LLM) maps natural language to structured traversal plans: entity synonyms, status/severity mapping, FK follow phrases, ordering/limit/count tokens, and keyword extraction. Replaces 5–6 manual KB navigation tool calls with 1–2 structured calls returning filtered, FK-resolved, excerpt-included results.

New tools: `store-query.cjs` (CLI entry), `lib/store-facade.cjs` (StoreFacade + excerpt extraction), `lib/store-nlp.cjs` (NLP parser), `lib/store-query-exec.cjs` (query execution + result assembly), `query-logger.cjs` (PostToolUse hook). Dispatched via existing `store-cli.cjs` gateway: `nlp`, `query`, `schema` commands. New plugin skills: `forge:store-query-nlp`, `forge:store-query-grammar`. New agent: `forge:store-query-validator`. New command: `/forge:store-query`. Context-gathering query shortcuts added to plan-task, fix-bug, and sprint-plan workflows.

**Regenerate:** tools, workflows

---

## [0.26.0] — 2026-04-23

Permission prompt storm fix (BUG-014): add `PermissionRequest` hook that auto-approves known Forge tool patterns and persists allow rules to `.claude/settings.local.json`. Covers `node` tool invocations, shell commands (`mkdir`, `cp`, `ls`, `cat`, `jq`, `gh`, etc.), writes/edits to `.forge/`, `.claude/commands/`, and `engineering/`, and WebFetch to `raw.githubusercontent.com`. First run shows ~17 approval prompts (one per rule pattern) that persist; subsequent runs have zero prompts for Forge patterns. Deny rules always take precedence. Closes #68.

**Regenerate:** hooks

> Manual: Restart Claude Code after updating for the new hook to take effect. On first Forge command, approve each permission prompt once — they persist for future sessions.

---

## [0.25.0] — 2026-04-22

Fix permission-check rejection of `$FORGE_ROOT` in slash command frontmatter. Claude Code's permission checker blocks `!`-prefixed frontmatter containing shell variable expansions ("Contains simple_expansion"), preventing Forge commands like `/forge:add-task`, `/forge:add-pipeline`, `/forge:remove`, and `/forge:refresh-kb-links` from running without `--dangerously-skip-permissions`. All `!`-prefixed `manage-config.cjs` calls now read directly from `.forge/config.json` using literal relative paths — zero variable expansions, passes the permission checker. Init instruction files also cleaned up: replaced misleading `!` backtick notation with standard bash command substitution. Closes #67.

---

## [0.24.2] — 2026-04-22

Token telemetry reliability fix. Workflows now emit placeholder sidecars with null token fields when `/cost` unavailable (previously: skip silently). Step 0 checks `/cost` availability; if fails, Token Reporting step emits sidecar with `"source": "missing"`, `"inputTokens": null`. Users backfill later via `estimate-usage.cjs --sprint SPRINT-ID`. Eliminates silent data loss. 7 meta workflows updated.

**Regenerate:** workflows

---

## [0.24.1] — 2026-04-21

Fix init mode selection dialogue. Resume Detection now requires the `mode` field to be present in `.forge/init-progress.json` before treating a checkpoint as valid. Stale checkpoints without a `mode` field (from interrupted runs that didn't complete Mode Selection) now fall through to the full Fast/Full prompt instead of silently defaulting to 'full' via config.json fallback. This ensures users always see the mode selection dialogue on fresh or partial init runs.

---

## [0.24.0] — 2026-04-21

Multi-plugin detection in session-start hook. `check-update.js` now scans all plugin locations (`~/.claude/plugins/`, `./.claude/plugins/`) to detect multiple Forge installations. Reports scope (user/project), distribution (`forge@forge`/`forge@skillforge`), and enabled status. Enables `/forge:update` to advise users with multiple installations. 15 new tests added (593 total, 0 fail).

---

## [Unreleased]

(no entries)

---

## [0.23.0] — 2026-04-21

Fix path resolution bug in three command/agent files that used `require('.forge/config.json')` inside `node -e` one-liners. In `node -e` mode, `require()` with a relative path resolves from `process.cwd()`, which fails when the shell's working directory isn't the project root — causing `Cannot find module '.forge/config.json'` errors in any project using Forge. All three occurrences replaced with `manage-config.cjs get project.prefix` calls, matching the pattern already used by other commands. No regeneration required.

---

## [0.22.1] — 2026-04-20

Fix preflight-gate.cjs task directory resolution. `lastSegment(taskRecord.path)` extracted the source filename (e.g., `store-cli.cjs`) instead of the artifact directory name (e.g., `FORGE-S12-T06-model-discovery`), breaking `{task}` path substitution and verdict source resolution in `resolveVerdictSources`. New `resolveTaskArtifactDir()` scans the sprint directory for the matching `{taskId}-*` subdirectory, falling back to `lastSegment` for legacy records. 1 new test, 578 total.

---

## [0.22.0] — 2026-04-20

Calibrate baseline auto-initialization. `/forge:calibrate` now computes and writes the initial `calibrationBaseline` (MASTER_INDEX.md hash + completed sprint IDs) when the field is absent from `.forge/config.json`, instead of dead-ending with "run `/forge:init`". The algorithm mirrors init Phase 5/6-b. `/forge:health` now recommends `/forge:calibrate` instead of `/forge:init` when a missing baseline is detected. No schema changes.

**Regenerate:** run `/forge:update` — `commands` must be regenerated.

---

## [0.21.0] — 2026-04-20

Structured Result returns for CJS module APIs. Two exported functions are refactored from null-return failure patterns to `{ ok: true, value }` / `{ ok: false, code, message }` Results: `resolveTaskDir` in `collate.cjs` and `estimateTokens` in `estimate-usage.cjs`. A new shared library `forge/tools/lib/result.js` provides `ok()`, `fail()`, and `RESULT_CODES` constants so callers can branch on `result.code` rather than null-checking. All internal call sites are updated. 14 new tests added (526 total, 0 fail). CLI exit-code contract unchanged.

**Regenerate:** run `/forge:update` — `tools` must be regenerated.

---

## [0.20.0] — 2026-04-20

Sprint S11 tech-debt sweep across pipeline bugs, command gaps, and UX completeness. Seven fixes ship in this release: event timestamps no longer zero the time component (store-cli.cjs was serialising a truncated ISO string); preflight-gate now scans all `.forge/workflows/*.md` files instead of two hardcoded development-environment filenames; the ROLE_TIER model fallback in `meta-orchestrate.md` is applied correctly when a tiered cluster is detected; `collate.cjs` generates per-task `INDEX.md` files with correct relative links from `MASTER_INDEX.md`; `calibrationBaseline` is written during fast-mode init and backfilled during update; the `quiz-agent` slash command file is added; and `generate-commands.cjs` registers the quiz-agent entry and performs post-generation flat-file cleanup.

**Regenerate:** run `/forge:update` — `tools`, `workflows`, and `commands` must be regenerated.

---

## [0.19.2] — 2026-04-19

Each banner now carries a Japanese kanji companion (e.g. BLOOM 開花, FORGE 鍛冶, VOID 虚空) displayed in dim tint alongside the name in both `render()` and `badge()` output.

**Regenerate:** none required.

---

## [0.19.1] — 2026-04-19

Banner art collapsed from 5-line ASCII blocks to single creative lines — each banner's visual identity is preserved in one tinted unicode string, eliminating the line-count overhead that caused truncation in constrained CLI contexts.

**Regenerate:** none required.

---

## [0.19.0] — 2026-04-19

UX polish across three surfaces: Tomoshibi now lowercases the project prefix before forming slash-command suggestions, preventing copy-paste failures when `project.prefix` is stored uppercase. The `store-cli progress` command now emits a human-readable persona heartbeat line to stdout (emoji + agent name + status + detail) in addition to its existing pipe-delimited log entry. The `ensure-ready --announce` banner is now a single summary line (`🔥 Forge capability: N/total (P%) → M/total (Q%), +X artifacts`) instead of a multi-line framed block — visible inline in Claude Code without Ctrl-O expansion.

**Regenerate:** none required — all three changes ship with the plugin update.

---

## [0.18.1] — 2026-04-19

**Bug fix: `preflight-gate` workflow discovery works correctly in user projects.**

`preflight-gate.cjs` was searching for workflow files using two hardcoded filenames (`meta-orchestrate.md`, `meta-fix-bug.md`) that only exist in the Forge development dogfooding environment. In user projects these files are absent, causing `preflight-gate` to always exit with "could not locate workflow file" (exit 2) regardless of which phases were defined. It also used a `## Phase: <name>` heading pattern that never matched — workflows define gates via ` ```gates phase=<name>` fence labels. The fix scans all `.md` files under `.forge/workflows/` and matches on the correct fence-label pattern.

**Regenerate:** run `/forge:update` to get the updated `preflight-gate.cjs`.

---

## [0.18.0] — 2026-04-19

**Write-boundary schema enforcement: agents can write Forge-owned JSON directly with `Write` / `Edit` / `MultiEdit`, but every such write is schema-validated at the filesystem boundary by a new `PreToolUse` hook.**

The Forge contract has always been: probabilistic agents MAY bypass deterministic tools, as long as schemas are enforced for data and messages. Until this release, the second half of that rule was leaky — `store-cli` validated most of its write paths, but agents could route around `store-cli` entirely by using `Write` or `Edit` on `.forge/store/*.json` directly, and four paths inside `store-cli` itself wrote unvalidated sidecar / progress / collation data.

- **`hooks/validate-write.js`** — new `PreToolUse` hook registered on `Write`, `Edit`, and `MultiEdit`. Reads the proposed tool invocation, matches the target path against a write-boundary registry, computes the post-edit contents (for `Edit`/`MultiEdit`: applies `old_string` → `new_string` against the current file on disk), parses, and validates. Blocks the tool call with `exit 2` and a structured rejection naming the offending field. Passes through non-Forge paths and unmatched paths in under 20ms. Fails open on internal error so a broken validator can never block legitimate work.
- **`hooks/lib/write-registry.js`** — maps `.forge/store/**` path patterns to their schemas. Entries cover features, sprints, tasks, bugs, events, event-sidecars, `COLLATION_STATE.json`, and `progress.log` (line-pipe-delimited).
- **`tools/lib/validate.js`** — shared validator extracted from `store-cli.cjs` and extended with `pattern` and `format: date-time`. The hook and `store-cli` now run identical validation logic.
- **`schemas/event-sidecar.schema.json`**, **`schemas/progress-entry.schema.json`**, **`schemas/collation-state.schema.json`** — three new schemas. Drift guard test asserts the sidecar schema stays a subset of the event schema.
- **`store-cli.cjs` gap closures** — sidecar emit, sidecar→event merge, progress log append, and collation-state write now all validate against their schemas. Every `store-cli` write path is now schema-enforced.
- **`meta-orchestrate.md`** — new "Write-Boundary Contract" section documents that subagents may write Forge-owned JSON directly and that the hook enforces the invariant regardless of route.
- **Emergency bypass:** set `FORGE_SKIP_WRITE_VALIDATION=1` for a single turn. The hook allows the write through and appends an audit line to the affected sprint's `progress.log`.

**Regenerate:** `hooks` and `schemas` must be regenerated so the new hook and schema files land in the project's `.forge/` instance.

> Manual: Run `/forge:update` to install the new write-boundary hook. Any existing tooling that writes malformed JSON to `.forge/store/` will now be rejected at write time — fix the data, don't bypass the hook.

---

## [0.17.1] — 2026-04-19

**Architecture context pack: orchestrators inject a pre-computed architecture summary into every subagent prompt, reducing per-phase `stack.md` reads from ~12 to ~1.**

Every phase workflow independently reads `engineering/architecture/stack.md` and related docs. In a 6-phase task with 2 revisions, architecture docs are read 12+ times — 120+ times across a 10-task sprint. This release pre-computes a compact summary and injects it once per subagent spawn.

- **`build-context-pack.cjs`** — new tool that walks `engineering/architecture/*.md` (skips `*.draft.md`), extracts H1 titles, first paragraphs, and `## Key *` / `## Summary` sections, and emits `.forge/cache/context-pack.md` and `.forge/cache/context-pack.json`. Pack is capped at 400 lines with a truncation marker. Supports `manual: true` frontmatter to skip auto-rebuild.
- **`meta-orchestrate.md` / `meta-fix-bug.md`** — read `.forge/cache/context-pack.md` before each subagent spawn and inline it under `### Architecture context` in the prompt. Falls back silently when pack is absent.
- **Phase workflows** (`meta-plan-task.md`, `meta-implement.md`, `meta-review-plan.md`, `meta-review-implementation.md`) — updated to consult the injected context-pack summary first; read full architecture docs only when the summary is insufficient.
- **`/forge:health`** — detects stale pack via hash comparison between `.forge/cache/context-pack.json` and current `engineering/architecture/*.md`.
- **`/forge:regenerate`, `/forge:materialize`** — rebuild the pack after other generation steps.
- **`meta-collate.md`** — rebuilds the pack after KB updates (architecture docs may change during a sprint).

**Regenerate:** `workflows` and `tools` must be regenerated so the updated meta-files and new tool are reflected in the project's `.forge/` instance.

> Manual: Run `/forge:regenerate` to build the initial context pack at `.forge/cache/context-pack.md`.

---

## [0.17.0] — 2026-04-19

**Artifact summaries in task manifest: downstream subagent prompts now receive terse phase summaries instead of re-reading full artifacts.**

Across a typical 10-task sprint, each task's PLAN.md and CODE_REVIEW.md are re-read by 6+ downstream subagents. This release caches terse structured summaries on the task record as each phase completes, then injects those summaries into downstream prompts as a fast path. Full artifacts remain on disk and are always available by reference.

- **`summaries` field** on task and bug schemas (optional; additive — old records remain valid). Each key (`plan`, `review_plan`, `implementation`, `code_review`, `validation`) holds a `phaseSummary` object with bounded size (objective ≤ 280 chars, key_changes/findings ≤ 12 × 200 chars).
- **`store-cli set-summary <taskId> <phase> <jsonFile>`** — new subcommand that validates a summary JSON against the `phaseSummary` schema and merges it into the task record atomically (tmp + rename). `set-bug-summary` is the bug analogue.
- **Phase workflows emit summary sidecars** at the end of each phase (`PLAN-SUMMARY.json`, `IMPLEMENTATION-SUMMARY.json`, etc.) and register them via `set-summary`. If validation fails, the workflow retries before proceeding.
- **Orchestrator injects summaries** as a "Prior phase summaries" block in subagent prompts when available, with a pointer to the full artifact for escalation. Old tasks without summaries fall back to the previous behaviour (prompt instructs subagent to read the full artifact from disk).
- **`validateRecord` extended** with `maxLength` (strings), `maxItems` (arrays), and `items.maxLength`/`items.type` constraints — generalises the validation used by set-summary for future schemas.

**Regenerate:** `workflows` and `tools` must be regenerated so that updated workflow meta-files and the new store-cli are reflected in the project's `.forge/` instance.

---

## [0.16.0] — 2026-04-19

**Persona/skill by reference: subagent prompts now inject a compact summary instead of the full persona and skill file prose.**

Across a 10-task sprint with ~18 phase spawns per task, the old orchestrator re-injected ~479 lines of persona boilerplate on every subagent spawn — tokens that carried no per-task information. This release replaces the verbatim injection with a compact reference block compiled from YAML frontmatter.

- **YAML frontmatter** on all 8 personas and 8 skill meta files (`id`, `summary`, `responsibilities`/`capabilities`, `outputs`, `file_ref`). Prose is preserved for human readers.
- **`build-persona-pack.cjs`** — new tool that compiles frontmatter into `.forge/cache/persona-pack.json` with a stable `source_hash` and atomic write. Triggered by `/forge:regenerate` and `/forge:materialize`.
- **Reference-mode prompts** in `meta-orchestrate.md` and `meta-fix-bug.md` via a shared `compose_role_block(persona_noun)` helper. The subagent gets the summary inline and a `file_ref` pointer if it needs deeper context.
- **`FORGE_PROMPT_MODE=inline`** — one-version rollback path that preserves the legacy verbatim injection.
- **`/forge:health`** step 12 now flags a missing or stale persona pack via `source_hash` comparison.

**Regenerate:** `/forge:update` will prompt for `personas` and `workflows` regeneration. The pack is built as part of that step.

> Manual: Run `/forge:regenerate` to rebuild the persona pack at `.forge/cache/persona-pack.json`.

---

## [0.15.0] — 2026-04-19

**Gate-check enforcement: orchestrator and atomic phase workflows halt loudly on missing prerequisites and malformed verdicts.**

The orchestrator's documented invariant — *"YOU MUST NOT advance a phase until its gate checks pass"* — was documentation-only. The algorithm never actually validated prerequisites before spawning a subagent, and verdict detection was a raw `**Verdict:**` pattern match that silently misclassified typos and prose drift as "approved". Symptoms: phantom revisions, stub `PLAN.md` files treated as real, subagents "succeeding" on empty inputs.

This release ships a declarative gate layer:

- **`parse-verdict.cjs`** — closed verdict vocabulary (`approved`, `revision`, null). Unknown values never silently classify as approved. CLI shim exits 0/1/2 so both the orchestrator and manual users can script around it.
- **`parse-gates.cjs`** — minimal, dep-free DSL for per-phase gate declarations. Gates live in `` ```gates phase=<name> `` fenced blocks inside each meta-workflow. Grammar: `artifact`, `require`, `forbid`, `after`. Unknown directives throw with line numbers.
- **`preflight-gate.cjs`** — pure function + CLI shim that evaluates a phase's declared gates against the current task/bug state. Pre-spawn check returns `{ok, missing[]}` with every failure enumerated, not just the first.
- **Orchestrator + atomic workflows wired.** `meta-orchestrate.md` and `meta-fix-bug.md` run `preflight-gate.cjs` before every subagent spawn and use `parse-verdict.cjs` in place of ad-hoc string matching. Atomic workflows (`meta-plan-task`, `meta-implement`, `meta-review-plan`, `meta-review-implementation`, `meta-approve`, `meta-commit`, `meta-validate`) gain a "0. Pre-flight Gate Check" step so that users invoking `/plan`, `/implement`, etc. directly also hit the safety net.
- **Structural invariant test.** `phase-workflow-guards.test.cjs` fails the build if any phase workflow is added that forgets the preflight invocation.

Per-phase gates now declared: PLAN.md existence + size floor before `implement` and `review-plan`; predecessor verdict chains across `implement → review-code → approve → commit`; status-based guards on `plan` and `implement`. Adjusting a gate is a data change — edit the `gates` block, regenerate workflows.

**Regenerate:** `workflows` — run `/forge:update` to pull in the new gate-aware meta-workflows.

---

## [0.14.1] — 2026-04-18

**collate now generates Sprint, Task, and Bug INDEX.md files — fixing broken knowledge graph links.**

`MASTER_INDEX.md` has always linked to `sprints/{sprint}/INDEX.md`, `sprints/{sprint}/{task}/INDEX.md`,
and `bugs/{bug}/INDEX.md`, but `collate.cjs` never wrote those files. Every link from the master index
was a dead end. This release adds three new pure functions (`buildSprintIndex`, `buildTaskIndex`,
`buildBugIndex`) — each fully tested — and wires them into the CLI generation loop. Running collate
now produces a fully traversable knowledge graph: MASTER_INDEX → Sprint INDEX → Task INDEX → task
documents, and MASTER_INDEX → Bug INDEX → bug documents. The `forge:refresh-kb-links` skill also
gains a KB integrity check that detects missing INDEX files and prompts the user to re-run collate
before proceeding.

**Regenerate:** none required.

---

## [0.14.0] — 2026-04-18

**Tomoshibi unified — single oracle agent + `forge:refresh-kb-links` plugin skill.**

Forge previously shipped two Tomoshibi agents: `tomoshibi.md` (KB-visibility) and
`tomoshibi-oracle.md` (concierge). The KB-visibility logic is now a first-class plugin
skill (`forge:refresh-kb-links`) — invokable directly by users and by callers via the
Skill tool. The oracle is unified into a single `tomoshibi.md` that handles all intents
including a new "refresh KB links" conversational route. The three Agent-tool invocations
of Tomoshibi (in `/forge:update` Step 7, `/forge:init` Phase 12, and `meta-collate`
Finalize) are replaced with Skill-tool invocations — simpler, more transparent, no Agent
overhead for a deterministic task. `tomoshibi-oracle.md` is deleted.

**Regenerate:** none required.

---

## [0.13.1] — 2026-04-18

**Tomoshibi Oracle warns before destructive config changes.**

`/forge:ask` now shows the regeneration impact *before* confirming a `project.prefix`
change — the exact follow-up command (`/forge:regenerate commands workflows`) is displayed
alongside the consequence (command folder rename, stale workflow references) before the
`[Y/n]` prompt. `project.name` changes are confirmed clean (no regeneration needed).
An oracle warns before the deed, not after.

**Regenerate:** none required.

---

## [0.13.0] — 2026-04-18

**Generated commands are namespaced under the project prefix.**

Commands generated by `/forge:init` previously landed flat in `.claude/commands/` (e.g.
`/plan`, `/fix-bug`). These generic names collide with any other plugin claiming the same
name. v0.13.0 generates commands into `.claude/commands/{prefix}/` so they surface as
`/{prefix}:plan`, `/{prefix}:fix-bug`, etc., where `{prefix}` is the project prefix
captured at init time (e.g. `ACME`, `EMBER`).

Command files also gain `description:` frontmatter so the Claude Code slash command picker
shows a meaningful one-line description instead of the `<!-- AUTO-GENERATED -->` comment.
The `generate-orchestration` phase now explicitly emits namespaced slash command forms in
generated workflow content. `/forge:remove` reads the project prefix to delete the correct
subdirectory. `/forge:add-task` next-step suggestions show the namespaced command form.

**Regenerate:** `commands`, `workflows`

> Manual: After regenerating, delete the old flat command files:
> `rm -f .claude/commands/{sprint-intake,sprint-plan,run-task,run-sprint,plan,review-plan,implement,review-code,fix-bug,approve,commit,collate,retrospective}.md`

---

## [0.12.6] — 2026-04-18

**`/forge:ask` concierge command + tamper-evident plugin integrity.**

`/forge:ask` is a new single conversational entry point for all Forge intent. It routes
project-status queries, config reads/writes (scoped to `project.name` and `project.prefix`),
version checks, and workflow/command explanations through the new **Tomoshibi Oracle**
agent (`forge/agents/tomoshibi-oracle.md`). The existing `tomoshibi.md` KB-visibility
agent is unchanged.

Plugin integrity adds two new tools: `gen-integrity.cjs` (run at release time to write
`integrity.json` — a SHA-256 manifest of all plugin command, agent, hook, and verifier
files) and `verify-integrity.cjs` (run at health-check time to re-hash each file and
report drift). `/forge:health` now includes a tamper-evident integrity check: it first
verifies `verify-integrity.cjs` itself against a hash literal baked into the command,
then runs the verifier. Detection is tamper-*evident*, not tamper-*proof*; `/forge:update`
is the authoritative restore path and is documented as such.

**Regenerate:** none required.

---

## [0.12.5] — 2026-04-17

**Visual upgrade: framed capability announcement; system-wide zen-blue rules.**

The 2-line capability announcement (shipped in v0.12.4) was getting lost
between bash command output. v0.12.5 reframes it as a standout block:

```
━━━ 🔥 Forge — Capability Upgrade (fast mode) ━━━━━━━━━━━━━━━━━━━

  Currently  ▰▰▰░░░░░░░░░  10/41   ·    24%
  After      ▰▰▰▰░░░░░░░░  15/41   ·    37%   +5 artifacts

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

The top + bottom em-dash rules render in **zen blue** `(100, 140, 200)`.
Progress bars carry the lantern-yellow fast-mode tint introduced in
v0.12.3. Together they give the announcement real visual weight on a
busy terminal.

`banners.cjs` extensions:

- **`ZEN_BLUE`** — exported `[100, 140, 200]` constant.
- **`ruleLine(text, opts)`** — produces a 65-char zen-blue em-dash
  horizontal rule with optional embedded label. Default tint is
  `ZEN_BLUE`; override via `opts.color`.
- **`--rule [text]`** — new CLI subcommand for emitting standalone rules
  from markdown rulebooks.
- **`phaseHeader()`** em-dash banner now uses `ruleLine` internally —
  every phase / step header across `/forge:init`, `/forge:update`,
  `/forge:regenerate`, `/forge:health` emits its em-dash separator in
  zen blue automatically.

`ensure-ready.cjs` `_renderAnnouncement()` (used by `--announce`) now
uses `banners.ruleLine` for its top + bottom rules — same zen-blue
tint, single source of formatting.

All ANSI is auto-stripped in `NO_COLOR` / `FORGE_BANNERS_PLAIN` /
non-tty / `--plain` contexts.

**Regenerate:** none — additive change. Existing emit lines and APIs
are unaffected.

---

## [0.12.4] — 2026-04-17

**Fast-mode capability announcement on every materialise round.**

When the project is in fast mode and a stub workflow triggers
materialisation (or the user runs `/forge:materialize` / `--all`), Forge
now opens with a 2-line announcement:

```
〇 Forge is currently in fast mode · 5% capabilities generated (2 of 41)
   This round will lift capabilities to 29% (12 of 41, +10 artifact(s))
```

The percentages count materialised artifacts across the four lazy
namespaces (workflows, personas, skills, templates) against the total
expected set in `structure-manifest.json`. Commands are excluded from the
denominator — they're scaffolded eagerly even in fast mode.

`ensure-ready.cjs` gains three new module exports and CLI subcommands:

- `computeCapabilities(manifest, projectRoot)` / `--capabilities`
- `predictCapabilitiesAfter(manifest, projectRoot, addPaths)` /
  `--capabilities-after [--all | --workflow <id> | --target <path>]`
- `--announce` — emits the human-readable 2-line summary; silent on full
  installs (no output, exit 0).

Wired into `forge/init/generation/lazy-materialize.md` Step 1 (per-workflow
stub trigger) and `forge/commands/materialize.md` (`--all` and
single-workflow paths).

**Regenerate:** none — additive change.

---

## [0.12.3] — 2026-04-17

**Visual onboarding character across `/forge:init`, `/forge:update`,
`/forge:regenerate`, `/forge:health` (and light touch on `/forge:config`
and `/forge:materialize`).**

`banners.cjs` ships with three new helpers and a CLI extension:

- `progressBar(n, total, opts)` — unicode block bar with optional
  gradient tint and label.
- `subtitle(text, opts)` — dim italic single-line subtitle for under
  hero banners.
- `phaseHeader(n, total, name, bannerKey, opts)` — three-line
  composite: badge → em-dash separator → progress bar (mode-tinted).
- New CLI subcommands: `--subtitle`, `--progress`, `--phase`, plus a
  global `--plain` flag.
- Auto-strips ANSI in `NO_COLOR` / `FORGE_BANNERS_PLAIN` / non-tty
  contexts — CI runs render plain.

Wired into commands:

- **`/forge:init`** opens with the `forge` hero + version subtitle,
  every phase emits a banner badge + progress bar before its em-dash
  header (per-phase banner map: north / entelligentsia / oracle /
  bloom / tide / drift / ember / rift / lumen / forge / north / lumen).
  Mode-tinted progress bars: Fast = lantern yellow, Full = ember
  orange. Closes with the forge hero + a mode-specific tagline.
- **`/forge:update`** opens with the `ember` hero, every step gets a
  banner badge + step header (1: north, 2A: rift, 2B: drift, 3: lumen,
  4: forge, 5: oracle, 6: drift, 7: lumen).
- **`/forge:regenerate`** opens with the `forge` hero, every category
  emits a badge before its "Generating..." line (personas: bloom,
  skills: tide, templates: drift, workflows: ember, commands: lumen,
  knowledge-base: oracle).
- **`/forge:health`** opens with the `oracle` hero + subtitle; closes
  with a status verdict line and (on perfect health) a sealing oracle
  badge.
- **`/forge:config`** and **`/forge:materialize`** get a single
  opening badge each — light touch on small commands.

**Regenerate:** none — additive change. All existing API and existing
emit lines remain — visuals are added in front of them, not as
replacements.

---

## [0.12.2] — 2026-04-17

**`/forge:init` mode prompt now defaults to Fast.**

After dogfooding v0.12.1, Fast mode is reliable enough to be the default
for new installs. The Mode Selection prompt now presents Fast as `[1]`
and Full as `[2]`; pressing Enter picks Fast. The resume sub-prompt is
re-ordered the same way for consistency. `--fast` and `--full` flags are
unchanged — both remain non-interactive escape hatches.

**Regenerate:** none — single-command UX change. No project files
affected.

---

## [0.12.1] — 2026-04-17

**`/forge:config` command + fast-mode-respecting regenerate + interactive
init prompt.**

Three coordinated changes ship together:

- **Interactive mode prompt for `/forge:init`** (FEAT-004). `/forge:init`
  now surfaces fast vs. full mode through an interactive prompt between
  resume detection and the pre-flight plan. Default = Full (Enter picks
  Full). The pre-flight table is mode-specific — Full keeps the familiar
  12-row layout; Fast labels each row `[runs]`/`[skeleton]`/`[stubs]`/
  `[deferred]` so users see what runs now vs. on first workflow use.
  `--fast` and a new `--full` flag remain non-interactive escape hatches
  for scripted runs; combining them halts with a conflict error. Mode is
  persisted to `.forge/init-progress.json` pre-Phase-1 and propagated
  into `.forge/config.json` by Phase 1. On resume, the stored mode is
  offered as the default with a switch option; switching emits an
  explicit warning, and resuming into a phase that's skipped in the new
  mode advances to the next active phase with an `△` notice.
- **`/forge:regenerate` and `/forge:materialize` now respect fast mode.**
  Targeted regenerate (`/forge:regenerate workflows`, single-file variants,
  default no-args run) filters every category through a materialized check —
  only files that exist (and, for workflows, are not stubs) are touched.
  Migrations that fan out `/forge:regenerate <target>` against a fast install
  no longer crash mid-flight; they become partial refreshes or no-ops, and
  unmaterialized stubs pick up the new meta-version at first use for free.
  Per-category fast-mode footers report `N of M regenerated`.
- **Mode switching is now explicit.** New `/forge:config` command owns the
  `mode` field. `/forge:config mode full` runs materialize-all then default
  regenerate then writes `mode: full`. `/forge:config mode fast` is refused
  (one-way transition). Read-only `/forge:config` and `/forge:config mode`
  for inspection.
- **`/forge:regenerate` (default) and `/forge:materialize --all` no longer
  auto-flip mode.** Both are now mode-neutral. Promotion is a separate
  decision the user makes by running `/forge:config mode full`.
- **`/forge:update` final summary** appends a fast-mode promotion hint when
  the project is still in fast mode after migration.
- **Bug fix (issue #47 / FORGE-BUG-010):** `/forge:init` Phase 12 now offers
  to gitignore `.forge/store/events/` — the transient JSON event-log
  directory that accumulates one file per agent phase per task or bug.
  `/forge:update` Step 5 audit gains a `5g` sub-check that surfaces a
  `add-gitignore-entry` item on existing projects whose `.gitignore` does
  not already cover the path. Idempotent on both paths; never modifies
  unrelated lines.

**Regenerate:** none — additive change. Existing full-mode projects are
unaffected; existing fast-mode projects automatically get the new (better)
behaviour the next time they invoke `/forge:regenerate` or
`/forge:materialize`. Projects that have not yet gitignored
`.forge/store/events/` will see a new audit item the next time they run
`/forge:update`.

---

## [0.12.0] — 2026-04-17

**Fast-mode init with subagent-distributed lazy scaffolding.**

`/forge:init --fast` completes in ~30 seconds (plus Phase 2 user interaction)
by running only structural phases upfront and deferring all heavy LLM
generation to first use. Heavy artifacts (personas, skills, templates,
workflows) are materialised on demand by the subagent that needs them —
matching Forge's decentralised execution model.

Key changes:

- **`/forge:init --fast`** — new flag that skips Phases 4, 5, 6, 8 and writes
  stub workflow files for Phase 7. Each stub carries a self-ensure boilerplate:
  on first invocation the subagent reads `lazy-materialize.md`, materialises
  its transitive dependency closure, self-replaces the stub, and re-reads the
  real workflow.
- **Machine-readable dep graph** — all 17 `forge/meta/workflows/meta-*.md`
  files gain a `deps:` YAML frontmatter block declaring their closure (personas,
  skills, templates, sub-workflows, KB docs). `build-manifest.cjs` parses these
  and emits an `edges.workflows` section into `structure-manifest.json`.
- **`lazy-materialize.md`** — new rulebook in `forge/init/generation/`. Reads
  edges from structure-manifest, computes transitive closure (BFS, 2-level),
  fans out to existing single-file rulebooks in topological order (KB → personas
  → skills/templates → workflows), rebuilding the project brief between layers.
- **`ensure-ready.cjs`** — new tool; answers "is workflow X's closure
  materialised?". CLI: `--workflow <id>`, `--closure <id>`, `--target <path>`.
  Exit 0 = ready, 1 = needs generation. Exports `computeClosure` and
  `resolveKbPath` for test use.
- **`/forge:materialize`** — new command; fills missing/stubbed artifacts without
  overwriting pristine ones. Separate verb from `/forge:regenerate` (fill-in
  vs. rebuild-always).
- **Per-file scoping for skills and templates** in `/forge:regenerate`:
  `regenerate skills engineer` and `regenerate templates PLAN_TEMPLATE` now work,
  mirroring the existing `personas` and `workflows` per-file patterns.
- **Config `mode` field** — `.forge/config.json` gains optional `"mode": "fast" |
  "full"`. Written by Phase 1; flipped to `"full"` on default `/forge:regenerate`
  or `/forge:materialize --all`.
- **Fast-mode smoke test** — Phase 11 branches on `config.mode`; validates stub
  sentinel, command count, schema presence, dep-graph edges — skips referential-
  integrity checks that assume full artifacts.

**Regenerate:** none — existing full-mode projects are unaffected. Fast mode is
opt-in at future `--fast` inits.

---

## [0.11.3] — 2026-04-16

**Parallelise init and regenerate across all generation phases.**

`/forge:init` and `/forge:regenerate` were bottlenecked by sequential LLM
generation passes in every phase. Applied the Phase 7 fan-out pattern
(one Agent call, all subagents in parallel) to every phase that generates
independent files:

- **Phase 3 (KB)** — 7 leaf docs now fan out in parallel (stack, processes,
  database, routing, deployment, entity-model, stack-checklist); index files
  and MASTER_INDEX generated sequentially after.
- **Phase 4 (Personas)** — 7 persona files fanned out in parallel.
- **Phases 5+6** — skills and templates now spawn in a *single* Agent call
  (all skill + all template subagents together) after Phase 4. The
  completeness guard runs before the fan-out; calibration baseline writes
  after.
- **Phases 8+9** — orchestration and commands spawn in a single Agent call
  after Phase 7.

`/forge:regenerate` gains the same treatment: `workflows` now uses
`build-init-context.cjs` + `workflow-gen-plan.json` fan-out; `personas`,
`skills`, and `templates` each fan out; the default (no-argument) run
uses 4 dependency-ordered parallel steps instead of 5 sequential category
passes.

New per-subagent rulebook files added to `forge/init/generation/`:
`generate-persona.md`, `generate-skill.md`, `generate-template.md`,
`generate-kb-doc.md`.

**Regenerate:** none — existing generated artifacts are unchanged.

---

## [0.11.2] — 2026-04-16

**Fix: restore requirements frontmatter in generated workflows.**

v0.11.1 incorrectly stripped the YAML `requirements:` frontmatter block from
generated workflow files. This block is not a leak — it carries
`reasoning`/`context`/`speed` fields used for runtime model selection and must
be preserved verbatim at the top of each generated workflow. The root cause was
a misdiagnosis: the actual bug was the self-check rule "first non-blank line
must be the persona symbol", which fails when frontmatter is correctly present.
Corrected both: `generate-workflows.md` now instructs subagents to copy the
frontmatter block then embed the persona after the closing `---`, and the
self-check now looks for the persona symbol as the first non-blank line *after*
the frontmatter, not the absolute first line.

**Regenerate:** `workflows`

---

## [0.11.1] — 2026-04-16

**Fix Phase 7 fan-out: persona symbol extraction, frontmatter leak, and intake persona.**

Three bugs found during smoke-test of v0.11.0 init on a real project:

1. `extractPersonaSymbol` in `build-init-context.cjs` returned `·` for all
   generated personas — the function only recognised YAML `symbol:` frontmatter.
   Generated personas use a first-line emoji format (`🗻 **Name** — tagline`).
   Fixed with Unicode `\p{Emoji_Presentation}` regex on the first non-blank line.

2. `generate-workflows.md` did not strip YAML frontmatter from meta-workflows
   before embedding content. Some meta-workflows begin with a `requirements:` /
   `reasoning:` block (`---` … `---`) that leaked into generated output, placing
   the persona section at line 8 instead of line 1 and breaking self-check.
   Fixed with an explicit strip rule in the per-subagent rulebook.

3. `workflow-gen-plan.json` had `"persona": "architect"` for `architect_sprint_intake`,
   but `meta-sprint-intake.md` explicitly instructs subagents to load
   `product-manager.md`. Corrected to `"persona": "product-manager"`.

**Regenerate:** `workflows`

---

## [0.11.0] — 2026-04-16

**Phase 7 workflow fan-out with minimal context brief.**

`/forge:init` Phase 7 now generates all 16 atomic workflow files in parallel
using fanned-out Agent subagents — one subagent per workflow — instead of a
single serial pass. A compact project brief (`.forge/init-context.md`, ≤3 KB)
is materialised once from deterministic sources before the fan-out, replacing
repeated full-context re-derivation across 16 serial model turns. Each subagent
reads only its own brief + meta-workflow + persona file, writes one file, and
self-validates before returning. Reduces Phase 7 wall time from ~15–20 min to
~1–2 min for typical projects. The fan-out table lives in
`forge/init/workflow-gen-plan.json`; the brief builder is
`forge/tools/build-init-context.cjs` (21 tests).

**Regenerate:** none — this change only affects new inits; existing generated
artifacts are unchanged.

---

## [0.10.1] — 2026-04-16

**Fix: `quiz_agent.md` missing from new inits.**

`quiz_agent.md` (the project KB knowledge-check workflow) was listed as a Phase 7
output in `generate-workflows.md` but had no meta-workflow source, so
`/forge:init` silently skipped it. Added `forge/meta/workflows/meta-quiz-agent.md`
with generation instructions that produce project-specific quiz questions from the
generated KB (architecture docs, domain entities, stack conventions). Wired into
`build-manifest.cjs` and `structure-manifest.json`.

**Regenerate:** `workflows`

---

## [0.10.0] — 2026-04-16

**Tomoshibi (灯) agent + KB path configurability.**

Forge's first named plugin agent — Tomoshibi — ensures that every coding-agent instruction file in a project (CLAUDE.md, AGENTS.md, .cursorrules, .github/copilot-instructions.md, GEMINI.md) has up-to-date links to the Forge knowledge base and generated workflow entry points. Manages two idempotent sections per file (`<!-- forge-kb-links -->` and `<!-- forge-workflow-links -->`), presents a clear approval prompt, and runs on every `forge:init`, `forge:update`, and collation.

KB folder name is now configurable at init pre-flight — projects where `engineering/` already carries another meaning can choose an alternative (e.g. `ai-docs`, `.forge-kb`). The choice is written to `paths.engineering` in `.forge/config.json` and propagated through all init phases.

**Regenerate:** `workflows` `commands` `personas` `skills` `tools`

---

## [0.9.0] — 2026-04-15 _(cycle: 0.9.0–0.9.18)_

**Store Custodian, named-agent IPC, calibrate, banner library, and Sprint S09.**

The 0.9.x series shipped Forge's deterministic store gateway (`store-cli.cjs`), migrating 16 meta-workflows from direct file writes to an auditable CLI. Sprint S09 delivered `/forge:calibrate` (drift detection and surgical regeneration patches), `/forge:add-task` (mid-sprint task addition), health config-completeness and KB freshness checks, init completeness guard, and calibration baseline recording. The 0.9.x patch cycle added named-agent IPC (orchestrator-owned phase banners with exit signals, Monitor streaming, file-based progress log), the banner library (`banners.cjs` with 10 agent identities), orchestrator context compaction via `/compact`, and a structure manifest for deterministic generated-file verification.

**Regenerate:** `workflows` `commands` `personas` `skills` `tools`

---

## [0.8.0] — 2026-04-14 _(cycle: 0.8.0–0.8.10)_

**Sprint S06 cap: persona system, slug-aware discovery, and collate lifecycle.**

Orchestrator persona noun-based lookup, meta-workflows purged of inline Persona sections, `forge:regenerate` includes personas by default, sprint schema gains `path` field, slug-aware directory discovery wired into `seed-store`, `collate`, and `validate-store`. The 0.8.x patch cycle fixed ghost event files, added collate `--purge-events`, stamped the init migration baseline, shipped workflow canonical naming, switched to `effort:` frontmatter, and fixed sprint-plan and `forge:update` Step 4.

**Regenerate:** `workflows` `commands` `personas` `skills` `tools`

---

## [0.7.0] — 2026-04-13 _(cycle: 0.7.0–0.7.11)_ **△ Breaking**

**Portability migration + Japanese nature persona palette.**

Legacy `model: <id>` fields replaced with structured `requirements` blocks (3D Agent Model and symmetric injection). ID-description folder naming and absolute path injection in subagent prompts eliminate model path-guessing. The 0.7.x patch cycle added the Japanese nature persona palette (🗻 Architect, 🌸 PM, 🍵 QA), orchestrator persona announcements, ghost event fix, false breaking-change suppression in `forge:update`, and `validate-store` slug and filesystem consistency checks.

**Regenerate:** `workflows` `commands` `personas` `skills` `tools`

> Manual: Check `.forge/config.json` for custom `model` overrides in `config.pipelines`. If present, migrate to the `requirements` block format in the corresponding workflow artifacts.

---

## [0.6.0] — 2026-04-09 _(cycle: 0.6.0–0.6.13)_

**Feature tier, QA validate phase, and distribution-aware update URLs.**

Feature entity (`feature.schema.json`, `.forge/store/features/`), `feature_id` in sprint/task schemas, `collate` generates `features/` registry, `/forge:health` reports per-feature test coverage. QA validate phase wired into default pipeline. `store.cjs` facade for standardised store CRUD. Distribution-aware `updateUrl`/`migrationsUrl` in `plugin.json` — each distribution branch checks its own host repo. `validate-store` abandoned enum fix, collate fixes, skillforge `git-subdir` switch.

**Regenerate:** `workflows` `commands` `personas` `skills` `tools`

---

## [0.5.0] — 2026-04-06 _(cycle: 0.5.0–0.5.9)_

**fix-bug orchestrator, collate FORGE_ROOT fix, and update UX improvements.**

`fix-bug` became a true orchestrator (chained subagents, revision loop, plain status codes). Collate meta-templates emit a runtime `FORGE_ROOT` read instead of baking the absolute plugin cache path — regenerated workflows no longer go stale on version bumps. `forge:update` detects canary/source installs and skips install steps; `validate-store` null handling; update UX improvements across the patch cycle.

**Regenerate:** `workflows` `commands` `tools`

---

## [0.4.0] — 2026-04-05 _(cycle: 0.4.0–0.4.1)_ **△ Breaking**

**Japanese-style marks, command renames, and persona symbols.**

〇△×🌱🌿⛰️ marks across all output. Agent personas gain symbols and first-person announcements. Built-in commands renamed to `plan`/`review-plan`/`review-code`. `generation-manifest` tool added. `engineering/tools/` eliminated — all tools invoked from `$FORGE_ROOT/tools/`. `paths.forgeRoot` and `paths.customCommands` added to config schema. 0.4.0 backfilled explicit model fields on pipeline phases.

**Regenerate:** `workflows` `commands`

> Manual: Backfill model fields on pipeline phases: `node engineering/tools/manage-config.cjs pipeline backfill-models`

---

## [0.3.0] — 2026-04-02 _(cycle: 0.3.0–0.3.15)_

**Pre-built CJS tools, revision loop, context accumulation fix, and FORGE-S01.**

Tools shipped as pre-built Node.js CJS scripts (collate, seed-store, validate-store, manage-config) — eliminates project-language dependency. Orchestrator revision loop fixed (verdict detection + `on_revision` routing). Context accumulation fix: each pipeline phase now runs as a fresh Agent tool subagent (closes BUG-001). Token Usage Tracking sprint (FORGE-S01): event schema gains token fields, `collate` generates `COST_REPORT.md`, retrospective cost analysis. Error triage hook, graceful error handling, `forge:migrate` command.

**Regenerate:** `workflows` `commands` `tools`

---

## [0.2.0] — prior

Initial release. Core SDLC loop: `plan → review-plan → implement → review-code → approve → commit`. Sprint management, bug tracking, store, and init.
