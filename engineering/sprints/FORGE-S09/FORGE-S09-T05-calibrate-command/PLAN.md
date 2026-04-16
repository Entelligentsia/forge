# PLAN — FORGE-S09-T05: Calibrate command — drift detection, categories, surgical patches

🌱 *Forge Engineer*

**Task:** FORGE-S09-T05
**Sprint:** FORGE-S09
**Estimate:** L

---

## Objective

Create the `/forge:calibrate` command that reads the calibration baseline from `.forge/config.json`, detects drift between the KB and agent definitions, categorizes drift by type (technical, business, retrospective, acceptance-criteria), proposes typed surgical patches as structured regeneration targets, gates on explicit Architect approval, and writes approved patches to a new `calibrationHistory` field in `.forge/config.json`.

## Approach

The calibrate command is a pure Markdown command file (`forge/commands/calibrate.md`) -- no new JS/CJS tools are needed. It orchestrates existing tools and commands:

1. **Drift detection** reuses the same MASTER_INDEX.md hash algorithm already implemented in `/forge:health` (T04) and `/forge:init` (T03). Compute the current hash, compare against `calibrationBaseline.masterIndexHash` in `.forge/config.json`.

2. **Drift categorization** extends the technical/business split from T04's health command into four categories, each mapping to specific regeneration targets:
   - Technical drift (conventions, patterns, schemas) → regenerate Engineer persona, Engineer skill, Supervisor skill
   - Business drift (domain models, vocabulary) → regenerate all personas for contextual awareness
   - Retrospective iron-law learnings → regenerate the persona of the role that had the gap
   - New acceptance criteria patterns → regenerate PM persona, QA skill

3. **Patch proposal** formats each regeneration target as a structured migration-like entry with `target`, `type`, `patch`, and optional fields. Patches are displayed for review but NOT applied.

4. **Architect approval gate** -- the command asks the user (acting as Architect) to explicitly approve each proposed patch. No regeneration happens without approval.

5. **Execution** -- for each approved patch, invoke `/forge:regenerate <category> <sub-target>` (reading and following `forge/commands/regenerate.md`). Record each approved patch in the new `calibrationHistory` array in `.forge/config.json`.

6. **Baseline update** -- after all approved patches are applied, recompute the calibration baseline (same algorithm as init Phase 5) and update `calibrationBaseline` in `.forge/config.json`.

The command follows the established pattern: YAML frontmatter (`name`, `description`), structured steps with `$FORGE_ROOT` resolution, argument parsing, and an on-error footer.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/commands/calibrate.md` | New file -- full command definition | Core deliverable: the `/forge:calibrate` command |
| `forge/sdlc-config.schema.json` | Add `calibrationHistory` property to the schema | New field to record approved calibration patches over time |
| `forge/.claude-plugin/plugin.json` | Version bump: 0.9.11 → 0.9.12 | Material change: new command shipped to all users |
| `forge/migrations.json` | Add migration entry 0.9.11→0.9.12 with `regenerate: ["commands"]` | Users need the new command wrapper regenerated |

## Plugin Impact Assessment

- **Version bump required?** Yes -- new command file in `forge/commands/` alters user-visible behaviour.
- **Migration entry required?** Yes -- `regenerate: ["commands"]` so users get the `/forge:calibrate` command wrapper via `/forge:update`.
- **Security scan required?** Yes -- new `forge/` file requires scan per CLAUDE.md.
- **Schema change?** Yes -- `forge/sdlc-config.schema.json` gains a new `calibrationHistory` property. Not a store schema, so `validate-store --dry-run` is unaffected.

## Detailed Design

### Command Structure (`forge/commands/calibrate.md`)

```yaml
---
name: calibrate
description: Detect drift between the knowledge base and agent definitions, propose surgical regeneration patches, and apply approved patches
---
```

### Step-by-step execution

**Step 1 -- Locate plugin root and config**

Resolve `$FORGE_ROOT` from `$CLAUDE_PLUGIN_ROOT`. Parse `$ARGUMENTS` for `--path <dir>` (same pattern as health.md). Read `.forge/config.json`. If absent, tell user to run `/forge:init` first.

**Step 2 -- Validate prerequisites**

Read `calibrationBaseline` from config. If absent, emit:
> △ No calibration baseline found — run `/forge:init` to establish one.

Exit early.

**Step 3 -- Detect drift**

Compute current MASTER_INDEX.md hash using the same algorithm as init Phase 5:
```sh
cd "$PROJECT_ROOT" && node -e "const crypto=require('crypto'),fs=require('fs'); const cfg=JSON.parse(fs.readFileSync('.forge/config.json','utf8')); const engPath=(cfg.paths&&cfg.paths.engineering)||'engineering'; const lines=fs.readFileSync(engPath+'/MASTER_INDEX.md','utf8').split('\n').filter(l=>l.trim()&&!l.trim().startsWith('<!--')); console.log(crypto.createHash('sha256').update(lines.join('\n')).digest('hex'))"
```

Compare against `calibrationBaseline.masterIndexHash`:
- Match → emit: `〇 KB calibrated — no drift since last calibration (last: {lastCalibrated}, version: {version})` and exit.
- Mismatch → proceed to Step 4.

**Step 4 -- Categorize drift**

Read `MASTER_INDEX.md` and identify which sections changed by comparing content areas against the calibration baseline's `sprintsCovered` and reading sprint outcomes from the store. Categorize:

| Category | Detection Trigger | Regeneration Targets |
|---|---|---|
| **Technical** | Changes in stack, routing, database, deployment, processes, architecture, schemas, conventions, stack-checklist sections | `personas:engineer`, `skills:engineer-skills`, `skills:supervisor-skills` |
| **Business** | Changes in entity-model, domain, features, business-domain sections | `personas` (full rebuild -- all personas need contextual awareness) |
| **Retrospective** | Iron-law learnings from completed sprints since last calibration | `personas:<role>` where role had the gap (user specifies at prompt) |
| **Acceptance criteria** | New acceptance criteria patterns from sprint outcomes | `personas:product-manager`, `skills:qa-engineer` |

For each detected category, build a structured patch entry:

```json
{
  "category": "technical",
  "detectedAt": "<ISO date>",
  "targets": ["personas:engineer", "skills:engineer-skills", "skills:supervisor-skills"],
  "evidence": "<brief description of what changed>"
}
```

**Step 5 -- Propose patches**

Present all detected drift categories and their proposed regeneration targets to the user. Format:

```
## Calibration Drift Report

△ Drift detected — {N} categories since last calibration ({lastCalibrated})

### Category 1: Technical
  Evidence: {what changed}
  Proposed regeneration:
    • personas:engineer
    • skills:engineer-skills
    • skills:supervisor-skills

### Category 2: Business
  ...

Apply patches? [Y] Apply all  [r] Review individually  [n] Skip
```

**Step 6 -- Architect approval gate**

For each proposed patch, require explicit approval before any regeneration. This is the iron law: no changes without Architect sign-off.

If `[Y]`: approve all patches and proceed to Step 7.
If `[r]`: walk through each patch, approve or skip individually.
If `[n]`: exit without changes.

**Step 7 -- Execute approved patches**

For each approved patch target, invoke `/forge:regenerate <category> <sub-target>` by reading and following `$FORGE_ROOT/commands/regenerate.md`. This leverages the existing regeneration infrastructure -- no duplication.

Execute in this order (matching the update command's regeneration order):
1. Personas (full rebuild or single file)
2. Skills (full rebuild or single file)

After all patches are applied, run the generation manifest check:
```sh
cd "$PROJECT_ROOT" && node "$FORGE_ROOT/tools/check-structure.cjs" --path "$PROJECT_ROOT"
```

**Step 8 -- Update calibration state**

Recompute the calibration baseline (same algorithm as init Phase 5):
1. Compute new MASTER_INDEX.md hash
2. List completed sprint IDs from `.forge/store/sprints/`
3. Get current date and plugin version
4. Update `calibrationBaseline` in `.forge/config.json`
5. Append approved patches to the new `calibrationHistory` array in `.forge/config.json`

The `calibrationHistory` array structure:
```json
{
  "calibrationHistory": [
    {
      "date": "<ISO date>",
      "version": "<plugin version>",
      "categories": ["technical", "business"],
      "patches": [
        {"target": "personas:engineer", "type": "regenerate", "applied": true},
        {"target": "skills:supervisor-skills", "type": "regenerate", "applied": true}
      ]
    }
  ]
}
```

Write the updated config using `node "$FORGE_ROOT/tools/manage-config.cjs" set` or the same `fs.readFileSync/parse/stringify/writeFileSync` pattern used by init.

**Step 9 -- Summary**

Emit the final summary:
```
## 〇 Calibration Complete

  Patches applied: {N}
  Regenerated: {list of targets}
  Baseline updated: {new lastCalibrated date}

── Run /forge:health to verify knowledge base currency.
```

### `calibrationHistory` schema addition

Add to `forge/sdlc-config.schema.json`:

```json
"calibrationHistory": {
  "type": "array",
  "description": "Audit trail of calibration runs. Each entry records the drift categories detected and the patches applied.",
  "items": {
    "type": "object",
    "required": ["date", "version", "categories", "patches"],
    "properties": {
      "date": {
        "type": "string",
        "format": "date",
        "description": "ISO date (YYYY-MM-DD) of this calibration run"
      },
      "version": {
        "type": "string",
        "description": "Plugin version at calibration time"
      },
      "categories": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Drift categories detected: technical, business, retrospective, acceptance-criteria"
      },
      "patches": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["target", "type", "applied"],
          "properties": {
            "target": {
              "type": "string",
              "description": "Regeneration target (e.g. personas:engineer, skills:supervisor-skills)"
            },
            "type": {
              "type": "string",
              "enum": ["regenerate"],
              "description": "Patch type (currently only 'regenerate' is supported)"
            },
            "applied": {
              "type": "boolean",
              "description": "Whether this patch was applied (true if approved, false if skipped)"
            }
          },
          "additionalProperties": false
        }
      }
    },
    "additionalProperties": false
  }
}
```

## Testing Strategy

- Syntax check: No JS/CJS files are modified or created by this task (the command is a Markdown file). `node --check` is not applicable.
- Store validation: `node forge/tools/validate-store.cjs --dry-run` -- should exit 0 (no store schema changes).
- Schema validation: Verify `forge/sdlc-config.schema.json` is valid JSON after adding `calibrationHistory`.
- Manual smoke test: In a project with an existing calibration baseline, run `/forge:calibrate` and verify:
  1. Drift is detected when MASTER_INDEX.md has changed since baseline
  2. Drift categories are correctly identified
  3. Patches are proposed with the correct regeneration targets
  4. No regeneration happens without approval
  5. Approved patches invoke `/forge:regenerate` correctly
  6. `calibrationBaseline` and `calibrationHistory` are updated in config after completion

## Acceptance Criteria

- [ ] `/forge:calibrate` reports drift categories with specific affected agent definitions per the four-category mapping
- [ ] Proposed patches are structured migration entries with target, type, patch, and optional fields
- [ ] No changes are applied without explicit Architect approval
- [ ] After approval, `/forge:regenerate` is invoked for each approved target (leveraging existing regeneration, no duplication)
- [ ] Approved patches are written to `calibrationHistory` in `.forge/config.json`
- [ ] `calibrationBaseline` is recomputed and updated after calibration completes
- [ ] `forge/sdlc-config.schema.json` includes the `calibrationHistory` property definition
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0
- [ ] `forge/commands/calibrate.md` follows the command file pattern (frontmatter, steps, arguments, on-error)

## Operational Impact

- **Distribution:** Users must run `/forge:update` after installing to get the new `/forge:calibrate` command wrapper. The migration entry specifies `regenerate: ["commands"]`.
- **Backwards compatibility:** Fully backwards compatible. The `calibrationHistory` field is optional (not in `required`). Existing projects without it will work fine -- calibrate simply starts with an empty history on first run.