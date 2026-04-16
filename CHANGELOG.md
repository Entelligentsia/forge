# Changelog

All notable changes to Forge are documented here.
Format: newest first. Breaking changes are marked **△ Breaking**.

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
