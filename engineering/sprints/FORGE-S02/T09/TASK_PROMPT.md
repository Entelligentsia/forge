# FORGE-S02-T09: README + vision alignment — containment diagram, concepts link, absorb default-workflows.md, sync vision/01-OVERVIEW.md

**Sprint:** FORGE-S02
**Estimate:** M
**Pipeline:** default

---

## Objective

Update the project's public-facing and internal documentation to surface the
new concepts section and stay in sync with the containment model introduced in
T01. This involves four specific changes: upgrading the README diagram and
link table, absorbing `docs/default-workflows.md` into the concepts pages,
adding a back-link to `docs/customising-workflows.md`, and syncing the vision
overview document.

## Acceptance Criteria

1. **README.md** — "How it works" section gains the canonical containment
   diagram (`Project → Features → Sprints → Tasks`) as a Mermaid block,
   replacing or supplementing the existing linear arrows.
2. **README.md** — "Get Started" table gains a row:
   `"Understand the core concepts" | docs/concepts/index.md`.
3. **README.md** — Security Scan History table is preserved and untouched
   (T10 will add the v1.0 row).
4. **`docs/default-workflows.md`** — Content is absorbed into
   `docs/concepts/sprint.md` and/or `docs/concepts/task.md` (whichever is
   the natural home). The file itself is replaced with a one-line redirect:
   `> This page has moved to [docs/concepts/sprint.md](concepts/sprint.md).`
   Any inbound links from README are repointed.
5. **`docs/customising-workflows.md`** — Gains a header line (at the very top,
   before the H1 or as a note): `← [Back to Concepts: Extensibility](concepts/extensibility.md)`.
6. **`forge/vision/01-OVERVIEW.md`** — Updated so its description of the Forge
   lifecycle matches the containment model in `docs/concepts/index.md`. No
   contradictions between vision and concepts.
7. After this task, running `grep -r "docs/default-workflows.md" README.md docs/`
   should find only the redirect stub, not any broken links.

## Context

- Depends on T01 (`docs/concepts/` complete) — the README and vision updates
  reference URLs and diagrams from the concepts section.
- The vision doc update should be the **last thing written** in this task, after
  concepts are frozen, per the sprint requirements risk table.
- `forge/vision/01-OVERVIEW.md` path — verify this file exists before editing.
  If the path differs, find the correct location.

## Plugin Artifacts Involved

- **[MODIFY]** `README.md`
- **[MODIFY]** `docs/default-workflows.md` (replace with redirect stub)
- **[MODIFY]** `docs/customising-workflows.md` (add header back-link)
- **[MODIFY]** `forge/vision/01-OVERVIEW.md`

## Operational Impact

- **Version bump:** Not required for this task — deferred to T10.
- **Regeneration:** No user action needed — no generated artifacts change.
- **Security scan:** Required at T10.
