# PLAN — FORGE-S06-T02: Purify meta-workflows — remove Persona sections, reassign sprint-intake to PM

🌱 *Forge Engineer*

**Task:** FORGE-S06-T02
**Sprint:** FORGE-S06
**Estimate:** M

---

## Objective

Remove all `## Persona` sections from the 16 meta-workflow templates in `forge/meta/workflows/` so that persona content is no longer baked into generated workflow output. For orchestrator-spawned phases, the persona is already injected at spawn time by the orchestrator (T01's noun-based lookup). For standalone command workflows, add a Generation Instruction that the generated workflow must `Read .forge/personas/{noun}.md` as its first step. Also reassign sprint-intake from Architect to Product Manager persona.

## Approach

Two categories of meta-workflows require different treatment:

**Category A — Orchestrator-spawned phases (10 files):** The orchestrator already injects persona content via the symmetric injection pattern (ROLE_TO_NOUN mapping reads `.forge/personas/{noun}.md` and `.forge/skills/{noun}-skills.md`). The `## Persona` section in these meta-workflows is purely redundant — it gets baked into the generated output, creating duplication with the orchestrator's injection. Remove the `## Persona` section entirely from these files. No replacement instruction is needed because the orchestrator handles persona injection.

**Category B — Standalone command workflows (6 files):** These workflows are invoked directly via slash commands, not spawned by the orchestrator. They currently bake persona content inline via the `## Persona` section. Remove the `## Persona` section and add a Generation Instruction telling the generator that the resulting workflow must `Read .forge/personas/{noun}.md` as its first step, where `{noun}` is derived from the persona that was previously declared inline.

**Sprint-intake special case:** Change the persona reference from Architect (`architect.md`) to Product Manager (`product-manager.md`). The meta-sprint-intake workflow also references the Architect persona in its H1 title — change that to reference Product Manager.

### File-by-file changes

**Category A — Orchestrator-spawned (remove `## Persona` section only):**

| File | Current Persona | Action |
|---|---|---|
| `meta-plan-task.md` | Engineer | Remove `## Persona` section (3 lines) |
| `meta-implement.md` | Engineer | Remove `## Persona` section (3 lines) |
| `meta-review-plan.md` | Supervisor | Remove `## Persona` section (3 lines) |
| `meta-review-implementation.md` | Supervisor | Remove `## Persona` section (3 lines) |
| `meta-validate.md` | QA Engineer | Remove `## Persona` section (3 lines) |
| `meta-approve.md` | Architect | Remove `## Persona` section (3 lines) |
| `meta-commit.md` | Engineer | Remove `## Persona` section (3 lines) |
| `meta-update-plan.md` | Engineer | Remove `## Persona` section (3 lines) |
| `meta-update-implementation.md` | Engineer | Remove `## Persona` section (3 lines) |
| `meta-orchestrate.md` | Orchestrator | Remove `## Persona` section (3 lines) |

**Category B — Standalone commands (remove `## Persona`, add Generation Instruction):**

| File | Current Persona → New Noun | Action |
|---|---|---|
| `meta-sprint-intake.md` | Architect → **product-manager** | Remove `## Persona`; change H1 from `🗻` to `🌸` and title; add Generation Instruction to Read `.forge/personas/product-manager.md`; update all references from Architect to Product Manager |
| `meta-sprint-plan.md` | Architect → **architect** | Remove `## Persona`; add Generation Instruction to Read `.forge/personas/architect.md` |
| `meta-retrospective.md` | Architect → **architect** | Remove `## Persona`; add Generation Instruction to Read `.forge/personas/architect.md` |
| `meta-collate.md` | Collator → **collator** | Remove `## Persona`; add Generation Instruction to Read `.forge/personas/collator.md` |
| `meta-fix-bug.md` | Bug Fixer → **bug-fixer** | Remove `## Persona`; add Generation Instruction to Read `.forge/personas/bug-fixer.md` |
| `meta-review-sprint-completion.md` | Architect → **architect** | Remove `## Persona`; add Generation Instruction to Read `.forge/personas/architect.md` |

### Generation Instruction format

For each Category B meta-workflow, add this to the `## Generation Instructions` section:

```markdown
- **Persona Self-Load:** The generated workflow MUST begin by reading `.forge/personas/{noun}.md` as its first step (before any other tool use). This replaces the former inline `## Persona` section. The persona identity line (emoji, name, tagline) should be printed to stdout after reading the file.
```

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/meta/workflows/meta-plan-task.md` | Remove `## Persona` section (lines 10-14) | Orchestrator injects persona |
| `forge/meta/workflows/meta-implement.md` | Remove `## Persona` section (lines 10-14) | Orchestrator injects persona |
| `forge/meta/workflows/meta-review-plan.md` | Remove `## Persona` section (lines 10-13) | Orchestrator injects persona |
| `forge/meta/workflows/meta-review-implementation.md` | Remove `## Persona` section (lines 10-13) | Orchestrator injects persona |
| `forge/meta/workflows/meta-validate.md` | Remove `## Persona` section (lines 10-13) | Orchestrator injects persona |
| `forge/meta/workflows/meta-approve.md` | Remove `## Persona` section (lines 10-13) | Orchestrator injects persona |
| `forge/meta/workflows/meta-commit.md` | Remove `## Persona` section (lines 10-13) | Orchestrator injects persona |
| `forge/meta/workflows/meta-update-plan.md` | Remove `## Persona` section (lines 10-13) | Orchestrator injects persona |
| `forge/meta/workflows/meta-update-implementation.md` | Remove `## Persona` section (lines 10-13) | Orchestrator injects persona |
| `forge/meta/workflows/meta-orchestrate.md` | Remove `## Persona` section (lines 3-7) | Orchestrator injects its own persona at runtime |
| `forge/meta/workflows/meta-sprint-intake.md` | Remove `## Persona`; reassign to Product Manager; add Persona Self-Load instruction | Standalone command needs self-load; PM is the correct persona for intake |
| `forge/meta/workflows/meta-sprint-plan.md` | Remove `## Persona`; add Persona Self-Load instruction | Standalone command needs self-load |
| `forge/meta/workflows/meta-retrospective.md` | Remove `## Persona`; add Persona Self-Load instruction | Standalone command needs self-load |
| `forge/meta/workflows/meta-collate.md` | Remove `## Persona`; add Persona Self-Load instruction | Standalone command needs self-load |
| `forge/meta/workflows/meta-fix-bug.md` | Remove `## Persona`; add Persona Self-Load instruction | Standalone command needs self-load |
| `forge/meta/workflows/meta-review-sprint-completion.md` | Remove `## Persona`; add Persona Self-Load instruction | Standalone command needs self-load |

## Plugin Impact Assessment

- **Version bump required?** Yes — structural change to all 16 meta-workflow templates changes generated workflow output
- **Migration entry required?** Yes — `regenerate: ["workflows"]` — users must regenerate workflows to remove inline `## Persona` sections from their generated output
- **Security scan required?** Yes — any change to `forge/` requires a scan
- **Schema change?** No — no JSON schema changes

## Testing Strategy

- Syntax check: N/A (all modified files are Markdown)
- Store validation: `node forge/tools/validate-store.cjs --dry-run` (no schema changes, but verify store integrity)
- Manual verification: After regeneration, confirm no `## Persona` section exists in any `.forge/workflows/*.md`

## Acceptance Criteria

- [ ] No `## Persona` section exists in any `forge/meta/workflows/meta-*.md` file
- [ ] All 10 orchestrator-spawned meta-workflows have no persona-related content (removed cleanly, no Generation Instruction added)
- [ ] All 6 standalone command meta-workflows have a `**Persona Self-Load:**` Generation Instruction referencing the correct `.forge/personas/{noun}.md` file
- [ ] `meta-sprint-intake.md` references Product Manager persona (`product-manager.md`) instead of Architect, and H1 uses 🌸 emoji
- [ ] No `## Persona` section in any generated `.forge/workflows/*.md` (verified after regeneration)
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0
- [ ] Version bumped in `forge/.claude-plugin/plugin.json`
- [ ] Migration entry added to `forge/migrations.json`

## Operational Impact

- **Distribution:** Users must run `/forge:update` to regenerate all workflows. The generated workflows will change — `## Persona` sections will be removed and standalone workflows will gain a self-load instruction.
- **Backwards compatibility:** No breaking change. The orchestrator already injects persona content, so removing the inline `## Persona` from orchestrator-spawned workflows doesn't affect functionality. Standalone workflows gain a self-load step which is additive.