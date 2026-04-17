# Feature: Visual onboarding character for `/forge:init` (and other key commands)

> Feature ID: FEAT-006
> Status: 🔵 active
> Created: 2026-04-17
> Target version: 0.12.3

## Context

`/forge:init`, `/forge:update`, `/forge:health`, `/forge:regenerate` all
emit em-dash phase banners (`━━━ Phase N/12 — <name> ━━━━…`) but feel
utilitarian. The Forge brand already has visual identity infrastructure
(`forge/tools/banners.cjs` — 11 named ASCII-art banners with 24-bit
colour, three render modes). This feature wires that identity into the
key command surfaces so init feels like an event, and so `/health`,
`/update`, `/regenerate` carry the same visual language.

Bug experience this fixes: a long init that reads as "config script
output" with no anchoring identity. Each phase already knows its
persona/role; what's missing is the visual cue that says "this is Forge,
and right now I'm scanning / generating / verifying."

## Outcome

- `/forge:init` opens with a hero `forge` banner, version + chosen mode
  subtitle. Each of the 12 phases emits a per-phase banner badge + a
  unicode progress bar before its existing em-dash header. Init closes
  with a celebration banner + stats.
- `/forge:update` carries the same treatment across its 7 steps.
- `/forge:regenerate` shows a hero, per-category badges in the parallel
  fan-out, and a tinted footer.
- `/forge:health` opens with an `oracle` hero, emits a subtitle for each
  check section, closes with a status summary.
- `/forge:config` and `/forge:materialize` get a single opening badge
  and a clean closing line each — light touch (small commands).
- All output respects `NO_COLOR` and non-tty stdout — auto-strip ANSI
  in CI / piped contexts.

## Phase ↔ banner map (`/forge:init`)

| # | Phase | Banner | Why |
|---|-------|--------|-----|
| 1 | Discover | `north` 🧭 | direction · clarity — scanning for bearings |
| 2 | Marketplace Skills | `entelligentsia` 🔗 | linked · linking external skills |
| 3 | Knowledge Base | `oracle` 🌕 | sight · pattern — assembling project knowing |
| 4 | Personas | `bloom` 🌸 | becoming — agents take shape |
| 5 | Skills | `tide` 🌊 | depth — capability layering |
| 6 | Templates | `drift` 🍃 | form / letting go — shape without rigidity |
| 7 | Workflows | `ember` 🔥 | ignition — the actual forging starts |
| 8 | Orchestration | `rift` ⚡ | crossing — wiring the pieces together |
| 9 | Commands | `lumen` ✨ | clarity — surfaces user-facing entry points |
| 10 | Tools | `forge` 🔨 | making — settled into the runtime |
| 11 | Smoke Test | `north` 🧭 | verify direction (re-use, intentional) |
| 12 | Tomoshibi | (existing 灯 motif) | the lantern lit |

## Step ↔ banner map (`/forge:update`)

| Step | Banner |
|------|--------|
| 1 Check for updates | `north` 🧭 |
| 2A Plugin update available | `rift` ⚡ |
| 2B Project migration pending | `drift` 🍃 |
| 3 Verify installation | `lumen` ✨ |
| 4 Apply migrations | `forge` 🔨 |
| 5 Pipeline audit | `oracle` 🌕 |
| 6 Record state | `drift` 🍃 |
| 7 Tomoshibi | (灯) |

## Mode-tinted accents (init only)

Mode picked at the Mode Selection prompt sets a single accent colour
used in: progress bars, the hero subtitle, and final stats:

- Fast → lantern yellow `(255, 208, 122)`
- Full → ember orange `(255, 138, 60)`

This is one extra colour, not a full theme — keeps the visual budget
small and lets the per-phase banners carry their own palette.

## Requirements

### Part A — `banners.cjs` extensions

Backwards-compatible additions only. Existing API (`render`, `badge`,
`mark`, `list`, `gallery`, `rule`, `BANNERS`) is unchanged.

1. **Plain mode detection.**
   - New env-var read: `FORGE_BANNERS_PLAIN=1` forces plain output.
   - Standard env-var read: `NO_COLOR` (any non-empty value) forces plain.
   - Auto-detect: if `process.stdout.isTTY === false`, treat as plain.
   - All render functions strip ANSI escapes when plain mode is active.
   - CLI flag: `--plain` forces plain output regardless of detection.

2. **`progressBar(n, total, opts?)`** — returns a string like
   `▰▰▰▰▰▱▱▱▱▱  Phase 5/12 · Templates`.
   - Width: 12 cells by default (configurable via `opts.width`).
   - Filled glyph: `▰` (heavy). Empty glyph: `▱` (light).
   - Optional gradient: `opts.color = [r,g,b]` tints the filled segment.
   - Optional label: `opts.label` appended after the bar.

3. **`subtitle(text, opts?)`** — dim italicised single-line text used for
   under-banner subtitles.

4. **`phaseHeader(n, total, name, bannerKey, opts?)`** — convenience
   wrapper that returns three lines: badge → em-dash banner → progress
   bar. Used to compress per-phase markup.

5. **CLI subcommands**:
   - `node banners.cjs --plain ...` — force plain on any other mode
   - `node banners.cjs --progress N TOTAL [LABEL]` — emit progress bar
   - `node banners.cjs --phase N TOTAL NAME BANNER [MODE]` — emit the
     full three-line phase header

### Part B — Wire into commands

For each command, edit the existing markdown rulebook. No JS changes
beyond Part A. Shape:

```
Before each phase/step:
  node "$FORGE_ROOT/tools/banners.cjs" --phase {N} {TOTAL} "{Phase Name}" {bannerKey} [{mode}]

Before the command runs (hero):
  node "$FORGE_ROOT/tools/banners.cjs" {bannerKey}        # full ASCII art
  node "$FORGE_ROOT/tools/banners.cjs" --subtitle "<text>"
```

**Targets** (in implementation order):

1. `forge/commands/init.md` — hero open before Mode Selection.
2. `forge/init/sdlc-init.md` — per-phase headers (12 phases) + closing
   celebration in Report.
3. `forge/commands/update.md` — hero ember + per-step headers (7 steps).
4. `forge/commands/regenerate.md` — hero forge + per-category badges in
   fan-out + tinted footer.
5. `forge/commands/health.md` — hero oracle + per-check subtitles +
   status summary.
6. `forge/commands/config.md` and `forge/commands/materialize.md` —
   single opening badge each, light touch.

### Part C — Tests

Extend `forge/tools/__tests__/banners.test.cjs`:
- `progressBar` returns string, correct fill ratio at 0, partial, and full.
- Plain mode (forced via env or CLI flag) produces no ANSI escapes.
- `phaseHeader` returns multi-line output containing both banner badge
  and em-dash separator.
- Existing 286 tests must continue to pass.

## Out of scope

- Animation / spinners. Markdown commands run as discrete tool
  invocations; we don't have a streaming surface beyond the existing
  Monitor for live progress lines.
- Replacing the existing em-dash banners. They stay — banners are
  added *in front of* them, not as replacements.
- Themed dark/light variants. One palette.
- Per-skill / per-agent banner expansion outside the named 11.

## Version bump

**Bump: 0.12.2 → 0.12.3** (patch). Markdown + small additive code
changes. No schema changes; no breaking changes; no regenerate targets
required.

### Migration entry

```json
"0.12.2": {
  "version": "0.12.3",
  "date": "2026-04-17",
  "notes": "Visual onboarding character: hero banners and per-phase/step badges across /forge:init, /forge:update, /forge:regenerate, /forge:health (and light touch on /forge:config and /forge:materialize). banners.cjs gains progressBar, subtitle, phaseHeader, plain-mode (NO_COLOR / non-tty / --plain).",
  "regenerate": [],
  "breaking": false,
  "manual": []
}
```

## Verification

Manual smoke:

1. `node forge/tools/banners.cjs --gallery` — all 11 banners render in
   colour on a TTY.
2. `NO_COLOR=1 node forge/tools/banners.cjs forge` — no ANSI escapes
   in output.
3. `node forge/tools/banners.cjs --progress 5 12 "Templates"` — emits
   progress bar with label.
4. `node forge/tools/banners.cjs --phase 7 12 "Workflows" ember fast`
   — emits 3-line phase header with mode tint on the bar.
5. `node forge/tools/banners.cjs forge | cat` — pipe to `cat` triggers
   non-tty plain mode (no ANSI escapes).
6. Run `/forge:init --fast` end-to-end, eyeball the visual upgrade.
7. Run `/forge:update`, `/forge:health`, `/forge:regenerate` similarly.

Tests: `node --test forge/tools/__tests__/*.test.cjs` — all pass.
