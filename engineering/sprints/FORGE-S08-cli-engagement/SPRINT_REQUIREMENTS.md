# FORGE-S08 Sprint Requirements

## Summary

**CLI Engagement — Interactive Progress and Reduced Friction**

Forge's long-running commands (`/forge:init`, `/forge:update`, `/forge:regenerate`)
currently provide little feedback during execution. Users staring at a blank stream
for 5-15 minutes have no visibility into which phase is running, how far along
generation is, or whether the process has stalled. When init fails mid-way, recovery
is fragile because the resume mechanism (`--from <phase>`) is not surfaced at the
point of failure.

This sprint introduces **structured progress output** across all three commands and
adds a **checkpoint/resume mechanism** to `/forge:init`, reducing the perceived
(and actual) friction of running meta-level Forge operations.

## Requirements

### R1 — Standard progress output format
Define and enforce a consistent banner format for phases/steps and per-file status
lines across `init.md`, `sdlc-init.md`, `regenerate.md`, and `update.md`.

### R2 — Init pre-flight plan
Before Phase 1 starts, `/forge:init` must display a summary of all 9 phases,
expected artifact counts, and offer the user a chance to specify a start phase.
This surfaces the resume mechanism before it is needed.

### R3 — Init checkpoint/resume
After each phase completes, `sdlc-init.md` must write `.forge/init-progress.json`
recording the last completed phase. On next invocation, `init.md` must detect this
file and offer to resume from the next phase or start over.

### R4 — Regenerate per-file status lines
`regenerate.md` must emit a `⋯ generating <file>...` line before writing each file
and a `〇 <file>` line after. This eliminates the perception of a hang during
12-file workflow rebuilds.

### R5 — Update step banners and sequencing
`update.md` must emit a step banner (`━━━ Step N/6 — <name> ━━━`) at the start
of each step. The Step 4 regeneration order must be made explicit: tools → workflows →
templates → personas → commands (commands must follow workflows; others are independent).

### R6 — Update Step 5 collect-all-then-confirm
Step 5 currently asks per-file questions sequentially (up to 8+ prompts on a large
project). Restructure to: collect all findings first across 5b-pre, 5b-portability,
5b-rename, 5d, and 5e; present them in a single numbered list; ask once. Individual
review mode remains available for users who prefer it.

## Task Breakdown

| Task | Title | Estimate | Depends On |
|------|-------|----------|------------|
| T01 | Init pre-flight plan + phase progress banners | M | — |
| T02 | Init checkpoint and resume mechanism | M | T01 |
| T03 | Regenerate per-file status lines | S | — |
| T04 | Update step banners and explicit sequencing | S | T03 |
| T05 | Update Step 5 collect-all-then-confirm audit | M | T04 |
| T06 | Release engineering — version bump, migration, security scan | S | T01–T05 |

## Success Criteria

- Running `/forge:init` from a blank project shows a phase plan before any work starts
- A failed init at phase 5 can be resumed by re-running `/forge:init` without flags
- Running `/forge:regenerate workflows` emits one status line per file generated
- Running `/forge:update` shows a numbered step header at each step boundary
- A project with 3 custom pipelines and 5 custom command files completes Step 5
  with a single consolidated prompt (not 8+ sequential ones)
- No regressions in existing update path behaviour (version checks, migration logic,
  breaking-change detection, model-alias suppression)

## Affected Files

```
forge/commands/init.md          — pre-flight plan, phase banner format, checkpoint read
forge/init/sdlc-init.md         — phase banners, checkpoint writes per phase
forge/commands/regenerate.md    — per-file ⋯/〇 status lines for all categories
forge/commands/update.md        — step banners, sequencing note, Step 5 restructure
forge/.claude-plugin/plugin.json — version bump (T06)
forge/migrations.json            — migration entry (T06)
```
