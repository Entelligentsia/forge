# Sprint Requirements — FORGE-S11

**Captured:** 2026-04-20
**Source:** GitHub issues #48, #49, #50, #53, #55, #56, #57, #58, #59 (direct analysis, no Q&A)

---

## Goals

1. Fix all six confirmed bugs affecting tool crash, wrong gate application, broken timestamps, broken collator links, missing calibration baseline, and missing model resolution fallback — so the core pipeline runs without workarounds.
2. Close the `quiz_agent` slash-command gap and the flat-file cleanup UX gap — so command generation is complete and self-cleaning.
3. (Nice-to-have) Refactor CJS module APIs to return structured Results — eliminating silent throw/null patterns for LLM consumers.

## Feature

`null` — standalone tech debt sprint; not advancing any tracked feature.

---

## In Scope

### #56 — Event timestamps are date-only (T00:00:00Z) [must-have]
`forge/tools/store-cli.cjs` event writer zeros the time component of `startTimestamp` / `endTimestamp`, making `durationMinutes` always 0 and destroying intra-day ordering.

**Acceptance criteria:**
- Event records have real ISO timestamps with actual time-of-day (e.g. `2026-04-20T14:32:07.123Z`).
- `durationMinutes` reflects actual elapsed time between start and end writes.
- Existing passing tests still pass; new test confirms non-zero time component.

---

### #58 + #59 — `preflight-gate.cjs` wrong gate + crash [must-have]
Two bugs in the same file:
- **#58:** When multiple workflow files exist, alphabetically-first match (`fix_bug.md`) is selected instead of the caller's workflow, applying wrong gate conditions.
- **#59:** `ReferenceError: Cannot access '<variable>' before initialization` when evaluating the `implement` phase gate, causing the tool to crash instead of returning exit code 2.

**Acceptance criteria:**
- Gate resolution uses the explicitly passed workflow name, not an alphabetical scan.
- `implement` phase gate evaluates without crash; returns exit code 0 (pass), 1 (fail), or 2 (misconfigured).
- All existing preflight-gate tests pass; new tests cover both regressions.

---

### #57 — `orchestrate_task`: ROLE_TIER fallback not applied [must-have]
When `ANTHROPIC_DEFAULT_PRIMARY/SECONDARY/FAST_MODEL` env vars are unset, the orchestrator neither falls back to ROLE_TIER defaults nor displays the resolved model in phase announcements. Pipeline stalls before spawning subagents.

**Acceptance criteria:**
- When no cluster env vars are set, each phase resolves its model from ROLE_TIER defaults (`sonnet` → `claude-sonnet-4-6`, `opus` → `claude-opus-4-5`, `haiku` → `claude-haiku-4-5`).
- Resolved model name is displayed in every phase announcement line.
- Workflow generates downstream agents correctly without stalling.

---

### #53 — Collator: broken task links + missing task INDEX.md [must-have]
Two related bugs in `forge/tools/collate.cjs` and `forge/meta/workflows/meta-collate.md`:
- Sprint `INDEX.md` renders task links as `{taskId}/INDEX.md` (flat), but actual path is `tasks/{task_dir}/INDEX.md`.
- No `INDEX.md` is ever generated inside task directories — both sprint and master index links dangle.

**Acceptance criteria:**
- Sprint `INDEX.md` task links resolve correctly to `tasks/{task_dir}/INDEX.md`.
- `collate.cjs` creates (or updates) an `INDEX.md` inside each task directory.
- All existing collate tests pass; new tests cover both path formats.

---

### #55 — Fast-mode init skips `calibrationBaseline`; updates don't maintain it [must-have]
`/forge:init --fast` jumps from Phase 3 directly to Phase 7-fast, bypassing Phase 5/6-b where `calibrationBaseline` is written into `config.json`. Subsequent `/forge:update` runs also do not update it. `/forge:calibrate` then aborts with "no calibrationBaseline".

**Acceptance criteria:**
- After `/forge:init --fast`, `config.json` contains a valid `calibrationBaseline` object with `lastCalibrated`, `version`, `masterIndexHash`, `sprintsCovered`.
- After a successful `/forge:update` that changes materialized artifacts, `calibrationBaseline` is refreshed in `config.json`.
- `/forge:calibrate` runs to completion without "no calibrationBaseline" abort for fast-mode projects.

---

### #48 — No post-regeneration cleanup of old flat command files [must-have]
`forge/init/generation/generate-commands.md` overwrites flat files individually (pre-generation check) but never scans for any remaining flat-path orphans after generation is complete. The manual `rm -f` step documented in the v0.13.0 migration notes is never automated.

**Acceptance criteria:**
- After writing all namespaced command files, the generator scans `.claude/commands/` for the 13 known flat filenames.
- If any are found, user is prompted: lists the files and asks `Remove them now? (yes / skip)`.
- On `yes`, the flat files are `rm -f`'d and confirmed; on skip, user is reminded to delete manually.
- If none found, no prompt is shown.

---

### #50 — `quiz_agent` workflow has no slash command [must-have]
`meta-quiz-agent.md` generates `.forge/workflows/quiz_agent.md` in user projects, but `forge/init/generation/generate-commands.md` does not include it in the 13 known commands, and no `forge/commands/quiz-agent.md` exists.

**Acceptance criteria:**
- `forge/commands/quiz-agent.md` is created following the standard command template.
- `generate-commands.md` includes `quiz-agent.md` in its explicit output list with correct description, effort, and workflow reference.
- After regeneration, `/prefix:quiz-agent` is an available slash command in user projects.

---

## Nice-to-Have *(attempt if must-haves complete)*

### #49 — Structured Result returns for CJS module APIs
Exported functions in `forge/tools/*.cjs` currently throw or return `null` silently. Refactor to return `{ ok: true, value }` / `{ ok: false, code, message }` so LLM consumers can branch on `result.code` without string-matching exceptions.

- Scope: module exports only (CLI exit-code contract unchanged).
- Establish shared error code set in a constants file or inline enum.
- All 241+ existing tests must pass; new tests for each modified export.
- **This is large (XL).** Only begin after all must-haves are committed.

---

## Out of Scope

- CI/CD pipeline changes.
- New marketplace listing or distribution changes.
- Changes to LSP tool integrations.
- Any UI or frontend work.
- Making command generation fully auto-discover arbitrary workflows (only the known missing command — `quiz_agent` — is fixed; general discovery is a separate feature).

---

## Constraints

- **Plugin compatibility:** must not break users on v0.13.0+; no store schema shape changes.
- **Distribution:** all changes are in `forge/` — version bump to `0.20.0`, security scan, `migrations.json` entry, and `CHANGELOG.md` entry required.
- **Dependencies:** Node.js built-ins only; no new npm packages.
- **Regeneration impact:** fixes to `store-cli.cjs`, `preflight-gate.cjs`, `collate.cjs` require users to run `/forge:update-tools`; fix to `meta-orchestrate.md` requires workflow regeneration. Migration entry must set `regenerate: ["tools", "workflows"]`.
- **Test gate:** all 241 tests must pass before version bump. Each changed `.cjs` file requires a failing test written before the fix.

---

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `preflight-gate.cjs` crash (#59) root cause is in a code path not yet read | Medium | Read full file before planning the fix; write a reproducer test first |
| Fast-mode init calibration write (#55) requires modifying a multi-phase document with many interdependencies | Medium | Surgical insertion of calibration step after Phase 7-fast stub writes; no phase renumbering |
| Collate task INDEX.md generation (#53) may need schema changes for task directory mapping | Low | `collate.cjs` already knows task paths from store records; no schema change expected |
| #49 (nice-to-have) scope creep into must-have window | Medium | Time-box: if must-haves are not all committed by T08, skip #49 entirely |

---

## Carry-Over from FORGE-S10

| Item | Status | Notes |
|---|---|---|
| No explicit carry-over | — | S10 was single-task, retrospective-done |
