# Plan 3 — Gate-Check Enforcement

**Category:** Quality
**Target version:** patch bump (e.g. `0.12.5 → 0.13.0` — minor, because
orchestrator semantics change)
**Estimated effort:** 2–3 engineer days
**Breaking:** No (additive checks; no schema or user-visible state change)

---

## 1. Problem

`forge/meta/workflows/meta-orchestrate.md:549` states:

> YOU MUST NOT advance a phase until its gate checks pass.

…but the executing algorithm around lines 138–156 and 393–421 never validates
this. The orchestrator will happily spawn the `implement` subagent even when
`PLAN.md` is missing, or mark a phase "complete" when the verdict line is
malformed. Symptoms: phantom revisions, silent halts, subagents that "succeed"
on empty inputs.

Two specific defects:

1. **No pre-flight gate validation** before each `Agent` spawn — prerequisites
   are assumed to exist.
2. **Verdict parsing is string-matching without defense** — `meta-orchestrate.md:509–530`
   assumes the literal `**Verdict:** [Approved | Revision Required]` format.
   Typos, case drift, or extra whitespace cause silent misclassification.

## 2. Goal

Turn the documented invariant into an enforced pre-flight + defensive verdict
parser. On violation, halt with a structured error event and a remediation
message; never spawn a subagent on missing prerequisites; never silently treat
a malformed verdict as "approved."

## 3. Scope

**In scope:**
- Declarative per-phase gates (YAML in workflow frontmatter)
- Pure pre-flight function callable from the orchestrator
- Verdict parser with explicit `null` return on malformed input
- Escalation event when gate or verdict check fails
- Same pattern applied to `meta-fix-bug.md`

**Out of scope:**
- Changes to task/bug schemas (deferred to Plan 2)
- Reworking revision-loop semantics
- Changing what "approved" / "revision required" mean

## 4. Files to touch

| File | Change type |
|---|---|
| `forge/tools/preflight-gate.cjs` | **NEW** — pure function `preflight(phase, taskState) → { ok, missing[] }` |
| `forge/tools/parse-verdict.cjs` | **NEW** — pure function `parseVerdict(markdown) → "approved" \| "revision" \| null` |
| `forge/tools/__tests__/preflight-gate.test.cjs` | **NEW** |
| `forge/tools/__tests__/parse-verdict.test.cjs` | **NEW** |
| `forge/meta/workflows/meta-orchestrate.md` | Add `gates:` YAML block per phase; edit execution algorithm to call `preflight` + `parseVerdict` |
| `forge/meta/workflows/meta-fix-bug.md` | Add `gates:` YAML block per phase; same parser integration |
| `forge/migrations.json` | New entry |
| `CHANGELOG.md` | New entry |
| `forge/integrity.json` | Regenerated |
| `forge/commands/health.md` | Updated `EXPECTED=` hash |

No changes to `forge/schemas/`, no changes to `engineering/` layout.

## 5. Gate declaration format

Add a frontmatter-adjacent YAML block at the top of each workflow phase section
in `meta-orchestrate.md`. Example for `implement`:

```yaml
phase: implement
gates:
  required_artifacts:
    - path: engineering/sprints/{sprint}/tasks/{task}/PLAN.md
      min_bytes: 200
  required_state:
    - task.status in ["plan-approved", "implementing"]
  forbidden_state:
    - task.status == "completed"
  predecessor_verdicts:
    - phase: review-plan
      verdict: approved
```

**Why YAML in markdown:** keeps gates as data (lintable, testable) without
introducing a new schema file or config format. Parseable by any YAML library
the `preflight-gate.cjs` tool already has (or add `js-yaml` — check
`package.json` first; if not present, use a regex-based extractor for the
minimal shape defined above).

## 6. Algorithm

### 6.1 `preflight-gate.cjs`

```
preflight(phaseName, taskState, workflowGates) → { ok: bool, missing: string[] }
```

Steps:

1. Look up `gates` block for `phaseName` from `workflowGates`.
2. For each `required_artifacts[i]`:
   - Resolve path template against `taskState` (`{sprint}`, `{task}`, `{bug}`).
   - `fs.existsSync` + stat; fail if missing or `size < min_bytes`.
3. For each `required_state` predicate: evaluate against `taskState` JSON.
   Supported predicates: `field in [values]`, `field == value`, `field != value`.
   Anything else → throw (we fail loud, not silent).
4. For each `forbidden_state`: same evaluator, inverted.
5. For each `predecessor_verdicts`: read the prior phase's review artifact,
   call `parseVerdict`, compare.
6. Collect all failures into `missing[]`. Return `ok: missing.length === 0`.

**Pure function:** no side effects beyond `fs.existsSync` / `fs.statSync` /
`fs.readFileSync`. No network, no writes, no process spawns. Safe to call
repeatedly.

### 6.2 `parse-verdict.cjs`

```
parseVerdict(markdown) → "approved" | "revision" | null
```

Rules:

1. Search for a line matching `/^\s*\*\*Verdict:\*\*\s*(.+?)\s*$/mi`
   (case-insensitive on the "Verdict" label only).
2. Normalize the captured value: trim, strip surrounding brackets `[]`,
   lowercase.
3. Match against a closed set:
   - `approved`, `approve` → `"approved"`
   - `revision required`, `revision`, `needs revision`, `changes requested` → `"revision"`
   - anything else → `null`
4. If multiple `**Verdict:**` lines exist, return the LAST one (reviewers
   sometimes draft then restate).

**Never infer from surrounding prose.** The verdict line is the contract.

### 6.3 Orchestrator integration (`meta-orchestrate.md`)

Before every `Agent` spawn in the phase loop, insert:

```
1. Call preflight(phase, taskState, gates).
2. If !ok:
   a. Emit event: { type: "gate_failed", phase, task, missing }
   b. Append to PROGRESS.md: "❌ Gate failed for {phase}: {missing.join(", ")}. Remediation: run {predecessor phase} first."
   c. Halt the orchestrator loop — do NOT retry, do NOT spawn.
   d. Surface the error to the caller of /run-task or /run-sprint.
3. Else: proceed to spawn subagent.
```

After every review-phase subagent returns:

```
1. Read the review artifact path.
2. verdict = parseVerdict(contents)
3. If verdict === null:
   a. Emit event: { type: "verdict_malformed", phase, task, artifact_path }
   b. Append to PROGRESS.md: "❌ Verdict could not be parsed from {artifact}. Expected `**Verdict:** Approved` or `**Verdict:** Revision Required`."
   c. Halt — do not re-loop, do not auto-advance.
4. If verdict === "revision": increment iteration counter, loop to predecessor phase.
5. If verdict === "approved": advance to next phase.
```

### 6.4 Command entry-point integration (manual mode)

Gates are a property of **the phase**, not **the orchestrator**. Users who run
individual commands (`/plan`, `/implement`, `/review-plan`, `/review-code`,
`/approve`, `/commit`, `/fix-bug`) bypass the orchestrator loop and must get
the same safety net.

Hoist the pre-flight call into each command's entry point, before the `Agent`
spawn. Edit each of:

- `forge/commands/plan.md`
- `forge/commands/implement.md`
- `forge/commands/review-plan.md`
- `forge/commands/review-code.md`
- `forge/commands/approve.md`
- `forge/commands/commit.md`
- `forge/commands/fix-bug.md`
- any phase command added by `/forge:add-pipeline`

…to insert the following block before the subagent spawn:

```
# Pre-flight gate check (shared with orchestrator)
node .forge/tools/preflight-gate.cjs --phase {phase} --task {taskId}
  → on non-zero exit:
      print the stderr message (missing artifacts / invalid state / bad predecessor verdict)
      print a remediation line pointing to the phase that must run first
      halt — do NOT spawn the subagent
```

The orchestrator calls the exact same `preflight-gate.cjs` entry point — one
source of truth, two call sites.

**`preflight-gate.cjs` gains a CLI shim** (in addition to the pure-function
export used by the orchestrator):

```
Usage: preflight-gate.cjs --phase <phaseName> --task <taskId> [--bug <bugId>]
Exit codes:
  0 — all gates passed
  1 — one or more gates failed (missing list printed to stderr)
  2 — invalid arguments or missing workflow gate definition
```

**Verdict parser CLI shim** — expose `parse-verdict.cjs` as a CLI for manual
users who want to script `/approve` gates or sanity-check a review document:

```
Usage: parse-verdict.cjs <path-to-review.md>
Stdout: "approved" | "revision" | "unknown"
Exit codes: 0 on approved, 1 on revision, 2 on unknown/malformed
```

This lets a user wrap `/approve` in a shell check:

```sh
node .forge/tools/parse-verdict.cjs engineering/sprints/S1/tasks/T3/CODE_REVIEW.md \
  && /approve T3
```

**Tests (add to §7):**

- CLI shim for `preflight-gate.cjs` exits 0 on happy path, 1 on missing
  artifact, 2 on unknown phase name.
- CLI shim for `parse-verdict.cjs` returns correct exit code for each of the
  three verdict states on fixture files.

**Command-file test:** grep all `forge/commands/*.md` that spawn an `Agent`
for a phase role; every one of them MUST contain the pre-flight invocation.
A simple test under `forge/tools/__tests__/` can enforce this structurally so
new commands added later don't forget the guard.

## 7. Tests (write failing first)

### `preflight-gate.test.cjs`

- Missing `PLAN.md` blocks `implement` phase, `missing` contains the path.
- `PLAN.md` present but `0 bytes` → blocked (stub file guard).
- `task.status == "completed"` blocks `plan` phase (forbidden state).
- Happy path: all artifacts present, status valid, predecessor approved → `ok: true`.
- Unknown predicate in YAML throws with a clear error message.
- Path template variable substitution handles `{sprint}`, `{task}`, `{bug}`.

### `parse-verdict.test.cjs`

- `**Verdict:** Approved` → `"approved"`.
- `**Verdict:** [Approved]` → `"approved"` (bracket stripping).
- `**Verdict:** revision required` → `"revision"` (case insensitive).
- `**Verdict:** Needs Revision` → `"revision"` (synonym).
- `**verdict:** approved` → `"approved"` (label case insensitive).
- Multiple verdict lines — last one wins.
- `Verdict: Approved` (missing bold) → `null`.
- `**Verdict:** Looks good to me` → `null` (free-form prose, not a valid token).
- Empty string → `null`.
- No verdict line at all → `null`.

## 8. Risks & rollback

| Risk | Mitigation |
|---|---|
| A gate is over-eager and blocks a legitimate flow | Gates are YAML data — relax the block in the workflow file, ship a patch release. No user state affected. |
| Verdict parser rejects prose that older reviewer personas emitted | Scan existing `engineering/sprints/*/tasks/*/REVIEW*.md` during development for format variance; extend the synonym table before shipping. |
| Added file I/O slows the orchestrator | `preflight` does at most ~5 stats per phase. Negligible vs. Agent spawn cost (seconds). |

**Full rollback:** revert the three workflow-file edits. Tools are unreferenced
if not called, safe to leave on disk.

## 9. Acceptance criteria

- [ ] All new tests pass; all 241 existing tests still pass.
- [ ] Every phase transition in `meta-orchestrate.md` and `meta-fix-bug.md` is gated.
- [ ] A deliberately broken verdict line produces a `verdict_malformed` event and halts the loop.
- [ ] A deliberately missing `PLAN.md` blocks `implement` with a `gate_failed` event.
- [ ] Reference run of `/run-task` on a clean task completes with zero gate failures (happy path still works).
- [ ] `PROGRESS.md` contains clear remediation text on every failure.

## 10. Out-of-band artifacts

- `forge/migrations.json` entry: `regenerate: ["workflows"]`, `breaking: false`,
  `manual: []`, notes: `"Orchestrator now enforces per-phase gate checks and defensive verdict parsing. No schema changes."`
- `CHANGELOG.md` entry describing the new safety net.
- Security scan saved to `docs/security/scan-v{VERSION}.md`.
