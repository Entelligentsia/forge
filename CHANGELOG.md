# Changelog

All notable changes to Forge are documented here.
Format: newest first. Breaking changes are marked **△ Breaking**.

---

## [Unreleased]

(no entries)

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
