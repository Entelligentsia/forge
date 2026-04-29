# /forge:regenerate

**Category:** Forge plugin command  
**Run from:** Any Forge-initialised project directory

---

## Purpose

Re-runs generation phases to refresh project artifacts from the current state of the plugin meta-definitions and knowledge base. Different categories have different modes — full rebuild for deterministic targets, merge-only for the knowledge base.

---

## Invocation

```bash
/forge:regenerate                              # default: workflows + templates
/forge:regenerate workflows                    # atomic workflows + orchestration
/forge:regenerate templates                    # document templates
/forge:regenerate tools                        # engineering/tools/
/forge:regenerate knowledge-base               # all three KB sub-targets (merge mode)
/forge:regenerate knowledge-base architecture
/forge:regenerate knowledge-base business-domain
/forge:regenerate knowledge-base stack-checklist
```

---

## Categories

### `workflows` — full rebuild

Re-generates `.forge/workflows/` from meta-workflow definitions and the current knowledge base. Covers atomic workflows (Phase 5) and orchestration (Phase 6).

**When to run:** After KB enrichment has accumulated across several sprints; after adding a custom pipeline via `/forge:add-pipeline`; after a Forge update that changes meta-workflow definitions.

**Does NOT touch:** `.claude/commands/`, `engineering/tools/`, `.forge/config.json`, knowledge base.

---

### `templates` — full rebuild

Re-generates `.forge/templates/` from meta-template definitions.

**When to run:** After significant KB changes that should be reflected in plan/review document formats.

---

### `tools` — full rebuild

Re-generates `engineering/tools/` from tool specs and `config.json`. Safe to rebuild from scratch — inputs are fully deterministic.

**When to run:** After a new tool spec is added (e.g., after a Forge update); if the project switches primary language.

---

### `knowledge-base` — merge mode

**This is not a full rebuild.** The KB accumulates writeback across sprints — overwriting it destroys that knowledge. Instead, re-runs scoped discovery prompts and merges only new content into existing docs.

```mermaid
flowchart TD
    RK[/forge:regenerate\nknowledge-base] --> S1[architecture\nre-run: stack · processes · routing discovery]
    RK --> S2[business-domain\nre-run: database discovery]
    RK --> S3[stack-checklist\nre-run: stack · testing discovery]

    S1 -->|merge into| A[engineering/architecture/*.md]
    S2 -->|merge into| B[engineering/business-domain/entity-model.md]
    S3 -->|merge into| C[engineering/stack-checklist.md]
```

**Merge rules (all KB sub-targets):**
- Additive only — existing sections are never removed or overwritten
- `[?]` markers updated if the re-scan can now confirm them
- Contradictions flagged `[CONFLICT]` for human review — not auto-resolved
- New entities marked `[NEW]` for team review
- Vanished entities flagged `[NOT FOUND IN SCAN]`, not deleted

**Sub-targets:**

| Sub-target | Discovery re-run | Merge target | When to use |
|---|---|---|---|
| `architecture` | stack + processes + routing | `engineering/architecture/*.md` | New subsystems, services, or integrations added |
| `business-domain` | database | `entity-model.md` | New ORM models or schema tables added |
| `stack-checklist` | stack + testing | `stack-checklist.md` | New libraries adopted mid-project |

---

## Common behaviour (all categories)

- Shows a unified diff between current and regenerated content before writing
- Prompts before overwriting each file — never auto-replaces
- Knowledge base files are always inputs, never outputs (except for `knowledge-base` sub-targets)

---

## KB / workflow decoupling

The KB updates automatically via retrospective writeback. The generated workflows do not — they are a snapshot that only changes on explicit regeneration.

```mermaid
flowchart LR
    RET[/retrospective] -->|auto| KB[(Knowledge Base)]
    KB -.->|manual trigger| RW[/forge:regenerate\nworkflows]
    RW --> WF[Updated workflows]
```

Run `regenerate workflows` every few sprints, or after a retrospective that revealed significant new patterns. You do not need to do this every sprint.

---

## When to run what

| Situation | Command |
|---|---|
| After adding a custom pipeline | `regenerate workflows` |
| After a significant retrospective | `regenerate workflows` |
| Health detects orphaned entities | `regenerate knowledge-base business-domain` |
| Health detects new subsystems | `regenerate knowledge-base architecture` |
| Health detects new libraries | `regenerate knowledge-base stack-checklist` |
| New tool spec added | `regenerate tools` |
| After Forge plugin update | Use `/forge:update` — it handles regeneration automatically |

---

## Related commands

| Command | Purpose |
|---|---|
| [`/forge:health`](health.md) | Detect what needs regenerating |
| [`/forge:update`](update.md) | Post-plugin-update regeneration (version-aware) |
| [`/forge:add-pipeline`](add-pipeline.md) | Add a pipeline (then run `regenerate workflows`) |
