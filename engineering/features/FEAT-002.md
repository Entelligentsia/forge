# Feature: Workflow Fan-Out with Minimal Context Brief

> Feature ID: FEAT-002
> Status: 🔵 active
> Created: 2026-04-16
> Target version: 0.11.0

## Description

Reduce Phase 7 of `/forge:init` from ~16 serial LLM turns (~15 min) to one parallel
wave (~1–2 min) by fanning out 16 Agent subagents, each receiving a small shared
project brief plus its own meta-workflow and persona file.

The current bottleneck is structural: `sdlc-init.md` Phase 7 generates 16 atomic
workflow files sequentially, each turn accumulating context and re-deriving project
facts already known from Phase 1 and Phase 3.

## Requirements

### Core behaviour
- Phase 7 must fan out ALL atomic workflow generations as parallel Agent subagents
  in a SINGLE Agent tool message, not in a loop.
- Each subagent receives only: a compact project brief, its own meta-workflow content,
  its own persona file, and a rule-set (the rewritten generate-workflows.md).
- Each subagent writes exactly one file and records it in the generation manifest.
- Each subagent self-validates: reads back the file it wrote and confirms the first
  line contains the expected persona symbol from the brief.
- Failed subagents are retried once. A second failure halts Phase 7 and surfaces the
  failing ids — no silent partial state.

### Project brief artifact
- File: `.forge/init-context.md` (markdown, ≤150 lines / ≤3 KB)
- Also: `.forge/init-context.json` (same data, machine-readable for Phase 8/9/10)
- Built deterministically by `forge/tools/build-init-context.cjs` (no LLM)
- Built at the START of Phase 7 (after Phases 4/5/6 have produced personas/templates)
- Sections: Commands (verbatim substitutions), Paths, Personas index, Templates list,
  Architecture doc filenames, Domain entities, Installed skill wiring
- Names and paths only — no document contents

### Fan-out table
- New file: `forge/init/workflow-gen-plan.json`
- 15 entries (one per meta-backed atomic workflow); see implementation plan for
  the exact mapping
- 16 entries total including `quiz_agent.md` (meta-quiz-agent.md added in v0.10.1)

### Resume granularity
- `init-progress.json` gains a `phase7.workflows` map: `{id: "pending"|"done"|"failed"}`
- Resume re-runs only non-`done` entries

### Tests
- `forge/tools/__tests__/build-init-context.test.cjs` with ≥6 cases:
  - fixture config + personas + templates + KB → expected markdown snapshot
  - determinism: two runs are byte-identical
  - handles missing installedSkills (empty wiring block)
  - handles custom paths.engineering value
  - reads persona symbol correctly from varied persona file formats
  - excludes README.md from persona and template listings

### No regressions
- All 15 (or 16) workflow files must exist, be non-empty, and start with their persona's symbol
- Phase 11 smoke test must pass end-to-end on a fixture project

## Non-goals (explicitly deferred)
- Parallelising Phases 4/5/6
- Determinising Phases 8/9/10
- Tiered init (`--fast`)
- Lazy generation

## Risks

### quiz_agent.md origin — ✓ RESOLVED (v0.10.1)
`quiz_agent.md` had no meta source (`[null, ...]` in build-manifest.cjs), causing it
to be silently skipped on every init. Fixed by creating `meta-quiz-agent.md` and
wiring it into build-manifest.cjs. quiz_agent is confirmed Phase 7 — it generates
project-specific quiz questions from the KB and belongs in the fan-out with the other
15 atomic workflows.

### Coherence between sibling workflows
Without a shared conversation thread, two workflows that reference the same symbol or
template could use slightly different words. Mitigation: brief is the canonical
vocabulary; subagents may reference only names found in the brief. Phase 11 tightens
to grep-validate references.

### Harness concurrency limits
If the harness throttles 16-wide parallel Agent calls, the fan-out degrades silently
to serialised execution (still correct, not fast). Detection: Phase 7 should emit
wall-clock timing before/after fan-out. Fallback: chunk into four waves of four.
