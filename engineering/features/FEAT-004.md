# Feature: Interactive Mode Prompt for `/forge:init`

> Feature ID: FEAT-004
> Status: 〇 implemented
> Created: 2026-04-17
> Target version: 0.12.1 (or next patch)

## Context

v0.12.0 shipped `/forge:init --fast` — a flag-only entry to fast mode (stubs
now, generate on first use, ~30s). The flag buries the feature: users who
don't read docs wait ~15 min for full-mode generation when they could have
had stubs in 30 seconds.

This change replaces flag-only discovery with an **interactive mode prompt**
that appears between the resume check and the pre-flight plan. `--fast` and
a new `--full` flag remain as non-interactive escape hatches for scripted
and CI use.

**Outcome:** the fast-mode option is surfaced by default; the 12-phase table
becomes mode-specific so users can see which phases run now vs. later;
resume flow lets users switch modes mid-init.

## Decisions (confirmed with user)

- **Default = Full.** Pressing Enter picks Full mode.
- **Mode-specific pre-flight tables** ship in this change.
- **Flags win** over the prompt: `--fast` or `--full` in `$ARGUMENTS`
  suppresses the prompt.
- **Re-prompt on resume.** Stored mode is offered as the default but the
  user can switch.

## Approach

### Where the prompt lives

In `forge/commands/init.md` (command level), placed **after resume detection
and before the pre-flight table**. Rationale: the mode-specific table lives
in `init.md`, so the prompt must precede the table. Keeping the prompt in
`init.md` also localises all user-facing UX in one file (resume prompt,
mode prompt, pre-flight table, start-phase prompt all colocated).

### Mode propagation to `sdlc-init.md`

**Chosen: extend `.forge/init-progress.json` with a `mode` field.**

`init.md` writes a stub progress record with mode as soon as the user picks:

```sh
mkdir -p .forge
# After mode choice, using the LLM variable MODE:
cat > .forge/init-progress.json <<JSON
{ "lastPhase": 0, "mode": "<MODE>" }
JSON
```

`sdlc-init.md` reads `mode` from that file at its Fast-mode detection step.
Phase 1 assembles `.forge/config.json` including the `mode` field (existing
behaviour — Phase 1 already calls `manage-config.cjs set mode …` at lines
69–75; that block just needs to read the value from `init-progress.json`
instead of from `$ARGUMENTS`).

**Why not `manage-config.cjs set mode` directly from `init.md`:** verified
that `readConfig()` in `forge/tools/manage-config.cjs:32–40` exits with
code 1 if `.forge/config.json` is missing. `set` cannot bootstrap the
config file; the config is first written by Phase 1 from discovery
results. Using `init-progress.json` as the pre-Phase-1 channel avoids
changing `manage-config.cjs` and keeps config writes in Phase 1 alone.

**Why not an LLM context variable only:** LLM-driven orchestration spans
multiple file reads and tool calls; a disk-backed channel survives any
context compaction and is already the pattern used for resume detection.

### Prompt text (exact draft)

```
━━━ Init Mode ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Forge can bootstrap your SDLC in two modes:

  [1] Full  — generate everything now (KB docs, personas, skills,
             templates, workflows, orchestration). ~10–15 min.
             〇 Best for: new projects, offline work, evaluating Forge.

  [2] Fast  — scaffold only (KB skeleton + 16 workflow stubs that
             self-materialise on first use). ~30s.
             〇 Best for: trying Forge quickly. Heavy generation is
                deferred to first workflow invocation (~1–2 min each).

Which mode? [1] Full / [2] Fast  (default: 1): ___
```

**Input handling:**
- `1`, `full`, empty (Enter) → Full.
- `2`, `fast` → Fast.
- anything else → re-emit banner and re-prompt (no silent fallback).

### Pre-flight tables (mode-specific)

**Full mode** — identical to today, with the mode stamp in the heading:

```
## Forge Init — <project-name>  [Full mode]

12 phases will run in this session (~10–15 min):
  1   Discover            — 5 parallel scans → 1 config
  2   Marketplace Skills  — match stack to plugins → 0-3 installs
  3   Knowledge Base      — architecture + domain docs → ~8 docs
  4   Personas            — project-specific agent identities → 3-5 personas
  5   Skills              — role-specific skill sets → 3-5 skill files
  6   Templates           — document formats → 5-8 templates
  7   Workflows           — 16 files generated in parallel → ~1-2 min
  8   Orchestration       — pipeline wiring → 2 workflows
  9   Commands            — slash command wrappers → 5-8 commands
  10  Tools               — config update + schema copy + hash recording
  11  Smoke Test          — validate and self-correct → manifest + cache
  12  Tomoshibi           — link KB to agent instruction files

Start from Phase 1? [Y] or specify phase: ___
```

**Fast mode** — same 12 rows, prefixed with a fixed-width status tag:

```
## Forge Init — <project-name>  [Fast mode ~30s]

12 phases — 7 run now, 5 deferred to first workflow use:
  1   Discover            [runs]     5 parallel scans → 1 config
  2   Marketplace Skills  [runs]     match stack to plugins
  3   Knowledge Base      [skeleton] MASTER_INDEX + empty dirs
  4   Personas            [deferred] materialised on first use
  5   Skills              [deferred] materialised on first use
  6   Templates           [deferred] materialised on first use
  7   Workflows           [stubs]    16 self-materialising stubs
  8   Orchestration       [deferred] materialised on first use
  9   Commands            [runs]     slash command wrappers
  10  Tools               [runs]     schema copy + hash recording
  11  Smoke Test          [runs]     fast-mode invariant checks
  12  Tomoshibi           [runs]     link KB to agent files

△ First use of any generated command triggers ~1-2 min of on-demand
  materialisation for that workflow and its dependencies.

Start from Phase 1? [Y] or specify phase: ___
```

Status tags: `[runs]`, `[stubs]`, `[skeleton]`, `[deferred]`.

### Flag-wins behaviour

When `$ARGUMENTS` contains `--fast` or `--full`:
1. Skip banner + prompt.
2. Emit a one-line ack: `〇 Fast mode selected (via --fast flag)` (or
   `〇 Full mode selected (via --full flag)`).
3. Proceed to the mode-specific pre-flight table.

**Conflict:** `--fast` AND `--full` together → halt with
`× Conflicting flags: --fast and --full cannot be combined.` Do not
write `init-progress.json`.

### Resume flow (extended)

Existing resume prompt (`init.md:33-37`) is unchanged:
```
〇 Previous init detected — last completed phase: {lastPhase}

Resume from Phase {nextPhase}? [Y] Start over [n]
```

**After the user's choice:**

- **Start over (`n`):** delete `.forge/init-progress.json`. Proceed through
  the mode prompt as a fresh run.

- **Resume (`Y`):** read `mode` from `.forge/init-progress.json` (or from
  `.forge/config.json` if the progress file omits it). Emit:

  ```
  〇 Previous init used: <stored-mode> mode

  Continue in <stored-mode> mode? [Y] Or switch: [1] Full / [2] Fast
  ```

  - Empty / `Y` → keep stored mode.
  - `1` / `2` → switch. Rewrite `init-progress.json` `mode` field.
    Also write the new mode to `.forge/config.json` via
    `manage-config.cjs set mode <value>` (config exists after Phase 1).
  - **Fast → Full switch warning:** emit
    `△ Switching to full will regenerate the skipped phases (4, 5, 6, 8) on this run.`
  - **Full → Fast switch warning:** emit
    `△ Existing full-mode artifacts remain on disk. Future phases will honour fast-mode behaviour (stubs, skipped phases).`

- **Corrupt `init-progress.json`:** delete it and fall through to
  fresh-run mode prompt (existing fallback at `init.md:59-61`).

### Mode-skip-phase interaction

Resuming into a phase that is skipped in the new mode (e.g. resume to
Phase 5 after switching to fast) must be handled explicitly. Emit:

```
△ Phase 5 is skipped in fast mode. Advancing to the next active phase: Phase 7.
```

Then jump to the next phase that runs under the chosen mode. The phase
map for fast mode is: 1, 2, 3 (skeleton), 7 (stubs), 9, 10, 11, 12.

## Files to modify

1. **`forge/commands/init.md`**
   - After resume detection block (ends ~line 62), add:
     - New `### Mode Selection` section with prompt text, input handling,
       and flag-wins logic.
     - `mkdir -p .forge && cat > .forge/init-progress.json <<JSON ...` to
       persist the mode pre-Phase-1.
   - Replace the single pre-flight plan block (lines 78–96) with
     mode-conditional rendering (Full table vs. Fast table from §"Pre-flight
     tables" above).
   - Extend resume flow (lines 55–57) to include the stored-mode
     re-confirmation sub-prompt.
   - Rewrite the `--fast` section (lines 127–140):
     - Document the new interactive default.
     - Add `--full` as a prompt-suppressing flag.
     - Document conflict error for `--fast --full`.
     - Note that mode-and-phase flags combine (e.g. `--fast 5`).

2. **`forge/init/sdlc-init.md`**
   - Replace the `## Fast-mode detection` section (lines 9–14) with:
     ```
     Read the mode from `.forge/init-progress.json`:
         jq -r '.mode // "full"' .forge/init-progress.json
     If the value is `"fast"`, set FAST_MODE=true for the rest of this
     document. If absent or the file is missing, default to full mode.
     ```
   - Update the Phase 1 block (lines 65–75) so the `mode` field write
     reads the chosen value from `init-progress.json` instead of
     branching on `$ARGUMENTS`.

3. **`forge/init/smoke-test.md`** — no change. It already reads `mode`
   from `.forge/config.json`.

No changes to `manage-config.cjs`, meta-workflows, or generated artifacts.

## Existing utilities reused

- `forge/tools/manage-config.cjs` — `set mode <value>` already supported
  (v0.12.0). Used for the Full→Fast / Fast→Full switch on resume (after
  Phase 1 has created the config file).
- `.forge/init-progress.json` — existing resume marker, extended with
  a `mode` field. No new file.
- Banner format `━━━ <title> ━━━…` — matches the KB Folder block
  (`sdlc-init.md:23-30`) for consistent house style.
- Japanese marks `〇 △ ×` — matches the repo-wide style.

## Edge cases

| Case | Handling |
|---|---|
| `--fast` AND `--full` | Halt with `× Conflicting flags`, exit before any write. |
| `--fast 5` | Honour both: fast mode ack, skip prompt, skip tables, jump to Phase 5. |
| Invalid prompt input (`3`, `abc`, whitespace) | Re-emit banner and re-prompt. No silent fallback. |
| Corrupt `.forge/init-progress.json` | Delete, fresh-run mode prompt. |
| Resume with `mode` missing from `init-progress.json` (older install) | Fall back to reading `.forge/config.json` `mode`; if also missing, default to Full. |
| Resume switch Full → Fast | Warn about retained artifacts; honour switch. |
| Resume switch Fast → Full | Warn about regenerating skipped phases; honour switch. |
| Resume-to-skipped-phase | Emit advance message, jump to next active phase in the new mode. |

## Version bump

**No bump.** UX change is init-only; zero effect on already-installed
projects. `mode` field already in schema (v0.12.0). No migration needed.
Add a one-line entry in `CHANGELOG.md` under a new `## [Unreleased]`
section (or roll into the next patch bump when it happens).

## Verification

**No automated tests for the LLM-driven markdown flow.** Manual smoke
test matrix from a clean project directory:

1. **Fresh init, Full default (Enter):**
   `/forge:init` → mode prompt → Enter → Full table → ack → Phase 1…
   Verify: `.forge/init-progress.json` has `"mode": "full"`; after
   Phase 1 completes, `.forge/config.json.mode === "full"`.

2. **Fresh init, Fast explicit (`2`):**
   `/forge:init` → mode prompt → `2` → Fast table.
   Verify: `.forge/init-progress.json` has `"mode": "fast"`; stub
   workflows appear at end of Phase 7; Phases 4/5/6/8 are skipped.

3. **Flag escape hatches:**
   - `/forge:init --fast` → ack line, Fast table, no prompt.
   - `/forge:init --full` → ack line, Full table, no prompt.
   - `/forge:init --fast --full` → halt with conflict error.
   - `/forge:init --fast 5` → ack, skip tables, jump to Phase 5 (fast
     path).

4. **Resume retain:**
   Interrupt a fast init at Phase 7. Re-run `/forge:init`. Verify
   resume prompt appears, then mode prompt shows `fast` as default,
   press Enter → resumes in fast mode.

5. **Resume switch Fast → Full:**
   Same scenario, but type `1` at the mode sub-prompt. Verify
   `init-progress.json` and `config.json` both flip to `"full"`; the
   Full→Fast warning text appears; Phase 7 onward behaves as full mode.

6. **Invalid prompt input:**
   `/forge:init` → mode prompt → `abc` → banner re-emitted.
   `/forge:init` → mode prompt → `3` → banner re-emitted.

7. **Resume-to-skipped-phase:**
   After a full init runs through Phase 4, edit `init-progress.json`
   to `"mode": "fast"`, then re-run `/forge:init`, choose resume. Ask
   to resume to Phase 5. Verify the `△ Phase 5 is skipped in fast mode`
   message and the jump to Phase 7.

Each run observed end-to-end from a clean checkout. Results recorded
in a PROGRESS note, not automated.

### Optional unit test

Add one test in `forge/tools/__tests__/manage-config.test.cjs`:
- `set mode fast` writes `"mode": "fast"` to config.
- `set mode full` writes `"mode": "full"` to config.
- `set mode invalid` — currently accepted (schema enum validates at read
  time, not set time); note this as existing behaviour, don't change it.

This is the only deterministic seam in the change.
