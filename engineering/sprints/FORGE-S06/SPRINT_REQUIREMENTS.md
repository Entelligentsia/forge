# Sprint Requirements — FORGE-S06

**Captured:** 2026-04-14
**Source:** sprint-intake interview
**Feature:** null (standalone remediation sprint)

---

## Goals

1. **Correct agent identity announcement** — Every spawned subagent's first output is exactly `{emoji} **Forge {AgentNoun}** — {TaskID} · {tagline} [{resolved_model}]` with all five fields correct. Currently: wrong agent (Architect doing PM work), missing tagline in some phases, model not shown, persona strings hardcoded in workflow files rather than loaded from composable persona files.
2. **Store integrity** — `store.cjs --fix` leaves no ghost event files and all backfilled events persist correctly.
3. **Friction-free upgrades** — `forge:update` no longer halts on a false breaking-change confirmation when all model values are standard Forge aliases.
4. **Human-readable sprint and task directories** — Folder names carry an ID-slug (e.g., `FORGE-S06-T01-fix-persona-lookup`) end-to-end: schema, creation tooling, discovery, and collation all agree.

---

## In Scope

### 1. Correct agent identity announcement [must-have]

Unified acceptance criterion for all persona/orchestrator fixes (closes #27 D1–D4, #30):

Every phase spawned by the orchestrator announces itself with:
```
{emoji} **Forge {AgentNoun}** — {TaskID} · {tagline} [{resolved_model}]
```

**To get there — these source changes are required:**

**1a. Sprint intake persona reassignment** (`meta-sprint-intake.md`)
- Persona block reassigned from Architect → Product Manager (`🌸`)
- Sprint *planning* stays with Architect; requirements *capture* moves to PM
- Acceptance: generated `architect_sprint_intake.md` (or renamed `pm_sprint_intake.md`) declares PM persona

**1b. Orchestrator persona file lookup fix** (`meta-orchestrate.md`)
- `read_file(f".forge/personas/{phase.role}.md")` replaced with noun-based lookup using PERSONA_MAP
- Explicit role→noun mapping table added to Generation Instructions (e.g., `"plan" → "engineer"`, `"approve" → "architect"`)
- `skill_content` lookup updated consistently
- Acceptance: generated `orchestrate_task.md` uses noun filenames; no dead lookup against `plan.md`, `approve.md` etc.

**1c. Pure-process workflow files** (all meta-workflows in `forge/meta/workflows/`)
- `## Persona` sections removed from meta-workflow templates
- Persona is injected at spawn time from `.forge/personas/{noun}.md`, not baked into the workflow file
- Acceptance: no `## Persona` section in any generated `.forge/workflows/*.md`

**1d. `forge:regenerate` personas target** (`forge/commands/regenerate.md`, generation tooling)
- Default run (`/forge:regenerate` with no args) now includes `personas` target
- Focused per-persona regeneration supported: `/forge:regenerate personas engineer`
- Regeneration produces `.forge/personas/{noun}.md` correctly from meta-persona templates
- Lays groundwork for future `forge:calibrate` without implementing it
- Acceptance: after `/forge:regenerate`, `.forge/personas/` exists with one file per persona noun; default run no longer silently skips personas

**1e. Model announced in phase header**
- `resolved_model` included in the announcement line emitted by the orchestrator
- Acceptance: announcement line includes the model ID or alias used for the phase

---

### 2. Ghost event file fix [must-have] (#28)

`store.cjs` `writeEvent` and `--fix` path:

- `writeEvent` must not create a new file when an event with a mismatched filename already exists on disk; it must rename/overwrite the existing file
- `--fix` persists event backfills by renaming the on-disk file to match the canonical `eventId`, not by writing a second file
- Acceptance: running `validate-store --fix` on a store with mismatched event filenames leaves exactly one file per event, named correctly; no orphaned originals remain

---

### 3. False breaking-change suppression [must-have] (#29)

`forge:update` migration step for model field changes:

- When all model values in `.forge/config.json` pipeline fields contain only standard Forge aliases (`sonnet`, `opus`, `haiku`) or are absent, the breaking-change manual confirmation step is skipped automatically
- The step only halts when a genuinely non-standard value (a raw model ID or unknown alias) is detected
- Acceptance: upgrading a project whose config contains only `sonnet`/`opus`/`haiku` completes without a manual confirmation prompt

---

### 4. Sprint + task folder slug naming [must-have]

End-to-end foolproof solution — observed real deviation when a sprint was created with an `ID-slug` folder name and tools broke:

**4a. Sprint schema: add `path` field** (`forge/schemas/sprint.schema.json`)
- Add required `path` field (string) — parity with task schema
- Acceptance: `validate-store` accepts sprint records with `path`; warns on sprints missing `path`

**4b. `seed-store.cjs`: slug-aware discovery and path construction**
- Discovery regex updated to match `FORGE-SNN-*` and `TNN-*` (or `FORGE-SNN-TNN-*`) patterns, not just bare `S\d+` / `T\d+`
- Slug auto-derived from `title` at creation time (lower-kebab-case, truncated to ~30 chars)
- Sprint `path` field populated at seed time
- Acceptance: `seed-store` correctly seeds a store from a directory named `FORGE-S06-post-07-feedback/` containing `T01-fix-persona-lookup/`

**4c. `collate.cjs`: path resolution updated**
- Resolves sprint path from `sprint.path` field (same as task path resolution)
- Falls back to ID-based discovery for legacy stores
- Acceptance: `collate` generates correct `MASTER_INDEX.md` for a store with slug-named directories

**4d. `validate-store.cjs`: discovery updated**
- Filesystem walk updated to find slug-named sprint and task directories
- Referential integrity checks use `path` field on sprints
- Acceptance: `validate-store` passes on a store with slug-named directories; no false positives

---

## Out of Scope

- `forge:calibrate` new command (#33) — persona regeneration groundwork laid by 1d, but the calibrate command itself is a separate sprint
- `forge:health` calibration baseline checks (#34)
- Hard model directive portability for non-Claude runtimes (#26)
- `add-task` mid-sprint workflow (#31)
- Surgical migration context in `migrations.json` (#32)
- Auto-generate concept lifecycle diagrams (#22)
- Modifying persona voice or personality content
- Running `forge:regenerate` on this dogfooding project as part of sprint work

---

## Nice-to-Have

- None identified — all items above are must-haves

---

## Constraints

- **Plugin compatibility:** must not break users on v0.6.x stores; slug naming must be additive (legacy bare-ID dirs still discovered via fallback)
- **Distribution:** all changes are to `forge/` — version bump, `migrations.json` entry, and security scan required before release
- **Dependencies:** Node.js built-ins only; no new npm packages
- **Regeneration impact:** `forge:regenerate` default behaviour change requires a `"workflows"` + `"personas"` entry in `regenerate` list in the migration record
- **Schema change:** sprint `path` field addition is additive (nullable/optional initially); `validate-store` warns, not errors, on missing `path` for existing sprints

---

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| PERSONA_MAP role→noun mapping misses a role, causing silent lookup failure at spawn time | Medium | Enumerate all pipeline phase roles exhaustively in the map; add fallback to role literal with a warning |
| slug-named directory discovery regex too broad — matches unrelated directories | Low | Anchor regex to `{PREFIX}-SNN` pattern; require prefix match from config |
| `--fix` rename clobbers a valid event file with a conflicting name | Low | Check for collision before rename; error explicitly rather than overwriting silently |
| Sprint `path` field migration — existing sprints have no `path` in store JSON; collate falls back but validate-store may warn noisily | Medium | Migration entry includes a backfill step; `validate-store` warns rather than fails for missing `path` |

---

## Carry-Over from FORGE-S05

| Item | Status | Notes |
|---|---|---|
| FORGE-S05-T08 — Create task prompt | Planned | Still at 📋 planned; not a blocker for S06 |
| `.forge/personas/` generation | Never shipped | Specced in S05 but forge:regenerate default never included personas target; addressed in S06 item 1d |
| Orchestrator persona injection | Partial | PERSONA_MAP added to source for announcements; file lookup still broken; fully fixed in S06 item 1b |
