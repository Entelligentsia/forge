# Changelog

All notable changes to Forge are documented here. Entries are derived from
`forge/migrations.json` — the authoritative version chain.

Format: newest first. Breaking changes are marked **△ Breaking**.

---

## [0.9.18] — 2026-04-16

Orchestrator context compaction: `/compact` called after each phase-exit signal with a checkpoint line to preserve loop bookkeeping across the compact. Applies to `orchestrate_task`, `fix_bug`, and `run_sprint`.

**Regenerate:** `workflows`

---

## [0.9.17] — 2026-04-16

Fix file generation integrity: skills included in default regenerate run, consistent `-skills.md` naming convention, `validate_task` workflow added to generation, all schemas copied by `update-tools`, hash recording for init and update-tools, post-regeneration structure verification added to all regeneration paths.

**Regenerate:** `workflows` `commands` `templates` `personas` `skills` `tools`

> Manual: Run `/forge:regenerate skills` to adopt the new `-skills.md` naming convention.

---

## [0.9.16] — 2026-04-16

Named-agent IPC: orchestrator-owned phase banners with exit signals, file-based progress log with Monitor streaming, `store-cli progress`/`progress-clear` commands, agent naming convention `{taskId}:{persona}:{phase}:{iteration}` (GH-46).

**Regenerate:** `workflows` `tools`

---

## [0.9.15] — 2026-04-16

Fix BUG-041/042/043/044: re-derive `FORGE_ROOT` after plugin update, add plugin-installed schema fallback to `store-cli`/`validate-store`, copy schemas during init, remove hardcoded model names from `orchestrate_task.md`, add cluster-based model dispatch using environment variables.

**Regenerate:** `tools` `workflows`

---

## [0.9.14] — 2026-04-16

Sprint S09 cap release: init phase renumbering, `calibrationBaseline` + required-field config schema, init completeness guard + calibration baseline write, health config-completeness + KB freshness checks, `/forge:calibrate` drift detection + surgical patches, sprint-plan `SPRINT_PLAN.md` output path fix, `/forge:add-task` mid-sprint command, BUG-008 persona injection fix, BUG-009 structure manifest + `clear-namespace`, banner library with agent identity.

**Regenerate:** `commands` `workflows` `personas`

---

## [0.9.13] — 2026-04-16

Add `/forge:add-task` command for adding tasks to existing sprints mid-flight — mini intake interview, sequential ID assignment, store write, and collate.

**Regenerate:** `commands`

---

## [0.9.12] — 2026-04-16

Add `/forge:calibrate` — drift detection with four-category classification, surgical regeneration patches with Architect approval gate, and `calibrationHistory` audit trail in `.forge/config.json`.

**Regenerate:** `commands`

---

## [0.9.11] — 2026-04-16

Health: add config-completeness check (validates `.forge/config.json` required fields) and KB freshness check (compares `MASTER_INDEX.md` hash against `calibrationBaseline`, categorises drift as technical or business-domain).

**Regenerate:** `commands`

---

## [0.9.10] — 2026-04-16

Init: add completeness guard (verifies all required config fields before proceeding) and calibration baseline write (records project state at init time for `/forge:calibrate` drift detection) to Phase 5.

---

## [0.9.9] — 2026-04-16

Banner library: add `forge/tools/banners.cjs` (10 agent identities, 3 render modes: full/badge/mark) and `banners.sh` bash wrapper. Wire banners into meta-personas and orchestrator announcement algorithms. Subagent identity injection now runs the banner command as first action.

**Regenerate:** `workflows` `personas`

---

## [0.9.8] — 2026-04-15

Structure manifest: add `check-structure.cjs` and `build-manifest.cjs` for deterministic generated-file verification; add `clear-namespace` to `generation-manifest.cjs`; integrate structure check into `/forge:health` and `/forge:update`. Fixes 14 stale generation-manifest entries from role-based naming. 57 expected files tracked.

---

## [0.9.7] — 2026-04-16

Fix fix-bug persona assignment: `plan-fix` and `implement` use `bug-fixer`, `review-plan` and `review-code` use `supervisor`, `approve` uses `architect`, `commit` uses `engineer`. Adds `ROLE_TO_NOUN` table to generated `fix_bug.md` announcement algorithm.

**Regenerate:** `workflows:fix_bug`

---

## [0.9.6] — 2026-04-15

Fix fix-bug triage: `locate-or-create` gate ensures bug record and engineering folder are created via `store-cli` before any read/classify step. Add `githubIssue` optional URI field to `bug.schema.json`.

**Regenerate:** `workflows:fix_bug`

---

## [0.9.5] — 2026-04-15

Fix BUG-008: `meta-fix-bug.md` gains complete `PERSONA_MAP` + `spawn_subagent` announcement algorithm with noun-based persona/skill injection; `orchestrate_task.md` regenerated with correct `ROLE_TO_NOUN` lookup and tagline+model in announcement; personas and skills regenerated with noun-based filenames.

**Regenerate:** `workflows:fix_bug` `workflows:orchestrate_task` `personas` `skills`

---

## [0.9.4] — 2026-04-15

Fix sprint-plan: `SPRINT_PLAN.md` now written to explicit path `engineering/sprints/{sprintId}/SPRINT_PLAN.md` — prevents root-level or missing placement.

**Regenerate:** `workflows:architect_sprint_plan`

---

## [0.9.3] — 2026-04-15

Init phase renumbering — fractional phases (1.5, 3b) replaced with sequential integers (1–11), checkpoint values now integers, banners updated to N/11 format.

**Regenerate:** `commands`

---

## [0.9.2] — 2026-04-15

CLI engagement — init pre-flight plan, phase/step banners, checkpoint/resume, per-file status lines in regenerate, batch Step 5 audit in update, command name frontmatter, `list-skills` moved from hooks to tools, schema updates (event tokens, sprint path, task `feature_id`, `abandoned` status), `seed-store` bug status default.

**Regenerate:** `commands` `tools`

---

## [0.9.1] — 2026-04-15

Store Repair command: new `/forge:store-repair` slash command for diagnosing and repairing corrupted store records. `validate-store.cjs` gains `--json` flag for structured output and `--fix --dry-run` combination for previewing fixes.

**Regenerate:** `commands` `tools`

---

## [0.9.0] — 2026-04-15

Store Custodian — deterministic store gateway: new `store-cli.cjs` CLI, store-custodian skill and tool spec, 16 meta-workflows migrated from direct store writes to custodian, `collate`/`validate-store` facade bypass closures, sprint schema gains `goal` and `features` fields.

**Regenerate:** `workflows` `skills` `tools`

---

## [0.8.10] — 2026-04-14

Fix `/forge:update` Step 4: Iron Laws block models from calling `generation-manifest.cjs record` directly (skipping actual regeneration); adds sub-target filename resolution rule to prevent prefix stripping.

---

## [0.8.9] — 2026-04-14

Fix eager-model compliance: sprint-plan command no longer pre-loads `MASTER_INDEX` (workflow owns context loading); sprint-plan workflow gains Iron Laws guard against self-directed planning.

**Regenerate:** `workflows:architect_sprint_plan` `commands:sprint-plan`

---

## [0.8.8] — 2026-04-14

Fix sprint-plan: generated workflows now create task folders and `TASK_PROMPT.md` for each task, so `plan_task` has a source of truth to read.

**Regenerate:** `workflows:architect_sprint_plan`

---

## [0.8.7] — 2026-04-14

`/forge:health` now accepts `--path <dir>` to check a project other than the current working directory.

---

## [0.8.6] — 2026-04-14

`/forge:update` canary detection now uses `/.claude/plugins/` prefix — marketplace installs under `/.claude/plugins/marketplaces/` no longer misidentified as canary source installs.

---

## [0.8.5] — 2026-04-14

`forge:init` now generates workflows with canonical names (`plan_task.md`, `implement_plan.md`, `review_plan.md`, `review_code.md`, `fix_bug.md`, `commit_task.md`, `update_plan.md`, `update_implementation.md`) — drops legacy `engineer_`/`supervisor_` prefixes.

**Regenerate:** `workflows` `commands`

---

## [0.8.4] — 2026-04-14

`forge:init` now uses `effort:` frontmatter (low/medium/high/max) in generated `.claude/commands/` stubs instead of `model:` — capability-based, model-agnostic.

**Regenerate:** `commands`

---

## [0.8.3] — 2026-04-14

`collate`: add `--purge-events` flag — generates `COST_REPORT.md` then atomically deletes the event directory; retrospective and fix-bug workflows updated to use the flag.

**Regenerate:** `workflows:sprint_retrospective` `workflows:fix_bug`

---

## [0.8.2] — 2026-04-14

Event summarisation and purge at lifecycle close: retrospective runs `collate` then purges sprint events; fix-bug summarises token cost into the bug artifact then purges bug events.

**Regenerate:** `workflows:sprint_retrospective` `workflows:fix_bug`

---

## [0.8.1] — 2026-04-14

`forge:init` now writes `.forge/update-check-cache.json` and `.forge/generation-manifest.json` in the smoke-test Stamp step — anchors the migration baseline so `/forge:update` correctly detects workflow drift after upgrades.

---

## [0.8.0] — 2026-04-14

Sprint S06: orchestrator persona noun-based lookup, meta-workflows purged of inline Persona sections, `forge:regenerate` now includes personas by default, ghost event file bug fixed, false breaking-change confirmation suppressed in `forge:update`, sprint schema gains `path` field, slug-aware directory discovery added to `seed-store`/`collate`/`validate-store`.

**Regenerate:** `workflows` `personas`

---

## [0.7.11] — 2026-04-14

`validate-store`: add Pass 3 filesystem consistency checks — slug-aware directory walk detects orphaned sprint/task directories and dangling path fields; new checks emit warnings (not errors) for backward compatibility.

---

## [0.7.10] — 2026-04-14

`collate`: resolve sprint directory names from `sprint.path` field in `MASTER_INDEX` task link generation; fix task link resolution for engineering-rooted task paths.

---

## [0.7.9] — 2026-04-14

Add personas to `forge:regenerate` defaults: default run is now `workflows + commands + templates + personas`; per-persona sub-target support added (e.g. `/forge:regenerate personas engineer`).

---

## [0.7.8] — 2026-04-14

Slug-aware `seed-store` discovery and path construction: three-tier regex for sprints/tasks/bugs with slug-named directories; populate `sprint.path` field; add `deriveSlug()` utility; fix bare-task number extraction for T10+.

---

## [0.7.7] — 2026-04-14

Purify meta-workflows: remove all inline `## Persona` sections; standalone commands gain Persona Self-Load instructions at runtime; sprint-intake reassigned from Architect to Product Manager (🗻→🌸).

**Regenerate:** `workflows`

---

## [0.7.6] — 2026-04-14

Add optional `path` field to sprint schema with backward-compatible WARN on missing path; add `warn()` function to `validate-store` for non-fatal advisories.

---

## [0.7.5] — 2026-04-14

Suppress false breaking-change confirmation in `forge:update`: auto-skip model-override manual step when `config.pipelines` only uses standard Forge aliases (sonnet, opus, haiku).

---

## [0.7.4] — 2026-04-14

Fix ghost event files: `store.cjs` `writeEvent` detects and renames mismatched filenames before writing; `validate-store --fix` renames files instead of creating duplicates on `eventId` backfill.

---

## [0.7.3] — 2026-04-14

Fix orchestrator persona lookup: noun-based filenames via `ROLE_TO_NOUN` (plan→engineer, approve→architect, etc.) instead of role-based; announcement line includes task ID, tagline, and resolved model.

**Regenerate:** `workflows:orchestrate_task`

---

## [0.7.2] — 2026-04-14

Japanese nature persona palette: 🗻 Architect, 🌸 Product Manager, 🍵 QA Engineer; persona announcements wired into orchestrator; emoji H1 prefixes on all workflow meta-templates.

**Regenerate:** `workflows:orchestrate_task`

---

## [0.7.1] — 2026-04-13

Grounding and descriptive pathing: transition to ID-description folder naming and explicit absolute path injection in subagent prompts to eliminate model path-guessing.

**Regenerate:** `workflows` `commands` `personas` `skills`

---

## [0.7.0] — 2026-04-13 **△ Breaking**

Portability migration: transition from legacy `model: <id>` fields to structured `requirements` blocks in generated workflows to support the 3D Agent Model and symmetric injection.

**Regenerate:** `workflows` `commands` `personas` `skills`

> Manual: Check `.forge/config.json` for custom `model` overrides in `config.pipelines`. If present, migrate these to the `requirements` block format.

---

## [0.6.13] — 2026-04-12

Implement `forge/tools/store.cjs` facade for standardised store CRUD operations (Sprints, Tasks, Bugs, Events, Features) and `FSImpl` backend.

**Regenerate:** `tools`

---

## [0.6.12] — 2026-04-12

Fix `collate`: `resolveDir` gains numeric glob fallback for sprint IDs without hyphens; `loadSprintEvents` backfills `taskId`/`role`/`action` from sidecar filename when JSON lacks attribution fields.

---

## [0.6.11] — 2026-04-10

Fix `/forge:update`: stop hardcoding skillforge distribution URL — always read `updateUrl`/`migrationsUrl` from installed `plugin.json` (fixes 404 on skillforge update check).

---

## [0.6.10] — 2026-04-10

Fix `validate-store` `abandoned` enum gap; add `meta-review-sprint-completion` workflow; add `validate` role to pipeline schema; update default/bug pipeline examples to include validate phase; document pipeline ownership model.

**Regenerate:** `workflows:architect_review_sprint_completion`

> Manual: Add `validate` phase between `review-code` and `approve` in `config.pipelines.default`.

---

## [0.6.9] — 2026-04-10

QA validate phase: new `meta-qa-engineer` and `meta-product-manager` personas, `meta-validate` workflow, validate phase wired into default pipeline in `meta-orchestrate`; sprint-intake gains PM persona header; update command gains cross-distribution downgrade detection.

**Regenerate:** `workflows:orchestrate_task` `workflows:architect_sprint_intake`

---

## [0.6.8] — 2026-04-10

Switch skillforge distribution to `git-subdir` from `forge` release branch; remove hardcoded `SKILLFORGE_UPDATE_URL` from `check-update.js` — each branch's `plugin.json` now carries its own `updateUrl`.

---

## [0.6.7] — 2026-04-10

Remove dead Bash hook duplicates: `check-update.sh` and `list-skills.sh` deleted; hooks have been JS-only since initial registration in `hooks.json`.

---

## [0.6.6] — 2026-04-10

Distribution-aware update-check cache: hooks persist `distribution` and `forgeRoot` in `.forge/update-check-cache.json` and refresh `paths.forgeRoot` in `config.json` on every session start; `/forge:update` refreshes `paths.forgeRoot` in Step 6 and handles cross-distribution downgrade scenario.

---

## [0.6.5] — 2026-04-10

Path-based distribution detection: hooks derive update URL from plugin cache path pattern instead of reading `updateUrl` from `plugin.json` — eliminates `plugin.json` patching during skillforge submodule bumps.

---

## [0.6.4] — 2026-04-10

Distribution-aware update URLs: `updateUrl` and `migrationsUrl` added to `plugin.json` so each distribution checks its own host repo for updates.

---

## [0.6.3] — 2026-04-09

Fix `/forge:update` migration baseline: move `update-check-cache.json` to `.forge/` (project-scoped) so multi-project machines don't share migration state across projects.

---

## [0.6.2] — 2026-04-09

Housekeeping: sync `sprint.schema.md` to include `goal`/`features`/`feature_id` fields, remove dead `FALLBACK` object from `validate-store.cjs`, add re-spawn guard to `run_sprint` workflow.

---

## [0.6.1] — 2026-04-09

Lean migration architecture: eliminate `tools` regenerate target (schemas now embedded in `validate-store`), introduce colon-delimited granular regeneration sub-targets for workflows and knowledge-base, retroactively correct 0.6.0 migration entry.

---

## [0.6.0] — 2026-04-09

FORGE-S02 — Foundational Concepts Documentation + Feature Tier: new Feature entity (`feature.schema.json`, `.forge/store/features/`), `feature_id` nullable field added to sprint and task schemas, `collate` generates `engineering/features/` registry, `validate-store` enforces feature referential integrity, `/forge:health` reports per-feature test coverage, `docs/concepts/` section added.

**Regenerate:** `workflows:architect_sprint_intake` `workflows:architect_sprint_plan`

---

## [0.5.9] — 2026-04-07

Collate meta-templates now emit a runtime `FORGE_ROOT` read instead of baking the absolute plugin cache path — regenerated workflows no longer go stale on version bumps.

**Regenerate:** `workflows`

---

## [0.5.8] — 2026-04-07

`forge:update` no longer shows an install prompt when the plugin is already current — project migrations now use a separate Step 2B flow with clear messaging.

---

## [0.5.7] — 2026-04-07

`forge:update` now detects canary/source installs and skips the plugin-manager install step, going directly to migrations.

---

## [0.5.6] — 2026-04-07

`fix-bug` is now a true orchestrator (chained subagents, revision loop, plain status codes, announcement banners); `collate` `COST_REPORT.md` now writes to the correct descriptive sprint directory.

**Regenerate:** `workflows`

---

## [0.5.5] — 2026-04-07

Fix `validate-store`: allow null `endTimestamp`/`durationMinutes` on start events; add event backfill rules so `--fix` repairs pre-schema FORGE-S01 events.

---

## [0.5.4] — 2026-04-06

0.5.x patches: fix command scope boundary, stale session context, install guidance, command wrapper regeneration. Fixes from 0.5.0–0.5.3.

**Regenerate:** `commands`

---

## [0.4.1] — 2026-04-05

Japanese-style marks (〇△×🌱🌿⛰️) across all output; agent personas gain symbols and first-person announcements in workflows; built-in commands renamed `plan`/`review-plan`/`review-code`; `generation-manifest` tool added; `engineering/tools/` eliminated — all tools invoked from `$FORGE_ROOT/tools/`; `paths.forgeRoot` and `paths.customCommands` added to schema.

**Regenerate:** `workflows`

---

## [0.4.0] — 2026-04-05 **△ Breaking**

Backfill explicit model fields on pipeline phases in `config.json` — fixes orchestrator falling through to unreliable prose role-default table (closes #19).

> Manual: Run `node engineering/tools/manage-config.cjs pipeline backfill-models`.

---

## [0.4.0-sprint] — 2026-04-05

Token Usage Tracking sprint (FORGE-S01): event schema gains optional token fields, `collate` generates `COST_REPORT.md`, `estimate-usage` fallback tool, orchestrator subagent self-reporting and sidecar merge, retrospective cost analysis, bug report opt-in for token data.

**Regenerate:** `workflows`

---

## [0.3.15] — 2026-04-05

Fix model assignment in orchestrator: `spawn_subagent` now passes explicit model per phase (`phase.model` from config → role-based default). Unified `/forge:update` UX: checks GitHub, shows changelog, guides install, and applies migrations in one command.

**Regenerate:** `workflows`

---

## [0.3.14] — 2026-04-05

Fix `validate-store`: nullable FK support (`sprintId`/`taskId`), event `taskId` checked against bugs, virtual sprint dirs accepted, `--fix` backfills `sprint.createdAt` and `bug.reportedAt` (closes #15, #16).

---

## [0.3.13] — 2026-04-04

Drop `TIMESHEET` generation from `collate`; make event `model` field required with CLI-agnostic full model ID; add timing capture instructions to orchestrate event emission.

**Regenerate:** `workflows`

---

## [0.3.12] — 2026-04-04

Fix `collate` writing TIMESHEETs to wrong sprint directory and generating broken `MASTER_INDEX` links when sprint/task directories use the full ID.

---

## [0.3.11] — 2026-04-04

Fix context accumulation in sprint runner and task orchestrator — each phase now runs as an Agent tool subagent (fresh context per phase/task), keeping the orchestrator itself light (closes BUG-001).

**Regenerate:** `workflows`

---

## [0.3.10] — 2026-04-04

Fix orchestrator revision loop: `meta-orchestrate.md` now specifies a concrete executable algorithm with verdict detection from review artifacts and `on_revision` routing; `sdlc-config.schema.json` adds `on_revision` field (closes #14).

**Regenerate:** `workflows`

---

## [0.3.9] — 2026-04-04

`check-update` hook now prompts `/forge:update` after a plugin install is detected (when `.forge/config.json` exists).

---

## [0.3.8] — 2026-04-04

Fix `collate` `statusBadge()` double-status rendering; fix `validate-store` false failures (null fields, prefixed sprint IDs, sprint-level events); add `abandoned` to sprint/task schemas; add `/forge:migrate` command for interactive pre-Forge store migration (closes #11, #12, #13).

---

## [0.3.7] — 2026-04-03

Ship tools as pre-built Node.js CJS scripts (`collate`, `seed-store`, `validate-store`, `manage-config`) and JSON Schema files; Phase 8 copies instead of generates; eliminates project-language dependency for tooling; adds JSON Schema backing for all store types (closes #10).

---

## [0.3.6] — 2026-04-02

Graceful error handling across all plugin scripts and tool specs: hooks exit 0 on failure, utility scripts degrade to known exit codes, tool specs require top-level exception handlers in generated tools.

---

## [0.3.5] — 2026-04-02

Add error triage: `PostToolUse` hook detects Forge tool failures and prompts bug filing; `On error` footer added to all command files; `/forge:report-bug` now auto-fills from conversation context.

---

## [0.3.4] — 2026-04-02

Fix `/forge:add-pipeline` and `/forge:report-bug` — convert body-section `!` patterns to plain code blocks so they are not auto-executed at skill expansion time.

---

## [0.3.3] — 2026-04-02

Fix `seed-store` camelCase/snake_case mismatch — spec now explicitly requires camelCase field names matching `validate-store` (fixes 167 false-positive errors from `/forge:health`).

---

## [0.3.2] — 2026-04-02

Fix `/forge:update` cache path when `CLAUDE_PLUGIN_DATA` is unset — now resolves to `/tmp/forge-plugin-data/` instead of `/forge-plugin-data/`.

---

## [0.3.1] — 2026-04-02

Fix `/forge:update` shell permission error — replaced inline node one-liners with Read/Write tool instructions.

---

## [0.3.0] — 2026-04-02

Pluggable pipeline routing, `/forge:add-pipeline` command, `manage-config` tool spec, extended `/forge:regenerate` with `tools` and `knowledge-base` categories.

**Regenerate:** `workflows`

---

## [0.2.0] — prior

Initial release. Core SDLC loop: `plan → review-plan → implement → review-code → approve → commit`. Sprint management, bug tracking, store, and init.
