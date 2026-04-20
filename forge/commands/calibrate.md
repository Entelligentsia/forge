---
name: calibrate
description: Detect drift between the knowledge base and agent definitions, propose surgical regeneration patches, and apply approved patches
---

# /forge:calibrate

Detect drift between the knowledge base and agent definitions, categorize drift
by type, propose typed surgical patches as structured regeneration targets,
gate on explicit Architect approval, and write approved patches to the
calibration history.

## Locate the Forge plugin

```
FORGE_ROOT: !`echo "${CLAUDE_PLUGIN_ROOT}"`
```

Read `.forge/config.json`. If it does not exist, stop and tell the user to run
`/forge:init` first.

Resolve tools from the plugin:
```
FORGE_ROOT: !`echo "${CLAUDE_PLUGIN_ROOT}"`
```

All tool invocations in this command use `node "$FORGE_ROOT/tools/<tool>.cjs"`.

## Arguments

$ARGUMENTS

| Argument | Purpose |
|----------|---------|
| `--path <dir>` | Run calibration against a different project directory instead of the current working directory. Accepts an absolute path or a path relative to the current directory. |

---

## Step 1 — Locate plugin root and config

Resolve `$FORGE_ROOT` from `$CLAUDE_PLUGIN_ROOT`.

Parse `$ARGUMENTS` for `--path <dir>`:
- If present, `PROJECT_ROOT = <dir>` (absolute or relative to the current working directory — resolve to absolute).
- If absent, `PROJECT_ROOT = .` (current working directory).

All file paths below are relative to `PROJECT_ROOT`. All shell tool invocations
must be run from `PROJECT_ROOT`:
```sh
cd "$PROJECT_ROOT" && node "$FORGE_ROOT/tools/..."
```

Read `$PROJECT_ROOT/.forge/config.json`. If absent, emit:
> △ No Forge instance found — run `/forge:init` to create one.

Exit early.

## Step 2 — Establish or verify calibration baseline

Read `calibrationBaseline` from `$PROJECT_ROOT/.forge/config.json`.

### If absent — auto-initialize

When `calibrationBaseline` is missing, compute and write the initial baseline
using the same algorithm as `/forge:init` Phase 5/6-b:

1. Read `$FORGE_ROOT/.claude-plugin/plugin.json` → `version`.
2. Resolve KB path:
   ```sh
   cd "$PROJECT_ROOT" && node -e "const cfg=JSON.parse(require('fs').readFileSync('.forge/config.json','utf8')); console.log((cfg.paths&&cfg.paths.engineering)||'engineering')"
   ```
3. Compute `MASTER_INDEX.md` hash (strip blank lines + `<!--` lines, SHA-256):
   ```sh
   cd "$PROJECT_ROOT" && node -e "const crypto=require('crypto'),fs=require('fs'); const cfg=JSON.parse(fs.readFileSync('.forge/config.json','utf8')); const engPath=(cfg.paths&&cfg.paths.engineering)||'engineering'; const lines=fs.readFileSync(engPath+'/MASTER_INDEX.md','utf8').split('\n').filter(l=>l.trim()&&!l.trim().startsWith('<!--')); console.log(crypto.createHash('sha256').update(lines.join('\n')).digest('hex'))"
   ```
4. List completed sprint IDs from `.forge/store/sprints/`:
   ```sh
   cd "$PROJECT_ROOT" && node -e "const fs=require('fs'),p='.forge/store/sprints'; try{const files=fs.readdirSync(p).filter(f=>f.endsWith('.json')); const done=files.map(f=>JSON.parse(fs.readFileSync(p+'/'+f,'utf8'))).filter(s=>['done','retrospective-done'].includes(s.status)).map(s=>s.sprintId); console.log(JSON.stringify(done));}catch(e){console.log('[]')}"
   ```
5. Get current date: `date -u +"%Y-%m-%d"`
6. Write `calibrationBaseline` to config:
   ```sh
   cd "$PROJECT_ROOT" && node -e "
   const fs = require('fs');
   const cfgPath = '.forge/config.json';
   const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
   cfg.calibrationBaseline = {
     lastCalibrated: '<date>',
     version: '<plugin version>',
     masterIndexHash: '<hash>',
     sprintsCovered: <sprint IDs array>
   };
   fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
   "
   ```

Emit:

> 〇 Baseline established — calibration baseline written to config (version: `{version}`, sprints covered: {N})

Exit. The next `/forge:calibrate` run will use this baseline for drift detection.

### If present — proceed to drift detection

Continue to Step 3.

## Step 3 — Detect drift

Compute current `MASTER_INDEX.md` hash using the same algorithm as
`/forge:init` Phase 5:

```sh
cd "$PROJECT_ROOT" && node -e "const crypto=require('crypto'),fs=require('fs'); const cfg=JSON.parse(fs.readFileSync('.forge/config.json','utf8')); const engPath=(cfg.paths&&cfg.paths.engineering)||'engineering'; const lines=fs.readFileSync(engPath+'/MASTER_INDEX.md','utf8').split('\n').filter(l=>l.trim()&&!l.trim().startsWith('<!--')); console.log(crypto.createHash('sha256').update(lines.join('\n')).digest('hex'))"
```

Compare against `calibrationBaseline.masterIndexHash` in config:

- **Match** — emit:

  > 〇 KB calibrated — no drift since last calibration (last: `{calibrationBaseline.lastCalibrated}`, version: `{calibrationBaseline.version}`)

  Exit. No further steps needed.

- **Mismatch** — proceed to Step 4.

## Step 4 — Categorize drift

Read `$PROJECT_ROOT/engineering/MASTER_INDEX.md` and identify which sections
changed by comparing content areas against the calibration baseline's
`sprintsCovered`. Read sprint task records from
`$PROJECT_ROOT/.forge/store/tasks/` and `$PROJECT_ROOT/.forge/store/sprints/`
to determine what changed since the last calibration.

Categorize each detected drift into one of four categories:

| Category | Detection Trigger | Regeneration Targets |
|---|---|---|
| **Technical** | Changes in stack, routing, database, deployment, processes, architecture, schemas, conventions, stack-checklist sections | `personas:engineer`, `skills:engineer-skills`, `skills:supervisor-skills` |
| **Business** | Changes in entity-model, domain, features, business-domain sections | `personas` (full rebuild — all personas need contextual awareness) |
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

## Step 5 — Propose patches

Present all detected drift categories and their proposed regeneration targets
to the user. Format:

```
## Calibration Drift Report

△ Drift detected — {N} categories since last calibration ({lastCalibrated})

### Category 1: Technical
  Evidence: {what changed}
  Proposed regeneration:
    · personas:engineer
    · skills:engineer-skills
    · skills:supervisor-skills

### Category 2: Business
  ...

Apply patches? [Y] Apply all  [r] Review individually  [n] Skip
```

If no drift categories are detected (hash mismatch but no identifiable
section-level changes), emit:

> △ Drift detected in MASTER_INDEX.md but no specific category changes identified. Run `/forge:regenerate` to do a full rebuild.

Exit.

## Step 6 — Architect approval gate

For each proposed patch, require explicit approval before any regeneration.
No changes are applied without Architect sign-off.

- **`[Y]`**: Approve all patches and proceed to Step 7.
- **`[r]`**: Walk through each patch, approve or skip individually.
- **`[n]`**: Exit without changes.

Build the list of approved patches (targets the user confirmed) and the list
of skipped patches (targets the user declined). Both lists are recorded in
Step 8.

## Step 7 — Execute approved patches

For each approved patch target, invoke `/forge:regenerate <category> <sub-target>`
by reading and following `$FORGE_ROOT/commands/regenerate.md`.

Execute in this order (matching the update command's regeneration order):
1. Personas (full rebuild or single file)
2. Skills (full rebuild or single file)

If any `/forge:regenerate` invocation fails:
- Record the patch as `applied: false` in the calibration history (Step 8).
- Emit: `△ Regeneration failed for <target> — skipping.`
- Continue with remaining approved patches.

After all patches are applied (or failed), run the generation manifest check:

```sh
cd "$PROJECT_ROOT" && node "$FORGE_ROOT/tools/check-structure.cjs" --path "$PROJECT_ROOT"
```

If the tool is absent (file not found), skip this check silently.

## Step 8 — Update calibration state

Recompute the calibration baseline (same algorithm as `/forge:init` Phase 5):

1. Compute new `MASTER_INDEX.md` hash:
   ```sh
   cd "$PROJECT_ROOT" && node -e "const crypto=require('crypto'),fs=require('fs'); const cfg=JSON.parse(fs.readFileSync('.forge/config.json','utf8')); const engPath=(cfg.paths&&cfg.paths.engineering)||'engineering'; const lines=fs.readFileSync(engPath+'/MASTER_INDEX.md','utf8').split('\n').filter(l=>l.trim()&&!l.trim().startsWith('<!--')); console.log(crypto.createHash('sha256').update(lines.join('\n')).digest('hex'))"
   ```
2. List completed sprint IDs from `.forge/store/sprints/`:
   ```sh
   cd "$PROJECT_ROOT" && node -e "const fs=require('fs'),p='.forge/store/sprints'; try{const files=fs.readdirSync(p).filter(f=>f.endsWith('.json')); const done=files.map(f=>JSON.parse(fs.readFileSync(p+'/'+f,'utf8'))).filter(s=>['done','retrospective-done'].includes(s.status)).map(s=>s.sprintId); console.log(JSON.stringify(done));}catch(e){console.log('[]')}"
   ```
3. Get current date: `date -u +"%Y-%m-%d"`
4. Get current plugin version: read `$FORGE_ROOT/.claude-plugin/plugin.json` → `version`

Update `$PROJECT_ROOT/.forge/config.json`:
1. Replace `calibrationBaseline` with the newly computed values:
   ```json
   {
     "lastCalibrated": "<ISO date>",
     "version": "<plugin version>",
     "masterIndexHash": "<new SHA-256 hash>",
     "sprintsCovered": ["<sprint IDs>"]
   }
   ```
2. Append the calibration run entry to the `calibrationHistory` array. If the
   array does not exist yet, create it:

   ```json
   {
     "calibrationHistory": [
       {
         "date": "<ISO date>",
         "version": "<plugin version>",
         "categories": ["technical", "business"],
         "patches": [
           {"target": "personas:engineer", "type": "regenerate", "applied": true},
           {"target": "skills:supervisor-skills", "type": "regenerate", "applied": true},
           {"target": "skills:engineer-skills", "type": "regenerate", "applied": false}
         ]
       }
     ]
   }
   ```

   Each patch entry records:
   - `target`: the regeneration target (e.g. `personas:engineer`, `skills:supervisor-skills`)
   - `type`: always `"regenerate"` (the only supported patch type)
   - `applied`: `true` if the patch was approved and regeneration succeeded, `false` if skipped or failed

Write the updated config using the established pattern:
```sh
cd "$PROJECT_ROOT" && node -e "
const fs = require('fs');
const cfgPath = '.forge/config.json';
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
cfg.calibrationBaseline = { /* new values */ };
if (!cfg.calibrationHistory) cfg.calibrationHistory = [];
cfg.calibrationHistory.push({ /* new entry */ });
fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
"
```

Alternatively, use `node "$FORGE_ROOT/tools/manage-config.cjs" set` if available.

## Step 9 — Summary

Emit the final summary:

```
## 〇 Calibration Complete

  Patches applied: {N} of {M}
  Regenerated: {list of successfully applied targets}
  Baseline updated: {new lastCalibrated date}

── Run /forge:health to verify knowledge base currency.
```

If any patches failed, add:

```
△ Failed patches: {list of failed targets}
── Re-run /forge:calibrate or manually /forge:regenerate the failed targets.
```

## On error

If any step above fails unexpectedly, describe what went wrong and ask:

> "This looks like a Forge bug. Would you like to file a report to help improve it? Run `/forge:report-bug` — I'll pre-fill the report from this conversation."