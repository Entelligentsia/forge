# FORGE-BUG-009 — Analysis

## Bug Summary

**GitHub Issue:** https://github.com/Entelligentsia/forge/issues/40
**Severity:** major
**Root Cause Category:** data-integrity (primary) + business-rule (feature gap)

---

## Problem Statement

There are two related problems:

### 1. Stale generation-manifest entries cause permanent false positives (data-integrity)

When `forge:health` runs `generation-manifest.cjs list --modified`, it reports 14 files
as "× missing":

```
× missing: .forge/personas/plan.md
× missing: .forge/personas/implement.md
× missing: .forge/personas/review-plan.md
× missing: .forge/personas/review-code.md
× missing: .forge/personas/validate.md
× missing: .forge/personas/approve.md
× missing: .forge/personas/commit.md
× missing: .forge/skills/plan-skills.md
× missing: .forge/skills/implement-skills.md
× missing: .forge/skills/review-plan-skills.md
× missing: .forge/skills/review-code-skills.md
× missing: .forge/skills/validate-skills.md
× missing: .forge/skills/approve-skills.md
× missing: .forge/skills/commit-skills.md
```

These are stale entries from the old role-based persona/skill naming scheme (e.g. `plan.md`,
`implement.md`) that was replaced by noun-based names (e.g. `engineer.md`, `supervisor.md`)
in a prior sprint. The regeneration that wrote the noun-based files recorded new entries
but never evicted the old ones.

**Root cause in code:**
- `forge/commands/regenerate.md` — the `personas` and `skills` sections record new manifest
  hashes after writing each file, but never call `generation-manifest.cjs remove` for stale
  entries in the same namespace. Old entries persist indefinitely.
- Confirmed by `generation-manifest.cjs list` output showing 14 "× missing" entries.

### 2. No deterministic structure check exists (business-rule / missing feature)

The plugin has no manifest declaring which files MUST exist in the generated `.forge/` and
`.claude/commands/` trees. When `forge/meta/` evolves (new file, rename, deletion), the
generated output can silently drift with no detection mechanism.

This problem caused the sporadic subagent announcement bug (FORGE-BUG-008): missing persona
files in `.forge/personas/` went undetected until a workflow failed.

---

## Affected Files

| File | Nature | Change Required |
|------|--------|-----------------|
| `forge/tools/generation-manifest.cjs` | Plugin source | Add `clear-namespace` subcommand |
| `forge/commands/regenerate.md` | Plugin source | Add `clear-namespace` call before each target write |
| `forge/tools/build-manifest.cjs` | Plugin source (NEW) | Derive structure-manifest from forge/meta/ |
| `forge/schemas/structure-manifest.json` | Plugin source (NEW — build artifact) | Output of build-manifest.cjs |
| `forge/tools/check-structure.cjs` | Plugin source (NEW) | Check actual FS vs structure-manifest |
| `forge/commands/health.md` | Plugin source | Integrate check-structure |
| `forge/commands/update.md` | Plugin source | Integrate check-structure post-migration (Step 4) |
| `CLAUDE.md` | Docs | Document manifest maintenance requirement |
| `.forge/generation-manifest.json` | Dogfooding instance | Remove 14 stale entries |
| `forge/.claude-plugin/plugin.json` | Plugin manifest | Version bump (0.9.6 → 0.9.7) |
| `forge/migrations.json` | Plugin manifest | Add migration entry |

---

## Naming Convention Map

The naming convention from meta source to generated output is irregular. The following
mapping table must be encoded in `build-manifest.cjs`:

### Personas (6 outputs)
Rule: `forge/meta/personas/meta-{name}.md` → `.forge/personas/{name}.md`
Exclusions: `meta-orchestrator.md`, `meta-product-manager.md` do NOT generate persona files.

| Meta Source | Output |
|-------------|--------|
| meta-architect.md | architect.md |
| meta-bug-fixer.md | bug-fixer.md |
| meta-collator.md | collator.md |
| meta-engineer.md | engineer.md |
| meta-qa-engineer.md | qa-engineer.md |
| meta-supervisor.md | supervisor.md |

### Skills (6 outputs)
Rule: same names as personas but with `-skills.md` suffix.
NOT purely derived from meta-skills files — derived from persona roles.

| Output |
|--------|
| architect-skills.md |
| bug-fixer-skills.md |
| collator-skills.md |
| engineer-skills.md |
| qa-engineer-skills.md |
| supervisor-skills.md |

### Workflows (18 outputs — explicit mapping required)

| Meta Source | Output |
|-------------|--------|
| meta-approve.md | architect_approve.md |
| meta-collate.md | collator_agent.md |
| meta-commit.md | commit_task.md |
| meta-fix-bug.md | fix_bug.md |
| meta-implement.md | implement_plan.md |
| meta-orchestrate.md | orchestrate_task.md |
| meta-plan-task.md | plan_task.md |
| meta-retrospective.md | sprint_retrospective.md |
| meta-review-implementation.md | review_code.md |
| meta-review-plan.md | review_plan.md |
| meta-review-sprint-completion.md | architect_review_sprint_completion.md |
| meta-sprint-intake.md | architect_sprint_intake.md |
| meta-sprint-plan.md | architect_sprint_plan.md |
| meta-update-implementation.md | update_implementation.md |
| meta-update-plan.md | update_plan.md |
| meta-validate.md | validate_task.md |
| (orchestration) | quiz_agent.md |
| (orchestration) | run_sprint.md |

### Templates (8 outputs — explicit mapping)

| Meta Source | Output |
|-------------|--------|
| meta-code-review.md | CODE_REVIEW_TEMPLATE.md |
| meta-plan.md | PLAN_TEMPLATE.md |
| meta-plan-review.md | PLAN_REVIEW_TEMPLATE.md |
| meta-progress.md | PROGRESS_TEMPLATE.md |
| meta-retrospective.md | RETROSPECTIVE_TEMPLATE.md |
| meta-sprint-manifest.md | SPRINT_MANIFEST_TEMPLATE.md |
| meta-sprint-requirements.md | SPRINT_REQUIREMENTS_TEMPLATE.md |
| meta-task-prompt.md | TASK_PROMPT_TEMPLATE.md |

### Commands (13 outputs — direct enumeration from generate-commands.md)

`sprint-intake.md`, `plan.md`, `review-plan.md`, `implement.md`, `review-code.md`,
`fix-bug.md`, `sprint-plan.md`, `run-task.md`, `run-sprint.md`, `collate.md`,
`retrospective.md`, `approve.md`, `commit.md`

### Schemas (5 outputs — walk forge/schemas/*.schema.json)

`bug.schema.json`, `event.schema.json`, `feature.schema.json`, `sprint.schema.json`, `task.schema.json`

---

## Implementation Plan

### Phase A: Fix stale generation-manifest entries (immediate data-integrity fix)

**Step A1:** Add `clear-namespace <prefix>` subcommand to `forge/tools/generation-manifest.cjs`
- Removes all manifest entries whose relative path starts with `<prefix>`
- Reports count: `〇 Cleared N entries matching .forge/personas/`

**Step A2:** Update `forge/commands/regenerate.md`
- In each regeneration target section, before the "For each file being written" loop,
  add: call `generation-manifest.cjs clear-namespace <namespace>` to evict stale entries

**Step A3:** Fix `.forge/generation-manifest.json` in the dogfooding instance
- Remove the 14 stale entries (run `generation-manifest.cjs remove` for each)

### Phase B: Build-manifest tool

**Step B1:** Create `forge/tools/build-manifest.cjs`
- Accepts `$FORGE_ROOT` as first argument, `PROJECT_ROOT` as second (or uses cwd)
- Contains explicit naming mapping table for all targets
- Walks `forge/meta/` source to verify sources exist
- Writes `$FORGE_ROOT/schemas/structure-manifest.json`
- Also reads `forge/commands/*.md` and `forge/schemas/*.schema.json`

**Step B2:** Run `build-manifest.cjs` to generate `forge/schemas/structure-manifest.json`

### Phase C: Check-structure tool

**Step C1:** Create `forge/tools/check-structure.cjs`
- Reads `$FORGE_ROOT/schemas/structure-manifest.json`
- Checks each listed file against actual PROJECT_ROOT filesystem
- Emits: `〇 present: N`, `△ missing: N`, `× extra: N` (extra only with `--strict`)
- Exit 0 all present, exit 1 any missing

### Phase D: Integrate into forge:health

Add a new check to `forge/commands/health.md` (Step 6 or new step after store integrity):
```
node "$FORGE_ROOT/tools/check-structure.cjs"
```
Report missing and extra counts. If gaps exist, include in the health report under
**Generated file structure** with note: "Run `/forge:update` to repair missing files."

### Phase E: Integrate into forge:update

Add structure check to Step 4 (Apply migrations), after all regeneration targets are done:
```
Run check-structure — if gaps remain, offer to repair (re-run regeneration)
```

### Phase F: Documentation

Update `CLAUDE.md` version bump checklist to add:
> After adding/renaming/removing any file in `forge/meta/`, run
> `node forge/tools/build-manifest.cjs` and commit the updated
> `forge/schemas/structure-manifest.json`.

### Phase G: Version bump + migration

- Bump `forge/.claude-plugin/plugin.json`: 0.9.6 → 0.9.7
- Add migration entry to `forge/migrations.json`
- Regenerate `.forge/` targets: `tools` (new tools), `workflows` (health.md, update.md indirect)
  Actually: the tools don't get installed to `.forge/` — they run directly from `$FORGE_ROOT`.
  The migration needs `regenerate: []` since only commands need updating for the health/update
  integration, and those are text-based command files that get regenerated anyway.
  Wait — health.md and update.md are plugin commands, not generated files. Users get updated
  commands automatically when the plugin updates.
  
  The `structure-manifest.json` is a NEW file in `forge/schemas/` — users get it when they
  install the new plugin version.
  
  Migration regenerate targets: `[]` (no regeneration needed — plugin files update on install)

---

## Security Scope

All changes are in `forge/` (plugin source). A security scan is required before commit.

---

## Related Bugs

- FORGE-BUG-008: Sporadic subagent announcements — caused in part by missing persona files
  that this feature would have detected.

---

## Acceptance Criteria

- [ ] `forge/tools/generation-manifest.cjs clear-namespace <prefix>` works correctly
- [ ] `forge/commands/regenerate.md` clears namespace before writing in personas, skills,
  workflows, commands, and templates sections
- [ ] `.forge/generation-manifest.json` has no stale entries (0 × missing)
- [ ] `forge/tools/build-manifest.cjs` derives `structure-manifest.json` from `forge/meta/`
- [ ] `forge/schemas/structure-manifest.json` exists and covers all 6+6+18+8+13+5 = 56 files
- [ ] `forge/tools/check-structure.cjs` exits 1 on missing files, 0 on all present
- [ ] `forge:health` surfaces structure gap count
- [ ] `forge:update` step 4 runs check-structure post-migration
- [ ] CLAUDE.md documents `build-manifest.cjs` run requirement
- [ ] Version bumped 0.9.6 → 0.9.7 with migration entry
- [ ] Security scan passes
