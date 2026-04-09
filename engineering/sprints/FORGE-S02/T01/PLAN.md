# PLAN — FORGE-S02-T01: docs/concepts/ — write all nine conceptual documentation pages

🌱 *Forge Engineer*

**Task:** FORGE-S02-T01
**Sprint:** FORGE-S02
**Estimate:** L

---

## Objective

Create the `docs/concepts/` section from scratch so that users can correctly describe the relationship between Project → Feature → Sprint → Task → Bug, and understand where requirements live. This forms the canonical conceptual reference for the framework.

## Approach

Create the nine documentation pages: `index.md`, `project.md`, `feature.md`, `sprint.md`, `task.md`, `bug.md`, `requirements.md`, `feature-testing.md`, and `extensibility.md`. I will include the Mermaid diagrams (graph TD in `index.md`, stateDiagram-v2 in others based on schemas). `feature.md` will temporarily have a TODO placeholder for its diagram per T02 dependency. `feature-testing.md` will document the 3-layer test model and `FEAT-NNN` convention. Finally, `CLAUDE.md` will be updated to add the "schema change → update concepts diagram" invariant.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `docs/concepts/index.md` | Create file | Root documentation |
| `docs/concepts/project.md` | Create file | Describes projects |
| `docs/concepts/feature.md` | Create file | Describes features |
| `docs/concepts/sprint.md` | Create file | Describes sprints |
| `docs/concepts/task.md` | Create file | Describes tasks |
| `docs/concepts/bug.md` | Create file | Describes bugs |
| `docs/concepts/requirements.md` | Create file | Explains requirements flow |
| `docs/concepts/feature-testing.md`| Create file | Testing standards |
| `docs/concepts/extensibility.md` | Create file | Extension model |
| `CLAUDE.md` | Add invariant constraint | Ensure docs sync with schemas |

## Plugin Impact Assessment

- **Version bump required?** No — Docs-only changes, deferred to T10.
- **Migration entry required?** No — Not a material change.
- **Security scan required?** No — No changes to `forge/` artifacts.
- **Schema change?** No.

## Testing Strategy

- Store validation: `node forge/tools/validate-store.cjs --dry-run` to ensure integrity.
- Manual verification: Render testing of Mermaid diagrams to ensure parsing validity.

## Acceptance Criteria

- [ ] All nine files exist and are committed.
- [ ] `concepts/index.md` contains the canonical containment diagram (`Project → Features → Sprints → Tasks` etc.).
- [ ] `sprint.md`, `task.md`, `bug.md` each carry a handwritten `stateDiagram-v2`.
- [ ] `feature.md` has `<!-- TODO: add state diagram after T02 -->`.
- [ ] `extensibility.md` is reachable in one click from `index.md`.
- [ ] Every concept page links to relevant `docs/commands/`.
- [ ] `CLAUDE.md` invariant is added.
- [ ] `node --check` passes on any modified JS (none modified).
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0.

## Operational Impact

- **Distribution:** No tool payload, existing users are unaffected.
- **Backwards compatibility:** Preserved, no logical change.
