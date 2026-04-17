# PROGRESS — FEAT-004: Interactive Mode Prompt for `/forge:init`

🌱 *Forge Engineer*

**Feature:** FEAT-004
**Target version:** 0.12.1 (or next patch — see Plugin Checklist)
**Date:** 2026-04-17

---

## Summary

Replaced flag-only fast-mode discovery with an **interactive mode prompt**.
After resume detection and before the pre-flight plan, `/forge:init` now
asks the user to pick Full (default) or Fast. The pre-flight plan that
follows is mode-specific — Full keeps the familiar 12-row table; Fast
labels each row with a fixed-width status tag (`[runs]`, `[skeleton]`,
`[stubs]`, `[deferred]`) so users see what runs now vs. on first workflow
use.

`--fast` and a new `--full` flag remain non-interactive escape hatches for
scripted/CI runs; combining them halts immediately with a conflict error.

Mode is persisted to `.forge/init-progress.json` pre-Phase-1 (chosen
channel — `manage-config.cjs set` cannot bootstrap a missing config) and
propagated into `.forge/config.json` by Phase 1's existing `set mode`
hook (now reading from `init-progress.json` instead of branching on
`$ARGUMENTS`).

On resume, the stored mode is offered as the default with a switch option;
switching emits an explicit warning (Fast→Full regenerates skipped phases;
Full→Fast retains existing artifacts but honours fast-mode behaviour
forward). Resuming into a phase that's skipped in the new mode advances
to the next active phase with a `△` notice, per the fast-mode phase map
`1, 2, 3, 7, 9, 10, 11, 12`.

## Syntax Check Results

**No JS/CJS files modified — only Markdown.** No `node --check` runs
applicable.

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
Store validation passed (10 sprint(s), 70 task(s), 16 bug(s)).
```

## Test Suite Results

```
$ node --test forge/tools/__tests__/*.test.cjs
ℹ tests 286
ℹ suites 48
ℹ pass 286
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 159.539609
```

All 286 tests pass.

## Files Changed

| File | Change |
|---|---|
| `forge/commands/init.md` | New `### Mode Selection` section between resume detection and pre-flight; mode-conditional pre-flight tables (Full + Fast variants); resume flow extended with stored-mode sub-prompt, switch warnings, skipped-phase advance message; `--fast`/`--full` flag handling rewritten with conflict detection and phase-flag composition note |
| `forge/init/sdlc-init.md` | `## Fast-mode detection` now reads `mode` from `.forge/init-progress.json` (jq with full-mode fallback) instead of branching on `$ARGUMENTS`; Phase 1 propagates the chosen mode into `config.json` from the same source, so fast and full both share one code path |
| `CHANGELOG.md` | Prepended `## [Unreleased]` entry describing the interactive prompt, mode-specific tables, flag escape hatches, persistence channel, and resume-time switch behaviour |
| `engineering/features/FEAT-004.md` | Status flipped from `🔵 active` to `〇 implemented` |
| `engineering/features/FEAT-004-progress.md` | NEW — this file |
| `.forge/store/features/FEAT-004.json` | NEW — feature record (status: implemented; 6 requirements) |
| `.forge/store/events/features/FEAT-004-implemented.json` | NEW — `feature_implemented` event |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| Mode prompt rendered after resume detection, before pre-flight | 〇 Pass | New `### Mode Selection` section in `init.md` |
| Default = Full (Enter picks Full) | 〇 Pass | Input handling: `1` / `full` / empty → Full |
| Mode-specific pre-flight tables (Full + Fast variants) | 〇 Pass | `#### Full mode` and `#### Fast mode` blocks, both with mode stamp in heading |
| Fast table tags each row `[runs]`/`[skeleton]`/`[stubs]`/`[deferred]` | 〇 Pass | Fixed-width tags, 7 active + 5 deferred |
| `--fast` flag suppresses prompt, emits ack | 〇 Pass | `〇 Fast mode selected (via --fast flag)` |
| `--full` flag suppresses prompt, emits ack | 〇 Pass | `〇 Full mode selected (via --full flag)` |
| `--fast --full` halts with conflict error before any write | 〇 Pass | `× Conflicting flags: --fast and --full cannot be combined.` |
| Mode + phase composition (`--fast 5`) skips both prompt and table | 〇 Pass | Documented in pre-flight + flags sections |
| Mode persisted pre-Phase-1 to `.forge/init-progress.json` | 〇 Pass | `cat > .forge/init-progress.json <<JSON { lastPhase: 0, mode: "<MODE>" } JSON` |
| Phase 1 propagates mode from `init-progress.json` into `config.json` | 〇 Pass | `MODE=$(jq -r ...) && manage-config.cjs set mode "$MODE"` |
| `manage-config.cjs` unchanged (not called pre-Phase-1) | 〇 Pass | Verified `readConfig()` exits 1 if config missing — `set` cannot bootstrap |
| Resume sub-prompt offers stored mode as default | 〇 Pass | Fallback chain: `init-progress.json` mode → `config.json` mode → `"full"` |
| Switch warnings emitted exactly once on flip | 〇 Pass | Fast→Full and Full→Fast strings per plan |
| Resume mode switch updates both `init-progress.json` and (if exists) `config.json` | 〇 Pass | Explicit JSON-preserving Node one-liner; `manage-config.cjs set` only when config exists |
| Resume into skipped phase emits △ advance message | 〇 Pass | Fast-mode phase map: `1, 2, 3, 7, 9, 10, 11, 12` |
| Invalid prompt input re-emits banner (no silent fallback) | 〇 Pass | Both Mode Selection and Stored-mode sub-prompt have explicit re-prompt rule |
| Corrupt `init-progress.json` falls through to fresh-run mode prompt | 〇 Pass | Existing fallback retained, now leads to Mode Selection |
| `forge/init/smoke-test.md` unchanged | 〇 Pass | Already reads `mode` from `config.json` — no edit needed |
| All 286 tests pass | 〇 Pass | Full suite ran clean |

## Plugin Checklist

| Item | Status | Notes |
|---|---|---|
| Version bump | ✗ Not bumped | Plan §"Version bump" explicitly says **No bump.** Change is init-only (no effect on already-installed projects); `mode` field already in schema (v0.12.0); no migration needed. CHANGELOG `## [Unreleased]` entry added per plan instruction "or roll into the next patch bump when it happens" |
| Migration entry | ✗ Not added | No version bump → no migration entry |
| Schema change | ✗ None | `mode` field already in schema since 0.12.0 |
| Manifest rebuild | ✗ Not needed | No files added/removed in `forge/meta/personas/`, `forge/meta/workflows/`, `forge/meta/templates/`, or `forge/schemas/*.schema.json` |
| Security scan | △ Recommended pre-release | Per CLAUDE.md a scan is required when `forge/` is modified for a release. This change touches `forge/commands/init.md` and `forge/init/sdlc-init.md` (Markdown only — no executable changes). Defer scan to the next version bump that ships these changes; CHANGELOG `[Unreleased]` makes that batch obvious |

**To run the security scan when bumping next:**

```
/security-watchdog:scan-plugin forge:forge --source-path forge/
```

Save report to `docs/security/scan-v{NEXT_VERSION}.md` and update both
`docs/security/index.md` and the README Security table.

## Deviations from PLAN.md

| Item | Plan said | Did | Why |
|---|---|---|---|
| Resume mode-switch JSON write | "Rewrite `init-progress.json` `mode` field" | Used explicit `node -e "...JSON.parse/stringify..."` one-liner that preserves all other fields (`lastPhase`, `timestamp`, `phase7`, etc.) | LLM-driven instructions need a concrete write recipe to avoid clobbering sibling fields. The semantic intent is unchanged. |
| Optional `manage-config.test.cjs` cases | Plan listed three test cases (`set mode fast`, `set mode full`, `set mode invalid` — last just a note about existing behaviour) | Skipped | Plan flagged these as "**Optional unit test**". `manage-config.cjs set` is a generic key-value writer with no enum validation; the value is JSON-parsed if possible, else kept as a string. Adding tests asserting "set mode fast writes mode: fast" duplicates existing `setByPath` coverage. No behaviour change is being introduced to test. |

## Knowledge Writeback

Nothing surprising about plugin architecture or distribution behaviour was
discovered during implementation. No `engineering/architecture/` updates
required. No new `stack-checklist.md` items.

One implementation pattern worth noting (left in `init.md` rather than a
separate doc since it's localised): pre-Phase-1 state must use
`.forge/init-progress.json` as the channel because `manage-config.cjs
readConfig()` exits 1 when `.forge/config.json` is missing — `set` cannot
bootstrap the file. Phase 1 is the first writer of `config.json`. This is
already implicit in `init.md` and `sdlc-init.md` after this change.
