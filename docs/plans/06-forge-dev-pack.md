# Plan 6 — `forge-dev` Contributor Tooling Pack

**Category:** Developer productivity / architectural codification
**Target version:** patch bump (no user-visible change — plugin output is
unchanged; all additions are contributor-only)
**Estimated effort:** 3–4 engineer days for the bootstrap + first two commands
(`release`, `add-schema`); remaining entries land incrementally
**Breaking:** No

---

## 1. Problem

Plans 1–5 shipped a coherent orchestrator architecture with five recurring
motifs: **two-layer boundary** (`forge/` vs `.forge/`), **schema-as-contract**
at the write boundary, **injection pipelines** (persona-pack, summaries,
context-pack) that replace ad-hoc re-reads, **gate-first phases** with
preflight + closed-vocabulary verdicts, and **fail-open hooks** that never
block legitimate work.

None of these motifs are codified in tooling that a future contributor will
trip over. They live only in:

- CLAUDE.md (the two-layer rule)
- Per-plan markdown in `docs/plans/`
- The implicit shape of the code itself

Concrete friction observed while shipping Plan 5 (v0.18.0):

- The plan doc's path assumptions (`engineering/sprints/.../task.json`) were
  wrong — real layout is flat `.forge/store/*.json`. Discovered mid-build,
  forced registry revision.
- The plan's proposed `tokenSource` enum did not match the real
  `event.schema.json` enum — would have failed drift guard.
- The release checklist is ~15 sequential manual steps (version bump,
  migrations entry, CHANGELOG, `build-manifest`, `gen-integrity`, health-hash
  copy, security scan, scan index row, README table rotation). Each step is
  easy to forget; missing any of them breaks users.
- `build-manifest.cjs` auto-discovers schemas but requires explicit mapping
  for personas/workflows/templates — not obvious which additions trigger a
  manifest rebuild.
- No programmatic check enforces "new entity field → registry entry → hook
  test → drift guard." Plan 5 did this by hand; Plan 7 will not have the
  same author to remember.

The fix is not another plan document. It is a **contributor-only skill/command
pack that encodes these five motifs as guardrails and automations**, lives
alongside the plugin source, and never ships to users.

## 2. Goal

Introduce a third top-level layer in the repo — `dev/` — for
contributor-facing engineering tooling, paired with thin `.claude/`
wrappers that make the tooling invokable as slash-commands and skills from
Claude Code. Codify the five architectural motifs as skills, and codify the
two highest-ROI deterministic workflows (`release`, `add-schema`) as
commands.

The pack must:

- Never ship to Forge users — only lives in the `Entelligentsia/forge`
  repository; is not referenced by `forge/.claude-plugin/plugin.json`, is
  not copied into installed plugin caches, and is ignored by
  `gen-integrity.cjs` and `build-manifest.cjs`.
- Be discoverable by Claude Code when working inside `/home/boni/src/forge/`
  (i.e. loaded from `.claude/` automatically).
- Keep the wrappers thin (≤15 lines of frontmatter + `@`-ref body) so the
  actual logic lives in reviewable, testable files under `dev/`.
- Update `CLAUDE.md` to describe the now-three-layer architecture so the
  next contributor does not file dev tooling under `forge/` by mistake.

## 3. Scope

**In scope (Plan 6 itself):**

1. Bootstrap the `dev/` directory structure and `.claude/` wrappers.
2. Update `CLAUDE.md` to document the three-layer model.
3. Ship the first two commands: `/forge-dev:release` and
   `/forge-dev:add-schema` — the two that would have saved the most time
   during Plan 5.
4. Ship the first three skills: `two-layer-boundary`, `schema-as-contract`,
   `injection-pipeline` — the three motifs most likely to be violated by a
   future contributor.
5. Add a `dev/reference/` folder with `store-layout.md`,
   `release-checklist.md`, `injection-map.md` — short canonical refs that
   both the commands and skills `@`-load.
6. Add a `dev/__tests__/` suite for any Node scripts in `dev/` (scaffold
   generators, manifest-aware helpers). Same TDD rule as `forge/tools/`.

**Explicitly deferred to later plans (sketched in §11):**

- `gate-first-phases` + `fail-open-hooks` skills
- `/forge-dev:add-phase`, `/forge-dev:add-injection`, `/forge-dev:verify-regen`
- `forge-dev:plan-reviewer` agent
- Extracting `dev/` into a separate Claude Code plugin so other Forge
  contributors can install it without cloning this repo

## 4. Directory layout

```
forge/                     # ← unchanged. Plugin source. Ships to users.
engineering/               # ← unchanged. Dogfooding KB.
.forge/                    # ← unchanged. Dogfooding generated output.
docs/                      # ← unchanged.

.claude/                   # Contributor-side — thin wrappers
  commands/
    forge-dev/
      release.md           # @-refs dev/release/README.md
      add-schema.md        # @-refs dev/add-schema/README.md
  skills/
    forge-dev/
      two-layer-boundary/SKILL.md
      schema-as-contract/SKILL.md
      injection-pipeline/SKILL.md

dev/                       # NEW — contributor-only engineering tooling
  README.md                # What this folder is, how it relates to forge/
  release/
    README.md              # Full release walkthrough; commands/release.md @-refs this
    checklist.md           # The 15-step checklist as a living doc
    bin/run-release.cjs    # Orchestrates version bump → manifest → integrity → scan
    bin/bump-version.cjs   # Subscript: update plugin.json, migrations.json, CHANGELOG
    bin/stage-scan.cjs     # Subscript: generate security scan report scaffold
  add-schema/
    README.md
    bin/scaffold-schema.cjs  # Generates schema + registry entry + tests from a template
    templates/
      schema.template.json
      drift-guard.test.js.template
      hook-coverage.test.js.template
  skills/                  # The reference prose the thin SKILL.md files @-load
    two-layer-boundary.md
    schema-as-contract.md
    injection-pipeline.md
  reference/
    store-layout.md         # .forge/store/** map + ID patterns + file naming
    release-checklist.md    # Canonical checklist (the skills & commands both link here)
    injection-map.md        # persona-pack / summaries / context-pack — how each flows
  __tests__/
    run-release.test.cjs
    scaffold-schema.test.cjs
```

**Naming rationale:** `dev/` is short and honest. Not `forge-dev/` because it
already sits inside the `forge` repo; the `forge-` prefix would be redundant.
If we later extract this into its own plugin, rename to `forge-dev/` at that
point.

## 5. CLAUDE.md update

Extend the current "Two-Layer Architecture" section to three layers:

```
forge/      ← PLUGIN SOURCE. You develop here. Ships to users.
dev/        ← CONTRIBUTOR TOOLING. You develop here. NEVER ships to users.
.claude/    ← THIN WRAPPERS. Frontmatter + @-refs to dev/. Discovered by Claude Code.
.forge/     ← DOGFOODING INSTANCE. Generated output. Do not edit directly.
engineering/← DOGFOODING KB. Managed by Forge commands.
```

Extend the decision table with rows for:

| You want to… | Edit this |
|---|---|
| Automate a release step | `dev/release/bin/` |
| Add a `/forge-dev:*` slash command | Body under `dev/<name>/`, wrapper in `.claude/commands/forge-dev/` |
| Add a contributor-side skill | Body under `dev/skills/`, frontmatter in `.claude/skills/forge-dev/<name>/SKILL.md` |
| Document an architectural invariant | `dev/skills/<motif>.md` (so skills and commands both `@`-load it) |

Add an explicit non-shipping invariant:

> Nothing under `dev/` or `.claude/` is ever read by `forge/`'s hooks, tools,
> or workflows. The plugin source must work identically whether this repo
> ships with `dev/` present or absent. Never `require('../../dev/...')` from
> inside `forge/`.

## 6. The two commands — shape

### 6.1 `/forge-dev:release`

Drives the full release cycle from a starting version to a pushed tag.
Interactive confirmation at two gates (before security scan, before push).

```
Steps (run-release.cjs):
 1. Verify working tree clean for forge/, dev/, .claude/, docs/security/, CHANGELOG.md
 2. Prompt for release type (patch | minor | major) — or accept --bump=<type>
 3. Bump forge/.claude-plugin/plugin.json version
 4. Add migrations.json entry scaffold (opens $EDITOR or accepts --notes)
 5. Prepend CHANGELOG.md entry scaffold (opens $EDITOR)
 6. Run node --test across forge/tools/__tests__ + forge/hooks/__tests__ +
    forge/schemas/__tests__ + dev/__tests__ — abort on failure
 7. node forge/tools/build-manifest.cjs --forge-root forge/
 8. node forge/tools/gen-integrity.cjs --forge-root forge/
 9. Compute SHA of verify-integrity.cjs; diff against EXPECTED= in health.md;
    update if drift
10. GATE 1 — print summary of pending changes, prompt to continue
11. Invoke /security-watchdog:scan-plugin and save to
    docs/security/scan-v{VERSION}.md (or accept pre-staged output via
    --scan-from=<path>)
12. Prepend row to docs/security/index.md
13. Prepend row to README.md ## Security, evict oldest to keep 3
14. GATE 2 — git diff summary, prompt to stage + commit
15. git add the plugin-side paths only (never .forge/config.json)
16. Commit with conventional "release: vX.Y.Z — <one-line>" format
17. Prompt for `git push origin main` (never auto-pushes without confirmation)
```

The script reads version from `forge/.claude-plugin/plugin.json` as the
source of truth; every downstream write derives from it. Idempotent: re-
running after partial failure detects completed steps (e.g. integrity
already up-to-date) and skips them.

### 6.2 `/forge-dev:add-schema`

Scaffolds a new data-shape addition across all the places Plan 5 taught us
it has to be touched:

```
Input: kind name (e.g. "retro-note"), schema fields (via $EDITOR or JSON file)
Outputs (atomic — all-or-nothing):
 1. forge/schemas/<kind>.schema.json              (from template)
 2. forge/hooks/lib/write-registry.js             (append pattern + schema ref)
 3. forge/hooks/__tests__/validate-write.test.js  (append test block)
 4. forge/tools/store-cli.cjs                     (append to AUX_SCHEMAS if aux)
 5. forge/tools/__tests__/store-cli.test.cjs      (append test block if aux)
 6. forge/schemas/__tests__/<kind>-consistency.test.js (if kind is a subset of
                                                       an existing kind — e.g.
                                                       event-sidecar → event)
 7. Prints the exact CHANGELOG bullet to paste
```

Uses templates under `dev/add-schema/templates/`. Every generated file is
diffable in a single PR. The scaffolder refuses to overwrite existing files
— it either appends or aborts.

## 7. The three skills — shape

Each skill body is ≤15 lines of frontmatter + one-line `@`-ref. The actual
prose lives under `dev/skills/<name>.md` so both the skill and any command
that needs the same rule share a single source of truth.

### 7.1 `two-layer-boundary`

Triggers on: any Write/Edit intent where the target path is under `forge/`,
`.forge/`, `engineering/`, or `dev/`.

Rule: before editing, confirm which layer the change belongs to using the
decision table in `CLAUDE.md`. If the user's intent is ambiguous, ask.
Specifically blocks the common error "fix a plugin behaviour by editing
`.forge/workflows/*`" — the fix goes in `forge/meta/workflows/`.

### 7.2 `schema-as-contract`

Triggers on: any change to `forge/schemas/*.schema.json`,
`forge/hooks/lib/write-registry.js`, `forge/tools/store-cli.cjs`
validation paths, or any new field on a store entity.

Rule: schema changes propagate through registry + hook test + store-cli gap
+ drift guard + (if sidecar-like) subset test. Lists the six touchpoints
from `/forge-dev:add-schema` and recommends the command over manual edits.
Reminds: "agents MAY bypass deterministic tools; schemas MUST hold."

### 7.3 `injection-pipeline`

Triggers on: any edit to `forge/meta/workflows/*.md` that proposes reading
from `engineering/architecture/`, `.forge/cache/persona-pack.json`, or a
task/bug's `summaries` field.

Rule: before adding a new KB read to a workflow, check whether the injected
`persona-pack` (Plan 1), task `summaries` (Plan 2), or `context-pack`
(Plan 4) already carry the required information. If they do, use the
injected artifact. If they do not, decide whether to extend the pack
(preferred, amortized cost) or add a targeted read (acceptable with
justification comment).

## 8. Reference docs

### 8.1 `dev/reference/store-layout.md`

One page. Canonical:

```
.forge/store/
  sprints/{SPRINT-ID}.json
  tasks/{TASK-ID}.json              # TASK-ID format: <SPRINT-ID>-T<NN>
  bugs/{BUG-ID}.json                # BUG-ID format: (FORGE-)BUG-<NNN>
  features/{FEAT-ID}.json
  events/{BUCKET}/<timestamp>_<taskId>_<phase>_<banner>.json
  events/{BUCKET}/_{sidecarName}_usage.json    # sidecars
  events/{BUCKET}/progress.log                  # line-pipe-delimited
  COLLATION_STATE.json
  COST_BASELINES.json
```

Includes the reason sidecars are prefixed with `_` (registry ordering:
specific before general), and the pipe-delimited progress.log format.

### 8.2 `dev/reference/release-checklist.md`

The 15 steps from §6.1, plain-text, maintained alongside the script. Serves
as the spec: if the script changes behaviour, this doc changes with it.

### 8.3 `dev/reference/injection-map.md`

Table of cached artifacts:

| Artifact | Built by | Cached at | Injected where | Invalidated when |
|---|---|---|---|---|
| `persona-pack.json` | `build-persona-pack.cjs` | `.forge/cache/persona-pack.json` | every subagent spawn | persona or skill meta changes |
| `context-pack.md/.json` | `build-context-pack.cjs` | `.forge/cache/context-pack.md` | every subagent spawn | `engineering/architecture/*.md` changes |
| task `summaries.*` | phase workflows via `store-cli set-summary` | task.json | downstream phase subagent prompts | phase completes |

## 9. Tests (write failing first)

- `dev/__tests__/run-release.test.cjs` — smoke tests for the release script:
  dry-run mode on a fixture repo, version-bump arithmetic (0.17.1 +
  --bump=patch → 0.17.2), CHANGELOG prepend shape, skip-when-idempotent
  behaviour.
- `dev/__tests__/scaffold-schema.test.cjs` — run the scaffolder against a
  temp `forge/` tree, assert each of the six files was written and no
  existing file was overwritten. Round-trip: generated schema parses,
  generated hook test passes.
- `forge/tools/__tests__/*` — one guard test that imports nothing from
  `dev/` and asserts `require.resolve('../../dev/...')` would throw if
  attempted. Codifies the "never `require` dev from forge" invariant.

## 10. Release plumbing for Plan 6 itself

- No version bump required (patch-level additive change — no user-visible
  behaviour change). We bump only if `forge-dev:release` itself calls out
  that bumping Plan 6's infrastructure counts as material. It does not.
- `CHANGELOG.md` gains a single entry: `### Contributor tooling` (under
  the same version as the next material release, not its own release).
- `gen-integrity.cjs` and `build-manifest.cjs` are unchanged — they already
  only walk `forge/`.
- `.gitignore` / release scripts must confirm `dev/` is never packed into
  the `release` branch subtree that skillforge tracks. Verify by dry-run:
  `git subtree split --prefix=forge/ main` should not reference `dev/`.

## 11. Rollout

1. **Bootstrap (this plan):** `dev/` skeleton + `.claude/` wrappers +
   `CLAUDE.md` update + the three skills + the two commands + the three
   reference docs. Lands as a single PR.
2. **Second wave (Plan 7-or-later):** `gate-first-phases` and
   `fail-open-hooks` skills; `/forge-dev:add-phase`,
   `/forge-dev:add-injection`, `/forge-dev:verify-regen` commands.
3. **Third wave:** `forge-dev:plan-reviewer` agent — automates the "does
   this plan doc respect the five architectural invariants" check.
4. **Extraction:** once stable and non-churning, split `dev/` into its own
   `forge-dev` Claude Code plugin so contributors can install it
   independently. Deferred until after at least 3 months of live use.

## 12. Risks & rollback

| Risk | Mitigation |
|---|---|
| `dev/` accidentally ships to users | Guard test (§9) asserts no `require` from `forge/` into `dev/`. Release script excludes `dev/` from the subtree push. Skillforge is a `git-subdir` pointer at `forge/`, not the repo root, so `dev/` is not reachable from the install path. |
| `/forge-dev:release` corrupts a release mid-flight | Script is idempotent; each step detects prior completion. Two interactive confirmation gates. Never auto-pushes. |
| `/forge-dev:add-schema` overwrites existing work | Scaffolder refuses on collision — aborts with a diff of what it would have written. No destructive edits. |
| Skills trigger too often / pollute every edit | Skill frontmatter uses tight path globs so each only activates on its target file patterns. If a skill proves noisy, tune the glob or downgrade to a reference doc the other skills link to. |
| CLAUDE.md drifts from actual layout | Release script step 0 runs a CLAUDE.md layout audit (grep the decision-table paths and assert they exist) before any other step. |

**Full rollback:** delete `dev/` and `.claude/commands/forge-dev/`,
`.claude/skills/forge-dev/`; revert the CLAUDE.md section. Zero impact on
`forge/` or `.forge/`.

## 13. Acceptance criteria

- [ ] `dev/` directory exists with the structure in §4.
- [ ] `.claude/commands/forge-dev/` and `.claude/skills/forge-dev/`
      wrappers exist and `@`-ref `dev/` content.
- [ ] CLAUDE.md documents the three-layer model and extends the decision
      table.
- [ ] `/forge-dev:release` completes an end-to-end release on a fixture
      repo in dry-run mode with zero manual steps beyond the two gates.
- [ ] `/forge-dev:add-schema` produces a diff identical to a hand-written
      schema addition (verified against the v0.18.0 additions replayed
      from scratch).
- [ ] The three skills activate on their target paths and quote their
      reference docs verbatim.
- [ ] Guard test asserts `forge/` never `require`s from `dev/`.
- [ ] `node --test` across all four test roots passes.
- [ ] A `git subtree split --prefix=forge/ main` dry-run produces a tree
      that does not contain `dev/`.

## 14. Out-of-band artifacts

- `docs/plans/README.md` — add Plan 6 to the sequencing list; note that it
  is sequenced independently of 1–5 because it is contributor-only and
  does not gate user releases.
- No migrations.json entry (no user-facing change).
- No integrity.json churn (no `forge/` churn).
- No security scan (nothing new under `forge/`).

---

## 15. Relationship to Plans 1–5

Plan 6 does not add architecture. It **codifies** the architecture Plans 1–5
already shipped, turning each plan's core invariant into a guardrail or
automation that the *next* plan will inherit for free.

| Plan 1–5 invariant | Plan 6 codification |
|---|---|
| Persona/skill by reference | `injection-pipeline` skill + `injection-map.md` |
| Artifact summaries in task manifest | `injection-pipeline` skill + `injection-map.md` |
| Gate-check enforcement | *(deferred to second wave: `gate-first-phases` skill)* |
| Context pack | `injection-pipeline` skill + `injection-map.md` |
| Write-boundary schema enforcement | `schema-as-contract` skill + `/forge-dev:add-schema` command + `store-layout.md` |
| Two-layer architecture (cross-cutting) | `two-layer-boundary` skill + three-layer CLAUDE.md update |
| Release methodology (cross-cutting) | `/forge-dev:release` + `release-checklist.md` |

Every future plan gets a pre-written harness for the parts that are
boilerplate, and a pre-written check for the parts that are easy to forget.
