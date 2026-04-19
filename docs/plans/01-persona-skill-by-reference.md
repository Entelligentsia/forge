# Plan 1 — Persona/Skill by Reference

**Category:** Token Economy (primary), Speed (secondary)
**Target version:** minor bump after Plan 3 ships
**Estimated effort:** 3–4 engineer days
**Breaking:** No (env-flag rollback; old inline path preserved for one version)

---

## 1. Problem

`meta-orchestrate.md:332–368` and `meta-fix-bug.md:166–195` read the full
persona markdown file (e.g. `meta-engineer.md` — 51 lines) and the full skill
file and inject both verbatim into every subagent prompt. Across a 10-task
sprint with ~18 phase spawns per task and ~479 total lines across 8 persona
files, this results in ~15,000+ tokens of repeated persona boilerplate per
sprint — tokens that carry no per-task information.

## 2. Goal

Replace verbatim inline injection with a compact "persona reference":
`{id, summary, responsibilities[], outputs[], file_ref}`. The full persona
file remains on disk; the subagent is told where to find it if it needs
deeper context. Target: ≥30% reduction in average subagent prompt size.

## 3. Scope

**In scope:**
- YAML frontmatter on all 8 persona files and 8 skill files
- `build-persona-pack.cjs` tool that compiles frontmatter into `.forge/cache/persona-pack.json`
- Prompt template changes in `meta-orchestrate.md` and `meta-fix-bug.md`
- `FORGE_PROMPT_MODE={reference|inline}` env flag, default `reference`, with `inline` as one-version rollback path
- Regeneration of the persona pack triggered by `/forge:regenerate` and `/forge:materialize`

**Out of scope:**
- Rewriting persona prose (frontmatter is additive; prose stays for human readers)
- Merging the `generic-skills.md` base into persona skills (separate cleanup)
- Caching strategy beyond a single JSON file

## 4. Files to touch

| File | Change |
|---|---|
| `forge/meta/personas/meta-*.md` (8 files) | **Add frontmatter**; prose unchanged |
| `forge/meta/skills/meta-*.md` (8 files) | **Add frontmatter**; prose unchanged |
| `forge/tools/build-persona-pack.cjs` | **NEW** |
| `forge/tools/__tests__/build-persona-pack.test.cjs` | **NEW** |
| `forge/commands/regenerate.md` / `materialize.md` | Call the pack builder |
| `forge/meta/workflows/meta-orchestrate.md` | Replace inline persona/skill injection with reference-mode prompt |
| `forge/meta/workflows/meta-fix-bug.md` | Same |
| `forge/hooks/` | If hooks touch prompt composition, update there too (grep first) |
| `forge/.claude-plugin/plugin.json` | Version bump |
| `forge/migrations.json`, `CHANGELOG.md`, `forge/integrity.json`, `forge/commands/health.md` | Standard release checklist |

## 5. Frontmatter schema

Prepend to each persona file (example: `meta-engineer.md`):

```yaml
---
id: engineer
role: engineer
summary: >
  Implements task plans with test-first discipline and concise commits.
  Escalates when the plan is ambiguous rather than guessing.
responsibilities:
  - Execute approved PLAN.md step by step
  - Write or update tests before behavior changes
  - Keep PROGRESS.md current per phase
  - Produce CODE_CHANGES.md summarizing diffs and rationale
outputs:
  - PROGRESS.md
  - CODE_CHANGES.md
  - test files matching project conventions
file_ref: .forge/personas/engineer.md
---
```

Skills use the same shape with an added `capabilities` field:

```yaml
---
id: engineer-skills
applies_to: [engineer]
summary: Concrete capabilities an engineer persona must use to execute a task.
capabilities:
  - Read PLAN.md and resolve acceptance criteria
  - Run the project's test suite and parse results
  - Emit structured PROGRESS updates
file_ref: .forge/skills/engineer-skills.md
---
```

**Validation rule:** if a persona file lacks frontmatter, the pack builder
fails loudly with a path-specific error. No silent empty summaries.

## 6. Pack format — `.forge/cache/persona-pack.json`

```json
{
  "version": 1,
  "built_at": "2026-04-19T…Z",
  "source_hash": "sha256:…",
  "personas": {
    "engineer": {
      "role": "engineer",
      "summary": "…",
      "responsibilities": ["…"],
      "outputs": ["…"],
      "file_ref": ".forge/personas/engineer.md"
    }
  },
  "skills": {
    "engineer-skills": { "applies_to": ["engineer"], "summary": "…", "capabilities": ["…"], "file_ref": "…" }
  }
}
```

`source_hash` is sha256 over the sorted list of `(path, mtime, size)` of all
source files — used by `/forge:health` to detect a stale pack.

## 7. Prompt template change

**Before** (reconstructed from `meta-orchestrate.md:336–363`):

```
You are acting as the {role}.

--- persona ---
{entire contents of meta-{role}.md}
--- end persona ---

--- skill ---
{entire contents of meta-{role}-skills.md}
--- end skill ---

Task context: …
```

**After (reference mode, default):**

```
You are acting as the {role}.

Persona: {id} — {summary}
Your responsibilities:
- {responsibility 1}
- {responsibility 2}
…
Your outputs: {outputs, comma-separated}

Skill capabilities you have available:
- {capability 1}
- {capability 2}
…

Full persona definition: {file_ref}. Full skill definition: {skill file_ref}.
Read these only if the task requires deeper behavioural context than the
summary above provides.

Task context: …
```

**Rollback mode** (`FORGE_PROMPT_MODE=inline`): unchanged behaviour,
verbatim injection.

## 8. Tests (write failing first)

### `build-persona-pack.test.cjs`

- Builds a pack from a fixture directory containing two personas; round-trips
  every frontmatter field.
- Missing frontmatter → builder throws with the offending file path in the
  error message.
- Malformed YAML → clear error, not a crash.
- `source_hash` is stable across runs on identical inputs and changes when
  any source file changes.
- Pack file is written atomically (write to `.tmp`, rename).

### Workflow smoke tests (add to existing orchestrator integration fixtures, if any)

- With `FORGE_PROMPT_MODE=reference` (default), the composed prompt contains
  the persona summary line and does NOT contain the full persona prose.
- With `FORGE_PROMPT_MODE=inline`, the composed prompt contains the full
  persona prose (backward compat).

## 9. Rollout & measurement

1. Land Plan 3 first so gate-check safety net is in place.
2. Ship this plan with `FORGE_PROMPT_MODE=reference` default.
3. On a reference sprint (10 tasks), capture avg prompt token count per
   subagent spawn before and after. Target: ≥30% reduction.
4. If regression is reported, document `FORGE_PROMPT_MODE=inline` as the
   escape hatch in release notes.
5. One version later, remove the `inline` branch and the env flag.

## 10. Risks & rollback

| Risk | Mitigation |
|---|---|
| Subagent makes worse decisions without full persona prose | Persona summary + responsibilities + outputs carry the load-bearing signals; full file is one `Read` away. Measure on reference sprint before declaring ship-ready. |
| Frontmatter drifts from prose | Add a linter check (optional, later): if `summary` line is missing from the prose H1 paragraph, warn. |
| Stale pack used because `/forge:regenerate` not run after upgrade | `/forge:health` compares `source_hash` and flags staleness. Migration entry lists `regenerate: ["personas"]` so `/forge:update` prompts the user. |

**Full rollback:** set `FORGE_PROMPT_MODE=inline`. No persisted state to
revert. Frontmatter additions are backward compatible with any tool that
reads the prose.

## 11. Acceptance criteria

- [ ] All 16 persona + skill files have valid frontmatter.
- [ ] `build-persona-pack.cjs` builds `.forge/cache/persona-pack.json` deterministically.
- [ ] Default prompt mode is `reference`; `inline` mode is reachable via env flag.
- [ ] New tests pass; all 241 existing tests still pass.
- [ ] `/forge:health` detects a stale pack and advises rebuild.
- [ ] Reference-sprint measurement shows ≥30% avg prompt token reduction.

## 12. Out-of-band artifacts

- `forge/migrations.json`: `regenerate: ["personas", "workflows"]`,
  `breaking: false`, `manual: ["Run /forge:regenerate to rebuild the persona pack."]`
- `CHANGELOG.md` entry.
- `forge/tools/build-manifest.cjs` mapping table updated if any persona/skill
  file is added, renamed, or removed (frontmatter-only edits do NOT require
  manifest rebuild).
- Security scan saved to `docs/security/scan-v{VERSION}.md`.
