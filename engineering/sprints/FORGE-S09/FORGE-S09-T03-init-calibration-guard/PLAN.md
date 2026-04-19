# PLAN — FORGE-S09-T03: Init — calibration baseline write + incomplete init guard

🌱 *Forge Engineer*

**Task:** FORGE-S09-T03
**Sprint:** FORGE-S09
**Estimate:** M

---

## Objective

Add two new behaviours to `/forge:init` Phase 5 (Generate Skills) in `sdlc-init.md`:

1. **Incomplete init guard** — after skills are generated, verify all required config
   fields (per `sdlc-config.schema.json`) are present and non-empty in `.forge/config.json`.
   If any required field is missing or empty, halt and prompt the user with a clear list of
   missing values before proceeding.

2. **Calibration baseline write** — after the completeness guard passes, compute the
   calibration baseline and write `calibrationBaseline` into `.forge/config.json`. The
   baseline records the state of the project at calibration time so `/forge:calibrate` can
   detect drift later.

Both features are purely Markdown instruction changes in `forge/init/sdlc-init.md`.
No JS/CJS files are modified.

---

## Approach

### Feature 1 — Incomplete Init Guard

After the Phase 5 skill-generation block completes, insert a new "Completeness Guard" step
into `sdlc-init.md`. The step instructs the model to:

1. Read the current `.forge/config.json`.
2. Check every field listed in `sdlc-config.schema.json`'s top-level `required` array:
   `["version", "project", "stack", "commands", "paths"]`.
3. For each required field, also check the nested `required` sub-fields:
   - `project.required`: `["prefix", "name"]`
   - `commands.required`: `["test"]`
   - `paths.required`: `["engineering", "store", "workflows", "commands", "templates"]`
4. A field is considered "missing or empty" if it is absent, null, an empty string `""`, or
   an empty object `{}` (for object-type fields).
5. If all required fields are present and non-empty → proceed.
6. If any field is missing or empty → halt. Display a prompt:

```
△ Init Completeness Guard — missing required config fields:
  · project.prefix — short project prefix (e.g. ACME)
  · commands.test  — test command (e.g. npm test)

Provide values for each missing field, then re-run Phase 5 or
type each value now to continue:
```

The guard emits a clear human-readable message listing every missing field with a short
hint. It does not write a partial config.

### Feature 2 — Calibration Baseline Write

Immediately after the completeness guard passes, insert a "Write Calibration Baseline" step
into `sdlc-init.md`. The step instructs the model to:

1. Read `.forge/config.json` to get the current config.
2. Read `$FORGE_ROOT/.claude-plugin/plugin.json` to get `version`.
3. Read `engineering/MASTER_INDEX.md` and compute a SHA-256 hash of the semantic content:
   - Strip blank lines and lines that start with `<!--` (comment lines).
   - Hash the remaining lines joined with newline.
   - Command: `node -e "const crypto=require('crypto'),fs=require('fs'); const lines=fs.readFileSync('engineering/MASTER_INDEX.md','utf8').split('\n').filter(l=>l.trim()&&!l.trim().startsWith('<!--')); console.log(crypto.createHash('sha256').update(lines.join('\n')).digest('hex'))"`
4. List completed sprint IDs from `.forge/store/sprints/` — sprints whose `status` is `"done"`,
   `"retrospective-done"`, or similar completion statuses. For a fresh init this will be empty.
   - Command: `node -e "const fs=require('fs'),p='.forge/store/sprints'; try{const files=fs.readdirSync(p).filter(f=>f.endsWith('.json')); const done=files.map(f=>JSON.parse(fs.readFileSync(p+'/'+f,'utf8'))).filter(s=>['done','retrospective-done'].includes(s.status)).map(s=>s.sprintId); console.log(JSON.stringify(done));}catch(e){console.log('[]')}"`
5. Compute today's ISO date (`YYYY-MM-DD`):
   - Command: `date -u +"%Y-%m-%d"`
6. Build the `calibrationBaseline` object:
   ```json
   {
     "lastCalibrated": "<ISO date from step 5>",
     "version": "<plugin version from step 2>",
     "masterIndexHash": "<SHA-256 from step 3>",
     "sprintsCovered": <array from step 4>
   }
   ```
7. Write the updated config back to `.forge/config.json` — merge `calibrationBaseline` into
   the existing config object (do not overwrite other fields).
   - Use `node -e "..."` with `fs.readFileSync` / `JSON.parse` / `JSON.stringify` / `fs.writeFileSync`
   - Pattern: read → parse → assign `config.calibrationBaseline = {...}` → stringify → write.

### Placement in sdlc-init.md

Both steps go **at the end of Phase 5**, just before the `init-progress.json` write for
Phase 5. The ordering within Phase 5 tail is:

```
[existing skill generation output]
↓
Completeness Guard (Feature 1)
↓
Write Calibration Baseline (Feature 2)
↓
Write .forge/init-progress.json { lastPhase: 5 }
```

This ordering means:
- Skills are generated first (so `installedSkills` is available in config)
- Guard runs before baseline — no partial baseline written if config is incomplete
- Progress is only checkpointed after both features succeed

### No changes needed to `forge/commands/init.md`

The task prompt mentions `forge/commands/init.md` as an artifact, but after analysis, `init.md`
only needs to reflect the phase-flow summary. Since both new features are internal to Phase 5
and do not change the public phase count (still 11 phases) or the phase names shown in the
pre-flight plan, `init.md` requires no changes. All behaviour is in `sdlc-init.md`.

---

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/init/sdlc-init.md` | Add completeness guard + calibration baseline write at end of Phase 5 | Both features belong in the init orchestration, not the command wrapper |

---

## Plugin Impact Assessment

- **Version bump required?** Yes — changes to `forge/init/sdlc-init.md` alter user-visible
  `/forge:init` behaviour (new halting guard + new `.forge/config.json` write). Current
  version is `0.9.9`; new version will be `0.9.10`.
- **Migration entry required?** Yes — `regenerate: []` (no user-project artifacts regenerated;
  the change affects new init runs, not existing projects). `breaking: false`.
- **Security scan required?** Yes — any change to `forge/` requires `/security-watchdog:scan-plugin`.
- **Schema change?** No — `calibrationBaseline` was already added to `sdlc-config.schema.json`
  by T02. No schema files touched.

---

## Testing Strategy

- No JS/CJS files modified — `node --check` not applicable.
- `node forge/tools/validate-store.cjs --dry-run` — run as a smoke test to confirm no
  schema regressions from any incidental file changes.
- Manual review: read the updated Phase 5 block in `sdlc-init.md` and trace through:
  1. Happy path — all required fields present → guard passes → baseline written.
  2. Partial config path — `project.prefix` missing → guard halts with clear message.
  3. Fresh init path — no sprints completed → `sprintsCovered: []`.

---

## Acceptance Criteria

- [ ] Phase 5 of `sdlc-init.md` ends with a completeness guard that checks all required
      top-level and nested config fields and halts with a human-readable prompt if any are
      missing or empty
- [ ] Phase 5 of `sdlc-init.md` (after the guard) writes `calibrationBaseline` to
      `.forge/config.json` with fields: `lastCalibrated`, `version`, `masterIndexHash`,
      `sprintsCovered`
- [ ] `masterIndexHash` is computed by stripping blank lines and comment lines before hashing
- [ ] `sprintsCovered` lists sprint IDs with status `done` or `retrospective-done`
- [ ] Calibration baseline write uses `node -e` inline scripts (no new JS files, no npm deps)
- [ ] No existing Phase 5 output is removed or broken — skill generation still completes
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0

---

## Operational Impact

- **Distribution:** users with existing installed projects are unaffected (guard + baseline
  only run during `/forge:init`). New `init` runs will write `calibrationBaseline` to config.
  No `/forge:update` step required for existing projects.
- **Backwards compatibility:** fully preserved. `calibrationBaseline` is an optional field
  in `sdlc-config.schema.json` — projects without it remain valid. The guard only applies
  during new `init` runs.
