# FORGE-S02-T01: docs/concepts/ — write all nine conceptual documentation pages

**Sprint:** FORGE-S02
**Estimate:** L
**Pipeline:** default

---

## Objective

Create the `docs/concepts/` section from scratch so that a new user who has
just installed Forge can read `docs/concepts/index.md` in under 5 minutes and
correctly describe the relationship between Project → Feature → Sprint → Task
→ Bug, including where requirements live and how feature testing is organised.
This is the authoritative reference for all conceptual content; the README
links into it; the vision doc must not contradict it.

## Acceptance Criteria

1. All nine files exist and are committed:
   `docs/concepts/index.md`, `project.md`, `feature.md`, `sprint.md`,
   `task.md`, `bug.md`, `requirements.md`, `feature-testing.md`,
   `extensibility.md`.
2. `concepts/index.md` contains the canonical containment diagram:
   `Project → Features → Sprints → Tasks` (with Bugs spawned from Tasks,
   Retrospectives feeding the Knowledge Base) as a Mermaid `graph TD` block.
3. `sprint.md`, `task.md`, `bug.md`, `feature.md` each carry a hand-written
   `stateDiagram-v2` block derived from the corresponding
   `forge/meta/store-schema/*.schema.md`. Diagrams are written **last** (after
   T02 freezes the feature schema) to minimise drift.
4. `extensibility.md` covers the two-layer model (plugin/meta layer vs project
   layer) and is reachable from `concepts/index.md` in one click.
5. Every concept page links to the relevant command reference under
   `docs/commands/`.
6. All Mermaid diagrams render without parse errors (run `npx @mermaid-js/mermaid-cli` or visually verify the syntax against the GitHub Markdown spec).
7. `node --check` passes on any JS modified (none expected for this task).
8. `node forge/tools/validate-store.cjs --dry-run` exits 0 (this task does not
   change schemas, but run as a sanity check).

## Context

- No `docs/concepts/` directory exists yet — create it.
- The state diagrams in `sprint.md`, `task.md`, and `bug.md` should be derived
  from the existing `forge/meta/store-schema/` files.
- The `feature.md` state diagram will be based on T02's `feature.schema.md`
  output. Plan to write `feature.md`'s stateDiagram **after** T02 is committed,
  or leave a `<!-- TODO: add state diagram after T02 -->` placeholder and patch
  it in PR if T01 and T02 run concurrently.
- `feature-testing.md` must define three layers (task acceptance / sprint smoke
  / feature regression) and specify the `FEAT-NNN` tag convention for test
  files or test names. This convention is language-agnostic.
- The CLAUDE.md invariant to add: **"schema change → update concepts diagram"**
  — add this to `CLAUDE.md` as part of this task.

## Plugin Artifacts Involved

- **[NEW]** `docs/concepts/index.md`
- **[NEW]** `docs/concepts/project.md`
- **[NEW]** `docs/concepts/feature.md`
- **[NEW]** `docs/concepts/sprint.md`
- **[NEW]** `docs/concepts/task.md`
- **[NEW]** `docs/concepts/bug.md`
- **[NEW]** `docs/concepts/requirements.md`
- **[NEW]** `docs/concepts/feature-testing.md`
- **[NEW]** `docs/concepts/extensibility.md`
- **[MODIFY]** `CLAUDE.md` — add "schema change → update concepts diagram" invariant

## Operational Impact

- **Version bump:** Not required for this task — deferred to T10.
- **Regeneration:** No user action needed — pure documentation addition.
- **Security scan:** Not required for this task — no `forge/` artifacts changed.
