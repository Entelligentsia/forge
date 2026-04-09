# Sprint Requirements — FORGE-S03

**Captured:** 2026-04-09
**Source:** design conversation
**Sprint title:** Lean Migration Architecture

---

## Goals

1. The `tools` regeneration target is eliminated. Tools ship with the plugin and have never needed per-project regeneration — this target was always a misnomer for schema copying.
2. `validate-store.cjs` is fully self-contained: store schemas are embedded directly in the tool, removing the dependency on `.forge/schemas/` being present.
3. Migration entries carry granular sub-targets (`workflows:plan_task`, `knowledge-base:architecture`) so that multi-version upgrades regenerate only the files that actually changed — not the entire category.
4. The 0.6.0 migration entry is retroactively corrected to reflect what actually changed (sprint_intake and sprint_plan workflows only), preventing unnecessary full-workflow regeneration across all installed projects.

## Background

Three architectural observations surfaced during design review:

**Observation 1 — Tool specs are internal design documents.**
Tool specs in `forge/meta/tool-specs/` were originally generation inputs. Since Forge moved to pre-built CJS tools distributed with the plugin, these are now design documents only. The JSON Schema blocks embedded in `forge/meta/store-schema/*.md` were extraction sources for `.forge/schemas/` during init — this role is now obsolete.

**Observation 2 — Regeneration is too coarse.**
`"regenerate": ["workflows"]` triggers a full rebuild of all workflow files even when only one or two changed. For a project with 7 instances, a 0.4→0.6.1 upgrade would regenerate every workflow at every hop. The migration format needs granular sub-targets, and the aggregator in `/forge:update` must union them correctly across multi-hop paths (bare `"workflows"` dominates any `"workflows:X"` entries — full rebuild wins).

**Observation 3 — `.forge/schemas/` is an unnecessary generated artifact.**
`validate-store.cjs` already has embedded fallback field lists. Promoting these to full embedded JSON schemas eliminates the dependency, simplifies init (Phase 8 removed), and makes the tool work correctly even on fresh projects before any migration runs.

## In Scope

### 1. Eliminate tools regenerate target [must-have]

- `validate-store.cjs` — embed full JSON schemas (task, sprint, bug, event, feature) using the canonical definitions from `forge/meta/store-schema/*.md`; remove `loadSchema()` and all `.forge/schemas/` file reads
- `init.md` — remove Phase 8 (schema copy to `.forge/schemas/`)
- `regenerate.md` — remove the `tools` category section
- `update.md` — remove all references to `tools` in regeneration language
- `forge/meta/store-schema/*.md` — remove "emitted verbatim to `.forge/schemas/` during init" language; reframe as design documents

### 2. Granular migration target format [must-have]

**Format:** `"category:sub-target"` using colon delimiter
- `"workflows:plan_task"` → regenerates only `.forge/workflows/plan_task.md`
- `"knowledge-base:architecture"` → regenerates only the architecture sub-target
- Bare `"workflows"` → full category rebuild (legacy; dominates in aggregation)
- `"commands"` → atomic, unchanged

**Aggregation rule (multi-hop upgrades):**
- Union of all sub-targets across the migration path
- A bare category entry anywhere in the path short-circuits to full rebuild for that category
- Each category rebuilt at most once

**Parser changes:**
- `update.md` — Step 4 dispatch splits on `:`, invokes `regenerate.md` with specific sub-target when present
- `regenerate.md` — each category handler accepts an optional named sub-target

**migrations.json corrections:**
- Strip `"tools"` from every past entry that lists it
- Correct 0.5.9→0.6.0 entry: change `["tools", "workflows"]` to `["workflows:sprint_intake", "workflows:sprint_plan"]` (only these two workflows changed in S02)
- Add 0.6.0→0.6.1 entry (no user-facing regeneration needed)

### 3. Version bump to 0.6.1 [must-have]

- Bump `forge/.claude-plugin/plugin.json` to `0.6.1`
- Security scan per CLAUDE.md; report saved to `docs/security/scan-v0.6.1.md`
- Security scan history table in README.md updated
- Release commit

## Out of Scope

- Granular sub-targets for `commands` (already atomic)
- Removing old `.forge/schemas/` directories from existing projects (left as inert dead files; not harmful)
- Any changes to store schema definitions (the schemas are only moving from `.forge/schemas/` into the tool itself)
- New workflow content

## Constraints

- **Node.js built-ins only.** No new npm packages.
- **Backwards compatibility:** Old migration entries with bare `"workflows"` must continue to trigger full rebuilds. No existing upgrade paths break.
- **Validate-store must degrade gracefully** if somehow called with an older embedded schema version — existing fallback logic is acceptable as safety net.
- **Zero user-facing regeneration for 0.6.1.** The changes are internal to the plugin; no workflow or knowledge-base files change for users.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Embedded schemas in validate-store drift from meta/store-schema MDs over time | Medium | The MDs remain canonical; the embedded schemas are derived from them. A future health check can detect drift. |
| Retroactively correcting 0.6.0 migration entry breaks upgrade paths for the handful of 0.6.0 installers | Low | User base is minimal and publisher has not self-installed. Correction is safe. |
| Colon format introduces edge cases in aggregation (e.g. same sub-target listed twice) | Low | Deduplication is already required by existing spec; extend to sub-targets. |
