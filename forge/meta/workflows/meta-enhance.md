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

## Iron Laws

- Orchestrator-only: this workflow runs with full tool access in the orchestrator session. NEVER delegate it to a subagent.
- Read `.forge/personas/engineer.md` first; print the persona identity line to stdout before any other tool use.
- All store I/O via `forge_store` (or `node "$FORGE_ROOT/tools/store-cli.cjs"`). Never edit `.forge/store/*.json` directly.
- Phase 1 only touches `{{KEY}}` token text; never rewrite persona prose, algorithm steps, or role definitions.

## Store-Write Verification

Every `forge_store` write MUST succeed before advancing. If `store-cli` exits
non-zero or the `PreToolUse` write-boundary hook blocks the call (exit 2):

1. Parse the structured error.
2. Correct the JSON to satisfy the schema.
3. Retry. Repeat up to 3 times. After 3 failures, halt and escalate.

Never set `FORGE_SKIP_WRITE_VALIDATION=1` — operator-only emergency switch.

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
| `--phase 1` or `--auto` | Auto-apply: placeholder fills only — **use after** `/forge:init` completes to fill `{{KEY}}` placeholders from project signals |
| `--phase 2` | Propose-diffs: sprint artifact + friction scan — **use after** a sprint completes to turn friction events into persona/skill enrichments |
| `--phase 3` | Drift detection: full codebase vs structural-element comparison — **use on-demand** or after `/forge:calibrate` to detect stale references |

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

2. **Zero-friction guard**: If the friction event list is empty, print:
   ```
   No friction events queued for the active sprint — nothing to enhance.
   ```
   and exit Phase 2 immediately (skip steps 3–9; emit the enhancement event with `"notes": "{\"phase\":2,\"frictionCount\":0}"`). Do not create `.forge/enhancement-proposals/` when there are no proposals.

3. **Deduplicate** friction events by composite key `workflow + persona + issue`. Keep the most
   recent occurrence of each composite key.

4. **Read most recent completed sprint** from `.forge/store/sprints/` (status `done` or
   `retrospective-done`), sorted by completion date. Read its task records from
   `.forge/store/tasks/` filtered by the sprint ID.

5. **Synthesize enrichment proposals** — for each friction event, classify the proposed
   change into exactly one of three ops (see `forge/schemas/proposal.schema.json`):

   | `op`            | When to use                                                                 |
   |-----------------|-----------------------------------------------------------------------------|
   | `insert_skill`  | A new skill / persona / kb_docs reference is needed; target file does not yet carry the guidance. |
   | `update_skill`  | An existing skill or persona file needs revised guidance — e.g., add a routing pattern reference to `deps.kb_docs`, replace a stale instruction. |
   | `delete_skill`  | A skill is unused, redundant, or stale (`skill_unused` / `skill_redundant` / `skill_stale` friction subkinds); target file or section should be removed. |

   For each proposal capture **at minimum** the schema-required triplet
   `{op, target_path, diff_body}` plus optional `rationale` and `sourceFrictionIds`.
   `sourceFrictionIds` MUST carry the `eventId` of every friction event that
   contributed to the proposal — the next step depends on it to resolve the
   originating task for the recurrence scan.
   For large committed file sets (> 5 files in the sprint), also check whether
   `engineer-skills.md` or `architect-skills.md` should be updated (`update_skill`).
   The op classification is the foundation for the downstream judge (T03),
   delete-candidate detection (T05), compression gate (T06), and queue drain (T07).

5a. **Cross-task replay scoring (recurrence boost)** — before writing the
   artifact, stamp each proposal with `recurrence_count` and
   `recurrence_task_ids` so the T03 judge can score "this friction recurred
   across N tasks" rather than treating every signal as a singleton:

   ```sh
   node -e "
   const { annotateProposals } = require('./forge/tools/replay-scoring.cjs');
   // friction = deduped friction events from step 3, each carrying eventId,
   //            taskId, subkind, evidence.skillId (orchestrator-stamped).
   // proposals = array built in step 5.
   // taskOrder = task IDs of the most-recent sprint sorted by completion
   //             order — same source as step 4.
   const annotated = annotateProposals(proposals, friction, taskOrder);
   process.stdout.write(JSON.stringify(annotated));
   "
   ```

   Contract (per `forge/tools/replay-scoring.cjs`):
   - `recurrence_count` is the number of distinct tasks (origin task + later
     tasks in `taskOrder`) whose friction events match the proposal's
     originating `(subkind, evidence.skillId)` pair. Always `>= 1`.
   - `recurrence_task_ids` is the `taskOrder`-sorted list of those task IDs.
   - Proposals whose `sourceFrictionIds` cannot be resolved (no matching
     `eventId` in the friction set, or the resolved event lacks
     `subkind`/`evidence.skillId`) receive `recurrence_count: 1` and an empty
     `recurrence_task_ids: []` — neutral signal, not silent failure.
   - The annotator returns new proposal objects; the input array is not
     mutated.

5b. **Delete-candidate detection (3-sprint zero-use)** — scan `skill_usage`
   events across the trailing 3 sprints and emit a `delete_skill` proposal
   for every skill with zero retrieval AND zero invocation across the
   window. This is the only mechanism by which the skill repository shrinks:

   ```sh
   node -e "
   const { buildDeleteProposals } = require('./forge/tools/delete-candidate-detector.cjs');
   // skillUsageEvents = all events with type === 'skill_usage' across the
   //                    sprints in scope (collected via the same Step 1
   //                    walker, filtered by type instead of friction).
   // sprintOrder      = sprint IDs sorted by completion order (oldest →
   //                    newest). The detector takes the trailing windowSize
   //                    entries.
   // windowSize       = 3 by default; configurable. Defined as the trailing
   //                    N sprints of sprintOrder.
   // targetPathFor    = (skillId) => the on-disk path of the skill file to
   //                    delete. Workflow chooses the mapping convention.
   const deletes = buildDeleteProposals({
     events:        skillUsageEvents,
     sprintOrder,
     windowSize:    3,
     targetPathFor: (skillId) => 'forge/skills/' + skillId + '.md',
   });
   process.stdout.write(JSON.stringify(deletes));
   "
   ```

   Append the resulting `delete_skill` proposals to the proposal array from
   step 5/5a before step 6. Each delete proposal already carries
   `recurrence_count: 1` and `recurrence_task_ids: []` (the annotator from
   step 5a is for friction-derived proposals; delete candidates come from
   usage telemetry, not friction, so recurrence is neutral by construction).

5c. **LLM-judge gate (Sonnet rubric, drop <3/5)** — score every proposal
   against the 5-axis rubric and drop low-signal proposals before
   presentation. The rubric is single-sourced in
   `forge/tools/judge-proposal.cjs`:

   | Axis (0..5) | What it measures |
   |---|---|
   | `specificity` | Names a concrete target_path beyond `forge/skills/*` floor; carries a non-trivial rationale; recurrence trail boosts. |
   | `when_not_to_use` | Body contains a literal "When NOT to use" section. |
   | `no_trajectory_copy_paste` | No long verbatim runs or unbroken non-whitespace blocks (>= 400 bytes) that suggest pasted trajectory log. |
   | `body_under_2kb` | `Buffer.byteLength(diff_body, 'utf8') <= 2048`. |
   | `cites_friction` | Proposal carries at least one `sourceFrictionIds` entry; multiple citations or recurrence boost the score. |

   For each proposal in the post-5b array, the workflow asks Sonnet to
   apply the rubric and emit per-axis 0..5 scores; in the absence of an
   LLM call, the deterministic `scoreProposal(proposal)` helper in
   `judge-proposal.cjs` is used as both the fallback scorer and the
   validation contract for Sonnet-produced scores (single source of truth
   for the rubric definition).

   ```sh
   node -e "
   const {
     scoreProposal,
     decideJudgement,
   } = require('./forge/tools/judge-proposal.cjs');
   // proposals = post-5b array of proposal records.
   const judged = proposals.map((p) => {
     const scored   = scoreProposal(p);
     const decision = decideJudgement(scored);
     return { proposal: p, ...decision };
   });
   const kept    = judged.filter((j) => j.verdict === 'keep').map((j) => j.proposal);
   const dropped = judged.filter((j) => j.verdict === 'drop');
   process.stdout.write(JSON.stringify({ kept, dropped }));
   "
   ```

   Contract (per `forge/tools/judge-proposal.cjs`):
   - `scoreProposal(proposal)` returns `{ axes, average }` with `axes`
     keyed by every entry in `RUBRIC_AXES` and `average` rounded to one
     decimal place.
   - `decideJudgement({ axes })` returns
     `{ verdict, average, axes, reason }`. `verdict === 'drop'` iff
     `average < 3` (strictly less than); ties at exactly 3.0 keep.
   - `decideJudgement` fails loud on missing or out-of-range axes — the
     judge will NOT silently coerce a malformed score sheet into a verdict.

   **Logging dropped proposals (AC3).** Every rejection MUST be persisted
   for retro review. Replace the proposal array passed to step 6 with the
   `kept` list, and append the `dropped` list to
   `$PROJECT_ROOT/.forge/enhancement-proposals/phase2-<timestamp>-rejections.json`
   as a sibling artifact. Each rejection record carries the original
   proposal alongside `{ verdict: 'drop', average, axes, reason }`. The
   markdown summary written in step 6 SHOULD include a "Dropped (N)" line
   pointing at the rejections file when N > 0.

   **Carry-over caveat** — the rubric is deterministic; Sonnet's role is
   to add semantic judgement to axes that the heuristic scorer
   approximates (specificity in particular). When Sonnet is invoked, its
   per-axis scores MUST be validated against the 0..5 range via the same
   `validateAxes` invariant `decideJudgement` enforces. Operators
   investigating an unexpected drop should consult the per-axis trace in
   `reason`.

   Contract (per `forge/tools/delete-candidate-detector.cjs`):
   - A skill qualifies for deletion iff it has at least one `skill_usage`
     event inside the trailing window AND every in-window observation has
     `retrieved === false` AND `used === false`. Any single `retrieved: true`
     or `used: true` event disqualifies the skill.
   - Skills with zero observations in the window are NOT proposed — this
     case is indistinguishable from a newly-added skill that hasn't been
     loaded yet, so silence is the safe default.
   - Each proposal carries `window_size`, `window_sprint_ids`, and a
     `sourceFrictionIds: []` (delete candidates derive from usage telemetry,
     not friction).

   **Carry-over caveat** — the trailing-3-sprint window is only meaningful
   once 3 sprints have actually elapsed since `skill_usage` event emission
   landed in FORGE-S24-T01 (forge 0.45.1). During the carry-over period the
   detector still runs over whatever sprintOrder it receives, but the
   signal is noisier: a skill flagged after only one or two sprints of
   history may simply be new or temporarily idle. Operators should treat
   delete proposals from short-history runs as advisory until the full
   window is populated.

6. **Write proposal artifact**:
   ```sh
   mkdir -p "$PROJECT_ROOT/.forge/enhancement-proposals"
   ```
   Write **two** outputs for each Phase 2 run (using the `kept` list from
   step 5c — dropped proposals are persisted separately to the
   `phase2-<timestamp>-rejections.json` sibling described in step 5c):

   - `phase2-<timestamp>.md` — human-readable markdown, one section per proposal,
     showing op + target_path + a fenced diff block.
   - `phase2-<timestamp>.json` — machine-readable array of proposal records, each
     conforming to `forge/schemas/proposal.schema.json` (required keys: `op`,
     `target_path`, `diff_body`; `op` ∈ {insert_skill, update_skill, delete_skill};
     optional `recurrence_count` ≥ 1 and `recurrence_task_ids` populated by step 5a).

   **Back-compat on read** — pre-0.45.2 proposal records lack `op`. Downstream
   consumers MUST route legacy records through
   `forge/tools/proposal-normalize.cjs:normaliseProposal()` which defaults the
   missing `op` to `insert_skill` (the only op the prior insert-biased flow
   could produce). Do NOT silently coerce — call the helper explicitly so the
   normalisation is auditable.

7. **Present to user**:
   ```
   ## Phase 2 Enhancement Proposals

   N change(s) proposed — review: .forge/enhancement-proposals/phase2-<timestamp>.md

   [A] Apply all  [r] Review individually  [n] Skip
   ```

8. **On approval** — for each approved change:
   - Apply the edit in-place.
   - Call `manage-versions.cjs add-snapshot --source post-sprint:<SPRINT_ID> --enhanced-elements <list>`.

9. **Emit enhancement event** (same schema as Phase 1, with `"phase": "post-sprint"`).

10. **Report**: N changes applied, M skipped, snapshot written or skipped.

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
