# Changelog

All notable changes to Forge are documented here.
Format: newest first. Breaking changes are marked **△ Breaking**.

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
