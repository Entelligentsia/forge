# Feature: Fast-Mode Init with Subagent-Distributed Lazy Scaffolding

> Feature ID: FEAT-003
> Status: 〇 implemented
> Created: 2026-04-17
> Target version: 0.12.0

## Description

Introduce `/forge:init --fast`, a variant that finishes in ~30s (plus Phase 2
user interaction) by running only structural phases upfront and deferring all
heavy LLM generation to first use. Each subagent is responsible for checking
and building its own scaffolding when it is invoked — matching Forge's
existing decentralised execution model. No upfront preflight gate in the
orchestrator.

Today `/forge:init` runs 12 phases and takes ~3–15 min because phases 3–8 do
heavy LLM generation in parallel (KB docs, personas, skills, templates,
workflows, orchestration). Users who want to start working immediately have
no way to defer that cost.

## Requirements

### Core behaviour

- `/forge:init --fast` runs phases 1, 2, 9, 10, 12 in full; writes a KB
  skeleton for phase 3; writes stub workflow files for phase 7; skips phases
  4, 5, 6, 8; runs a fast-mode-specific smoke test for phase 11.
- Every stub `.forge/workflows/{id}.md` carries a self-ensure boilerplate:
  on first invocation the subagent reads `lazy-materialize.md`, materialises
  its transitive dep closure, self-replaces the stub with the real workflow,
  and re-reads the file to execute.
- Warmup scope per first-use is **strict closure** — only what this workflow
  needs (its persona, its skills, its templates, its direct sub-workflows,
  its KB docs). No opportunistic sister-gen.
- Concurrent double-gen is accepted (last-write-wins; content is deterministic
  given the same brief). No file locks.

### Dependency graph

- New `deps:` YAML block in every `forge/meta/workflows/meta-*.md` declaring
  logical edges: `personas`, `skills`, `templates`, `sub_workflows`,
  `kb_docs`, `config_fields`. Logical names only — no filesystem paths.
- `forge/tools/build-manifest.cjs` parses these and emits an `edges.workflows`
  section into `forge/schemas/structure-manifest.json`.
- All 17 meta workflows receive frontmatter in one commit.
- CI test asserts every meta workflow has a non-empty `personas:` list.

### Lazy-materialise rulebook

- New file: `forge/init/generation/lazy-materialize.md`.
- Reads `structure-manifest.json` edges; BFS transitive closure from the
  target workflow id.
- Uses `forge/tools/ensure-ready.cjs` for missing-list classification
  (missing / stubbed / pristine / modified — reuses `checkNamespaces` and
  `generation-manifest check`).
- Topological fan-out: KB → personas → skills → templates → atomic
  workflows → orchestration. Brief rebuilt between layers via
  `build-init-context.cjs` (critical because personas hardcode stack cmds
  and workflows embed persona content verbatim).
- Per-layer fan-out reuses existing single-file-capable rulebooks
  (`generate-kb-doc.md`, `generate-persona.md`, `generate-skill.md`,
  `generate-template.md`, `generate-workflows.md`).

### New tool and command

- New: `forge/tools/ensure-ready.cjs` — CLI + library for closure and
  missing-list queries. Exports `computeClosure(manifest, workflowId)`.
- New: `forge/commands/materialize.md` — `/forge:materialize [category [item]]`
  is a separate verb from `/forge:regenerate` (fills missing without
  overwriting pristine; regenerate rebuilds regardless).

### Regenerate extensions

- Add per-file scoping for `skills` and `templates` to
  `forge/commands/regenerate.md`, parallel to the existing per-file scoping
  for `workflows` and `personas`.
- After a successful default all-category regenerate, flip `.forge/config.json`
  `mode` from `"fast"` to `"full"`.

### Config flag

- New optional field in `.forge/config.json`: `mode: "fast" | "full"`.
- Written by Phase 1 in fast mode; flipped by `/forge:regenerate` default or
  `/forge:materialize --all`.
- Schema change in `forge/schemas/sdlc-config.schema.json`.

### Smoke test

- Phase 11 branches on `config.mode`. Fast-mode invariants:
  - `.forge/config.json` validates, includes `mode: "fast"`.
  - `.forge/schemas/` has all `.schema.json` files.
  - `.claude/commands/` has all 13 wrappers.
  - `.forge/workflows/` has all 18 stubs, each starting with the
    `<!-- FORGE FAST-MODE STUB -->` sentinel.
  - `structure-manifest.json` has non-empty `edges.workflows`.
  - KB dir has skeleton; Tomoshibi block present in CLAUDE.md.
- Stubs are NOT recorded in `generation-manifest.json` — they appear as
  "missing" to `check`, forcing lazy gen on first use.

### Tests

- New: `forge/tools/__tests__/ensure-ready.test.cjs` — closure computation,
  missing-list assembly, `{KB_PATH}` resolution, exit codes for each state.
- New fixture: `forge/tools/__tests__/fixtures/meta-with-deps.md`.
- Update: `build-manifest.test.cjs` — parseMetaDeps cases, edges emission
  assertion.
- Update: `check-structure.test.cjs` — fast-mode branch.
- All existing 241 tests remain green.

### Version and migration

- Bump `forge/.claude-plugin/plugin.json` to 0.12.0.
- Add `forge/migrations.json` entry from 0.11.3; `regenerate: []`,
  `breaking: false`, `manual: []`. Existing users keep full artifacts —
  fast path is opt-in at future `--fast` inits.
- `CHANGELOG.md` entry (prepend).
- Security scan saved to `docs/security/scan-v0.12.0.md`; update
  `docs/security/index.md` and README Security table.
- Run `node forge/tools/build-manifest.cjs --forge-root forge/` after meta
  changes to refresh `structure-manifest.json`.

## Non-goals (explicitly deferred)

- Pre-warming on a background thread after fast-init completes.
- Materialise-on-install (auto-run `/forge:materialize` at plugin install).
- Partial-materialise progress UI beyond per-layer banners.
- Making `/forge:regenerate` idempotent against pristine state (that's the
  distinct `/forge:materialize` verb).
- Parallelising materialisation across workflow closures spawned from
  different subagents (each subagent handles its own).

## Risks

### Cross-phase bake-in

Personas hardcode stack cmds from Phase 1 config; workflows embed personas
verbatim at generation time; templates hardcode entity names from
MASTER_INDEX. Lazy-materialize MUST rebuild `.forge/init-context.md` between
namespace layers — without it, a persona generated before MASTER_INDEX has
entities will bake stale content. Mitigation: explicit brief-rebuild step
documented in rulebook, with a non-empty-sections assertion before fan-out.

### Stub pollution in generation-manifest

If Phase 7-fast records stub hashes, later materialise would show as
"modified". Mitigation: Phase 7-fast writes stubs WITHOUT manifest records;
`check` returns exit 3 (missing), forcing gen; real hash is recorded on
first materialise.

### `workflow-gen-plan.json` drift

Phase 7-fast enumerates this file for workflow ids. If edited without
rebuild, stubs drift from reality. Mitigation: smoke asserts stub set
matches plan; documented as an invariant.

### Fast → full skew across plugin versions

If a user stays in fast mode across a plugin upgrade, their edges in
`.forge/schemas/structure-manifest.json` differ from the plugin's new meta
frontmatter. Mitigation: `structure-manifest.json` is copied in Phase 10,
rerun by `/forge:update`. Documented in 0.12.0 migration notes.

### First-use latency visibility

A user running `/plan` for the first time waits 20–60s with minimal output.
Mitigation: stub boilerplate and lazy-materialize rulebook both emit
progress banners (`〇 Materialising <namespace>…`) between layers.

## Reference

Full implementation plan, file-by-file change list, and verification steps:
`/home/boni/.claude/plans/1-yes-2-acceptable-jaunty-bentley.md`
