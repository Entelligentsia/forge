# ANALYSIS — FORGE-BUG-011

## Summary

Three UX defects confirmed in `forge/` source. All are material changes requiring a version bump.

---

## Sub-issue 1: gh#51 — Tomoshibi uppercase prefix in slash-command suggestions

**Severity:** MEDIUM

### Root Cause

`forge/agents/tomoshibi.md` uses `project.prefix` verbatim when referencing generated commands. The **Config change** section (line 67) renders the impact table with the raw stored value. When users have `project.prefix = "CAR"` (uppercase), Tomoshibi would suggest `/CAR:sprint-plan`. The actual folder and commands are always lowercased by `generate-commands.md` (line 19: `.toLowerCase()`). This mismatch produces `/CAR:sprint-plan`, which Claude Code cannot resolve because the actual command is at `.claude/commands/car/sprint-plan.md`.

`generate-commands.md` already enforces lowercase: `PREFIX: !node -e "console.log(require('.forge/config.json').project.prefix.toLowerCase())"`. But `tomoshibi.md` reads `project.prefix` raw via `manage-config.cjs get project.prefix` and uses the result verbatim in text output.

### Source Location

`forge/agents/tomoshibi.md` — Config change section. The impact table shows `{old}` and `{new}` from the prefix value without lowercasing.

### Fix

In the Setup block, normalise the prefix to lowercase immediately after reading it. Add an explicit note in the Config change section that the prefix is stored as-provided but the slash-command folder uses the lowercase form. When displaying command folder paths or slash-command references, always show the lowercased value.

---

## Sub-issue 2: gh#52 — progress IPC log lines lack persona/context

**Severity:** LOW

### Root Cause

`cmdProgress()` in `forge/tools/store-cli.cjs` (lines 717–750) writes:

```
2026-04-19T01:38:34.677Z|engineer|oracle|progress|Mapping each AC...
```

The format is purely functional: `timestamp|agentName|bannerKey|status|detail`. The `bannerKey` maps to a rich persona in `banners.cjs` (emoji, name, tagline) but is never used to enrich the output. The function also emits nothing to stdout — the log file is the only output.

`banners.cjs` exports `mark(name)` which returns just the emoji for a banner key. This is immediately usable.

### Chosen Approach

Two-track output:
1. Log file (unchanged): raw pipe-delimited line — machine-parseable, backward-compatible.
2. Stdout (new): single human-readable heartbeat line: `{emoji}  {agentName}  [{status}]  {detail}`.

This is backward-compatible because callers that ignore stdout see no change. The Monitor tool watching the log file sees the same structured data. The stdout line is the visible agent heartbeat in the Claude Code conversation.

Fallback: if `bannerKey` is not in the banners registry, use `bannerKey` as the emoji substitute.

### Source Location

`forge/tools/store-cli.cjs` — `cmdProgress()`, line 741 (after `fs.appendFileSync`).

### Required Test

A new test verifying that `progress` writes the expected log line AND emits the enriched summary to stdout. Test must be written and watched to fail before touching the script.

---

## Sub-issue 3: gh#54 — ensure-ready banner collapses to single line

**Severity:** LOW

### Root Cause

`_renderAnnouncement()` in `forge/tools/ensure-ready.cjs` (line 286) returns:

```js
return [topRule, '', lineBefore, lineAfter, '', bottomRule].join('\n');
```

That is a 6-line block. Claude Code's inline output display truncates multi-line tool output to the first visible line, so only the top `━━━` rule is shown. The progress bars and percentages are never visible.

### Chosen Approach

Replace the multi-line block with a single summary line:
- With additions: `🔥 Forge capability: {before}/{total} ({beforePct}%) → {after}/{total} ({afterPct}%), +{added} artifact(s)`
- Already materialised (closure): `🔥 Forge capability: {before}/{total} ({pct}%) — refreshing in place`
- Already materialised (--all, 100%): `🔥 Forge capability: {before}/{total} ({pct}%) — fully materialised (/forge:config mode full)`

### Source Location

`forge/tools/ensure-ready.cjs` — `_renderAnnouncement()`, lines 250–287.

### Existing Tests That Will Break

`forge/tools/__tests__/ensure-ready.test.cjs` lines 271–338 — 6 tests, all assert multi-line contract:
- `lines.length >= 5`
- `out.includes('━━━')`
- `out.includes('Capability Upgrade')`
- `out.includes('Currently')` and `out.includes('After')`
- zen-blue ANSI tint on first/last line

All 6 will fail after the fix. New tests defining the single-line contract must be written first (they fail), then the implementation, then the old tests updated to match the new contract.

---

## Architecture Impact

- All three files are in `forge/` → material changes → version bump `0.18.1 → 0.19.0`
- No schema changes required
- No `build-manifest.cjs` updates needed (no files added/removed from `forge/meta/` or `forge/schemas/`)
- `tomoshibi.md` fix lands in `forge/agents/` — regeneration target is `agents` (or `--all`)

---

## Test Gap

| File | Existing tests | Gap |
|---|---|---|
| `store-cli.cjs` | 2 validation tests for `progress` | No test for log line content or stdout output |
| `ensure-ready.cjs` | 6 tests for `_renderAnnouncement` (multi-line contract) | All 6 will break — need new single-line tests first |
