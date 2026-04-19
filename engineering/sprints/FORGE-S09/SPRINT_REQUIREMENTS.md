# Sprint Requirements — FORGE-S09

**Captured:** 2026-04-15
**Source:** sprint-intake interview

---

## Goals

1. Forge agents stay synchronized with a changing knowledge base — drift is detected, quantified, and resolved surgically.
2. Forge commands reject incomplete or broken configuration before it cascades into malformed sprint artifacts.
3. All pre-existing validate-store errors are closed, and all remaining open bugs are fixed.

## In Scope

### #34 Calibration baseline and drift detection [must-have]

`/forge:init` writes a `calibrationBaseline` object to `.forge/config.json` after generating personas and skills:
- `lastCalibrated` — ISO date
- `version` — plugin version at init time
- `masterIndexHash` — SHA-256 of `engineering/MASTER_INDEX.md`
- `sprintsCovered` — list of completed sprint IDs at init time

`/forge:health` adds a **KB freshness check** that:
- Compares current `MASTER_INDEX.md` hash against the baseline
- Distinguishes between **technical** drift (schemas, conventions, stack) and **business** drift (domain models, vocabulary, acceptance criteria)
- Reports which agent definitions are potentially stale and what category of change triggered the drift
- Points users to `/forge:calibrate` for resolution

**Acceptance criteria:**
- After `/forge:init`, `.forge/config.json` contains a `calibrationBaseline` with all four fields
- `/forge:health` reports "KB fresh" when hashes match, and "KB drifted — <category> changes detected" when they don't
- The freshness check distinguishes technical vs. business drift categories

### #33 `/forge:calibrate` command [must-have]

New command that:
1. Reads the calibration baseline and current KB state
2. Detects drift between KB and agent definitions (personas, skills), fine-grained by category:
   - Technical drift (conventions, patterns, schemas) → regenerate Engineer persona, Engineer skill, Supervisor skill
   - Business drift (domain models, vocabulary) → regenerate all personas for contextual awareness
   - Retrospective iron-law learnings → regenerate the persona of the role that had the gap
   - New acceptance criteria patterns → regenerate PM persona, QA skill
3. Proposes typed, surgical patches (as structured migration entries per the #32 format)
4. Gates on Architect approval before applying
5. Writes approved patches to `.forge/config.json` calibration history

**Acceptance criteria:**
- `/forge:calibrate` reports drift categories with specific affected agent definitions
- Proposed patches are structured migration entries (target, type, patch, optional fields)
- No changes are applied without explicit Architect approval
- After approval, regenerated agents reflect the current KB state

### #35 Incomplete init guard [must-have]

Two validation gates:

**In `/forge:init`** — after Phase 4 (Generate Personas) and Phase 5 (Generate Skills), add a completeness check that verifies all required `config.json` fields are present and non-empty before writing. If fields are missing, halt and prompt for the missing values rather than writing a partial config.

**In `/forge:health`** — add a **config-completeness check** that:
- Validates `.forge/config.json` against `sdlc-config.schema.json` required fields
- Reports which required fields are missing
- Blocks further health checks with "Run `/forge:init` to complete configuration"

**Acceptance criteria:**
- `/forge:init` with an eager model (Gemma, etc.) cannot produce a partial config — it is stopped and prompted for missing fields
- `/forge:health` reports missing config fields by name and exits early rather than cascading into broken artifact checks
- `node --check` passes on all modified files

### #36 SPRINT_PLAN.md output path [must-have]

`forge/meta/workflows/meta-sprint-plan.md` Step 5 currently says "Generate SPRINT_PLAN.md" with no path. Fix: specify the output path as `engineering/sprints/{sprintId}/SPRINT_PLAN.md` explicitly.

**Acceptance criteria:**
- Running `/sprint-plan` places SPRINT_PLAN.md inside the sprint directory, not at the project root
- The meta-workflow explicitly states the output path

### BUG-002 / BUG-003: Close validate-store pre-existing errors [must-have]

The 32 pre-existing validate-store errors in the dogfooding store are legacy data issues (missing fields, schema mismatches) that have been flagged every sprint since S04. Fix by:
- Running `validate-store.cjs --fix` with appropriate backfill rules
- Manually correcting any remaining data that automated fix cannot resolve
- Verifying `validate-store --dry-run` exits clean (0 errors)

**Acceptance criteria:**
- `node forge/tools/validate-store.cjs --dry-run` reports 0 errors against the dogfooding store
- No valid data is lost — only missing fields are backfilled

### Renumber sdlc-init.md phases [must-have]

Eliminate Phase 1.5 and Phase 3b by renumbering all phases in `forge/commands/init.md` (and `forge/init/` supporting docs) to sequential integers. This removes the class of checkpoint bug seen in S08 T01/T02.

**Acceptance criteria:**
- All phases in `sdlc-init.md` are integer-numbered (no 1.5, no 3b)
- Checkpoint/resume references are updated to match
- `/forge:init` still works end-to-end with the new numbering
- `node --check` passes on all modified files

### #31 add-task mid-sprint workflow [must-have]

New `/forge:add-task` command that:
1. Reads the current sprint from the store (or prompts for sprint ID)
2. Runs a **mini intake** at task scope — captures requirements, acceptance criteria, and estimate
3. Determines the correct sprint to slot the task into (current sprint, or a different sprint if more appropriate)
4. Assigns the next sequential task ID within that sprint
5. Creates the task directory + `TASK_PROMPT.md`
6. Writes the task JSON to the store
7. Updates the sprint JSON (task count, status)
8. Runs collate to refresh indexes

**Acceptance criteria:**
- `/forge:add-task` creates a properly slotted task with store entry, directory, and TASK_PROMPT.md
- The mini-intake captures enough detail for immediate implementation
- Tasks can be added to any sprint, not just the current one
- Collate runs successfully after task addition

## Out of Scope

- Multi-language LLM support (beyond Claude) — out of scope for this sprint
- CI/CD pipeline setup
- New marketplace listing or distribution changes
- Full test suite for all commands
- Changes to the store schema that break backwards compatibility

## Nice-to-Have *(attempt if must-haves complete)*

- None identified — this sprint is fully scoped

## Constraints

- **Plugin compatibility:** All `forge/` changes require a version bump and `migrations.json` entry. The final task decides the version number.
- **Distribution:** Changes to `forge/` are distributed to all users. Security scan required before push.
- **Dependencies:** Node.js built-ins only — no new npm packages.
- **Data:** BUG-002/BUG-003 fixes are dogfooding-store-only (no schema changes, no version bump).
- **Regeneration impact:** Items #33, #34, #35 may require users to regenerate workflows/tools after upgrading — flag in migration entry.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `/forge:calibrate` drift categories are too coarse or too granular, requiring iteration | Medium | Start with the four categories defined in #33; iterate based on dogfooding |
| KB hash comparison is brittle — minor formatting changes trigger false drift | Medium | Hash only semantic content lines (strip whitespace/comments), not raw bytes |
| Incomplete init guard rejects valid configs on edge cases | Low | Validate against the existing `sdlc-config.schema.json` required fields — no custom logic |
| add-task mini-intake is too shallow, producing task prompts that need immediate revision | Medium | Reuse the sprint-intake interview pattern at task scope — proven structure |
| BUG-002/BUG-003 automated fix introduces data loss | Low | Run with `--dry-run` first; only backfill missing fields, never overwrite existing ones |

## Carry-Over from FORGE-S08

| Item | Status | Notes |
|---|---|---|
| 32 validate-store pre-existing errors | In this sprint as BUG-002/BUG-003 | Flagged every sprint since S04; now prioritised |
| Fractional phase numbering in sdlc-init.md | In this sprint as "Renumber" | Caused checkpoint bugs in S08 T01/T02 |