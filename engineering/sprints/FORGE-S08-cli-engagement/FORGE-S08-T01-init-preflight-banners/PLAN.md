# PLAN — FORGE-S08-T01: Init pre-flight plan + phase progress banners

**Task:** FORGE-S08-T01
**Sprint:** FORGE-S08
**Estimate:** M

---

## Objective

Make `/forge:init` tell users what is about to happen before it happens, and emit a
clear phase banner at the start of every phase so users always know where they are
in a 9-phase operation.

## Approach

Two files change:

1. **`forge/commands/init.md`** — add a "Progress Output Format" section that defines
   the standard banner syntax, and add a "Pre-flight Plan" block that the LLM must
   emit before Phase 1 starts.

2. **`forge/init/sdlc-init.md`** — add a phase banner line at the start of each of the
   9 phases (plus Phase 1.5) and announce parallel execution in Phase 1.

The banner format is defined once in `init.md` and referenced by `sdlc-init.md`
so the convention is unambiguous.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/commands/init.md` | Add "Progress Output Format" section + "Pre-flight Plan" block before Phase 1 dispatch | Defines the standard; init.md is what Claude reads first |
| `forge/init/sdlc-init.md` | Add banner line at the start of each phase; add parallel-scan announce in Phase 1 | Implements the format on every phase |

## Plugin Impact Assessment

- **Version bump required?** Yes — deferred to T06.
- **Migration entry required?** Yes — deferred to T06. `regenerate: []` (command-only change; no generated artifacts are affected).
- **Security scan required?** Yes — deferred to T06.
- **Schema change?** No.

## Detailed Changes

### 1. `forge/commands/init.md` — Progress Output Format section

Insert after the `## Execute` heading, before the phase list:

```markdown
## Progress Output Format

At the start of every phase, emit a banner using this exact format:

```
━━━ Phase N/9 — <Phase Name> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Use full-width em-dashes to reach 65 characters total. Phase 1.5 is numbered `1.5`.

## Pre-flight Plan

Before executing Phase 1, emit the following summary block and wait for the user
to confirm or specify a start phase:

```
## Forge Init — <project-name>

9 phases will run in this session:
  1    Discover              — 5 parallel scans → 1 config
  1.5  Marketplace Skills    — match stack to plugins → 0-3 installs
  2    Knowledge Base        — architecture + domain docs → ~8 docs
  3    Personas              — project-specific agent identities → 3-5 personas
  3b   Skills                — role-specific skill sets → 3-5 skill files
  4    Templates             — document formats → 5-8 templates
  5    Workflows             — atomic workflow files → ~14 files
  6    Orchestration         — pipeline wiring → 2 workflows
  7    Commands              — slash command wrappers → 5-8 commands
  8    Tools                 — JSON schema copy + store validation → 5-8 schemas + tools
  9    Smoke Test            — validate and self-correct → manifest + cache

Start from Phase 1? [Y] or specify phase: ___
```

If the user specifies a valid phase number (1-9, 1.5, or 3b), skip all earlier
phases and begin there. If the input is not a valid phase identifier, re-prompt
with the list and ask again. Valid inputs are: `1`, `1.5`, `2`, `3`, `3b`, `4`,
`5`, `6`, `7`, `8`, `9`. Any other input (including `0`, `10`, or non-numeric
text) triggers a re-prompt.
```

### 2. `forge/init/sdlc-init.md` — Phase banners

At the start of each phase section, add an instruction to emit the banner. Example
for Phase 1:

```markdown
## Phase 1 — Discover

Emit: `━━━ Phase 1/9 — Discover ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

Also emit: `Running 5 discovery scans in parallel...`

Run the 5 discovery prompts in parallel...
```

Repeat for phases 1.5, 2, 3, 3b, 4, 5, 6, 7, 8, 9 with their respective numbers and names.

## Testing Strategy

- Manual: run `/forge:init` on a test project, verify the pre-flight plan appears
  before any files are written
- Verify the pre-flight plan lists expected artifact counts for every phase
- Verify the banner format matches the spec exactly (65 chars, correct phase number)
- Verify Phase 1 announces parallel execution before the 5 agents launch
- Verify that specifying a valid start phase skips earlier phases
- Verify that specifying an invalid phase (e.g., 0, 10, "abc") re-prompts

## Acceptance Criteria

- [ ] `forge/commands/init.md` contains a "Progress Output Format" section defining the `━━━ Phase N/9` banner format
- [ ] `forge/commands/init.md` contains a "Pre-flight Plan" block that is emitted before Phase 1 starts, with expected artifact counts per phase
- [ ] `forge/commands/init.md` specifies error handling for invalid phase input (re-prompt)
- [ ] `forge/init/sdlc-init.md` contains a banner emit instruction at the start of each of the 9 phases, Phase 1.5, and Phase 3b
- [ ] Phase 1 emits "Running 5 discovery scans in parallel..." before launching agents
- [ ] The pre-flight plan asks the user to confirm or specify a start phase
- [ ] Specifying a start phase skips earlier phases
