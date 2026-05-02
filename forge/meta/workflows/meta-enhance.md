---
requirements:
  reasoning: High
  context: High
  speed: Low
audience: orchestrator-only
deps:
  personas: [engineer]
  skills: [engineer, generic]
  templates: []
  sub_workflows: []
  kb_docs: []
  config_fields: [paths.engineering, paths.forgeRoot]
---

# Meta-Workflow: Enhancement Agent

## Purpose

Autonomously improve the installed `.forge/` structural elements by:
- **Phase 1** (auto-apply, post-init): Fill any `{{KEY}}` placeholders left unsubstituted during init.
- **Phase 2** (propose-diffs, post-sprint): Scan sprint artifacts and friction events; propose persona/skill enrichments for user review.
- **Phase 3** (drift detection, on-demand): Compare full codebase state against structural-element knowledge; propose targeted patches.

This workflow is `audience: orchestrator-only` — it reads store events and proposes writes to
`.forge/` structural elements. It must run with full tool access. It is never delegated to a
subagent.

## Note on `.forge/enhancement-proposals/` directory

Phases 2 and 3 write proposal artifacts to `.forge/enhancement-proposals/`. This directory is
distinct from `.forge/enhancements/` (FR-007, S14 scope). This workflow uses `mkdir -p` before
writing the first proposal artifact to avoid assuming the directory exists. No conflict with S14.

## Confidence gating (Phase 1)

A key substitution is **high-confidence** when there is exactly one unambiguous signal source
(e.g., `scripts.test` in `package.json` is the sole candidate for `{{TEST_COMMAND}}`). It is
**low-confidence** when multiple candidates exist or no signal is found. Only high-confidence
fills are applied automatically. Low-confidence keys are listed in the Phase 1 report and left
unsubstituted for the user to fill manually.

## Phase routing

Receive the phase flag from the command invocation:

| Flag | Mode |
|------|------|
| `--phase 1` or `--auto` | Auto-apply: placeholder fills only |
| `--phase 2` | Propose-diffs: sprint artifact + friction scan |
| `--phase 3` | Drift detection: full codebase vs structural-element comparison |

Default to `--phase 3` if no phase flag is given.

---

## Step 0 — Resolve roots

```
FORGE_ROOT: !`echo "${CLAUDE_PLUGIN_ROOT}"`
```

Read `.forge/config.json`. Resolve:
- `PROJECT_ROOT` = current working directory (absolute).
- `ENGINEERING_PATH` = `paths.engineering` from config (default `engineering`).

---

## Phase 1 — Auto-apply placeholder fills

### When to run

Invoked by T09 post-init hook (`--auto`) or manually via `/forge:enhance --phase 1`.

### Algorithm

1. **Scan structural elements** for `{{KEY}}` patterns:
   ```sh
   grep -r '{{' "$PROJECT_ROOT/.forge/personas/" "$PROJECT_ROOT/.forge/skills/" \
        "$PROJECT_ROOT/.forge/workflows/" "$PROJECT_ROOT/.forge/templates/" \
        --include="*.md" -l 2>/dev/null
   ```
   Collect each unique `{{KEY}}` token found.

2. **Skip runtime passthrough keys** — keys used at runtime (e.g., `{{TASK_ID}}`, `{{SPRINT_ID}}`,
   `{{ARGUMENTS}}`) are intentional and must not be substituted. Read
   `$FORGE_ROOT/tools/substitute-placeholders.cjs` to identify the RUNTIME_PASSTHROUGH_KEYS list.
   Exclude them from the fill candidates.

3. **Derive values from codebase signals** — for each remaining `{{KEY}}`, attempt to derive a
   value with high confidence:

   | Key | Signal source |
   |-----|--------------|
   | `{{STACK_SUMMARY}}` | `package.json` dependencies field (list top-level frameworks); or dominant file extension survey |
   | `{{BRANCHING_CONVENTION}}` | `git branch -a` output pattern or `.git/config` |
   | `{{TEST_COMMAND}}` | `package.json` → `scripts.test` |
   | `{{BUILD_COMMAND}}` | `package.json` → `scripts.build` |
   | `{{ENTITY_MODEL}}` | Scan source for ORM model files or type definitions |
   | `{{KEY_DIRECTORIES}}` | Top-level directory listing (exclude `.git`, `node_modules`, `.forge`) |
   | `{{IMPACT_CATEGORIES}}` | Derive from project type (web app → UI/API/DB/Infra; library → API/Docs/Tests) |

   Any key without a single unambiguous signal → mark as **low-confidence** (skip auto-fill).

4. **Apply high-confidence fills** — for each high-confidence key, perform in-place substitution
   in all structural element files that contain the key. Use `substitute-placeholders.cjs` if it
   supports a targeted single-key mode; otherwise apply the substitution directly with a read/write
   cycle per file.

   **Minimal modification principle**: Phase 1 only touches `{{KEY}}` token text. It never rewrites
   persona prose, algorithm steps, or role definitions.

5. **Update `project-context.json`** — write the newly discovered values into
   `$PROJECT_ROOT/.forge/project-context.json` so that future invocations of
   `substitute-placeholders.cjs` use the derived values.

6. **Snapshot gate** — if at least one fill was applied:
   ```sh
   node "$FORGE_ROOT/tools/manage-versions.cjs" add-snapshot \
     --source post-init \
     --enhanced-elements "<comma-separated list of relative .forge/ paths that were modified>"
   ```
   If no fills were applied, skip the snapshot call entirely.

7. **Emit enhancement event** to the store:
   ```sh
   node "$FORGE_ROOT/tools/store-cli.cjs" emit enhancement '{
     "eventId": "<ISO timestamp slug>_enhance_phase1",
     "taskId": "enhancement",
     "sprintId": "enhancement",
     "role": "enhancement-agent",
     "action": "enhancement-completed",
     "phase": "post-init",
     "iteration": 1,
     "notes": "{\"phase\":1,\"fillCount\":<N>,\"snapshotCreated\":<true|false>}"
   }'
   ```

8. **Report**:
   ```
   ## Phase 1 Enhancement Complete

   Fills applied: N key(s) — {{KEY1}}, {{KEY2}}, ...
   Uncertain keys (not filled): M — {{KEY3}}, ...  (manual intervention needed)
   Snapshot: [written as snap-{index}] | [skipped — no fills]
   ```

---

## Phase 2 — Propose enrichment diffs (post-sprint)

### When to run

Invoked by T09 post-sprint hook or manually via `/forge:enhance --phase 2`.

### Algorithm

1. **Collect friction events**:
   ```sh
   node -e "
   const fs = require('fs'), path = require('path');
   const eventsDir = '.forge/store/events';
   const allFiles = fs.readdirSync(eventsDir, { withFileTypes: true })
     .flatMap(d => d.isDirectory()
       ? fs.readdirSync(path.join(eventsDir, d.name)).map(f => path.join(eventsDir, d.name, f))
       : [path.join(eventsDir, d.name)]
     )
     .filter(f => f.endsWith('.json'));
   const friction = allFiles
     .map(f => { try { return JSON.parse(fs.readFileSync(f,'utf8')); } catch { return null; } })
     .filter(e => e && e.type === 'friction');
   console.log(JSON.stringify(friction));
   "
   ```

2. **Deduplicate** friction events by composite key `workflow + persona + issue`. Keep the most
   recent occurrence of each composite key.

3. **Read most recent completed sprint** from `.forge/store/sprints/` (status `done` or
   `retrospective-done`), sorted by completion date. Read its task records from
   `.forge/store/tasks/` filtered by the sprint ID.

4. **Synthesize enrichment proposals** — for each friction event:
   - Identify which persona or skill file it references.
   - Propose a targeted addition: e.g., "architect persona lacks routing pattern knowledge —
     suggest adding `{{KB_PATH}}/routing.md` reference to deps.kb_docs."
   - For large committed file sets (> 5 files in the sprint), also check whether
     `engineer-skills.md` or `architect-skills.md` should reference new patterns.

5. **Write proposal artifact**:
   ```sh
   mkdir -p "$PROJECT_ROOT/.forge/enhancement-proposals"
   ```
   Write to `$PROJECT_ROOT/.forge/enhancement-proposals/phase2-<timestamp>.md`. Format:
   one section per proposed change, with a fenced diff block showing before/after text.

6. **Present to user**:
   ```
   ## Phase 2 Enhancement Proposals

   N change(s) proposed — review: .forge/enhancement-proposals/phase2-<timestamp>.md

   [A] Apply all  [r] Review individually  [n] Skip
   ```

7. **On approval** — for each approved change:
   - Apply the edit in-place.
   - Call `manage-versions.cjs add-snapshot --source post-sprint:<SPRINT_ID> --enhanced-elements <list>`.

8. **Emit enhancement event** (same schema as Phase 1, with `"phase": "post-sprint"`).

9. **Report**: N changes applied, M skipped, snapshot written or skipped.

---

## Phase 3 — Drift detection (on-demand / delegated from calibrate)

### When to run

Invoked by `/forge:enhance --phase 3` (default when no phase given), or delegated by
`/forge:calibrate` after its Step 4 drift categorization.

### Algorithm

1. **Read codebase state** from `$PROJECT_ROOT/.forge/project-context.json`:
   key directories, entities, commands, stack summary, test command, build command.

2. **Read all structural elements** from `.forge/personas/`, `.forge/skills/`,
   `.forge/workflows/`, `.forge/templates/`.

3. **Compare**: for each structural element, verify:
   - It correctly references known entities and key directories.
   - It uses valid `{{KB_PATH}}` references (paths that exist in `engineering/`).
   - Its `deps.kb_docs` list includes docs referenced in its body.

4. **Read friction events** (same collection as Phase 2 Step 1).

5. **Read `calibrationBaseline`** from `$PROJECT_ROOT/.forge/config.json` to understand what
   was last confirmed correct.

6. **Write drift report**:
   ```sh
   mkdir -p "$PROJECT_ROOT/.forge/enhancement-proposals"
   ```
   Write to `$PROJECT_ROOT/.forge/enhancement-proposals/phase3-<timestamp>.md`.

7. **Present to user**:
   ```
   ## Phase 3 Drift Report

   N discrepancy(ies) found — review: .forge/enhancement-proposals/phase3-<timestamp>.md

   [A] Apply all  [r] Review individually  [n] Skip
   ```

8. **On approval** — apply changes and call `manage-versions.cjs add-snapshot --source on-demand`.

9. **Emit enhancement event** (`"phase": "on-demand"`).

10. **Report**: N changes applied, snapshot written or skipped.

---

## On error

If any step fails unexpectedly, describe what went wrong and offer:

> "This looks like a Forge bug. Would you like to file a report? Run `/forge:report-bug`."
