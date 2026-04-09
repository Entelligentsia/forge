# Sprint Requirements — FORGE-S02

**Captured:** 2026-04-09
**Source:** sprint-intake interview
**Sprint title:** Foundational Concepts Documentation + Feature Tier (v1.0)

---

## Goals

1. A new user who has just installed Forge can read `docs/concepts/index.md` in under 5 minutes and correctly describe the relationship between Project → Feature → Sprint → Task → Bug, including where requirements live and how feature testing is organised.
2. Forge's data model gains a first-class **Feature** entity — durable, cross-sprint, requirements-bearing — wired into the store schema, the deterministic tools (`collate`, `validate-store`, `seed-store`), sprint/task manifests, and the intake/plan workflows.
3. The opinionated default workflow and the flexibility to extend it (plugin/meta layer vs project layer) are documented as core concepts, not buried under a "customising" how-to.
4. The release that ships these changes (Forge v1.0 candidate) passes security scan, carries a migration entry, and upgrades cleanly for existing Forge users via `/forge:update`.

## In Scope

### 1. `docs/concepts/` section [must-have]
New top-level conceptual documentation anchored at `docs/concepts/index.md` with one page per core entity plus integrators.

Files:
- `docs/concepts/index.md` — one-screen mental model + canonical containment diagram
- `docs/concepts/project.md`
- `docs/concepts/feature.md`
- `docs/concepts/sprint.md`
- `docs/concepts/task.md`
- `docs/concepts/bug.md`
- `docs/concepts/requirements.md` — three-tier model (Feature / Sprint / Task acceptance)
- `docs/concepts/feature-testing.md` — acceptance, smoke, FEAT-ID regression tagging
- `docs/concepts/extensibility.md` — conceptual intro to the plugin/meta vs project two-layer model, links into `customising-workflows.md` for depth

**Acceptance criteria:**
- Every concept page has exactly one Mermaid diagram and links to the relevant command reference under `docs/commands/`.
- `concepts/index.md` contains the canonical containment diagram: Project → Features → Sprints → Tasks (with Bugs spawned from Tasks, Retrospectives feeding the Knowledge Base).
- `sprint.md`, `task.md`, `bug.md`, `feature.md` each carry a hand-written `stateDiagram-v2` block derived from the corresponding `forge/meta/store-schema/*.schema.md`.
- The two-layer extensibility model is reachable from `concepts/index.md` in one click.
- All Mermaid diagrams render cleanly on GitHub (verified by visual check on the PR preview).

### 2. Feature tier — first-class entity [must-have]
Introduce `Feature` as a persistent, cross-sprint entity with its own schema, store directory, and workflow touchpoints.

**Acceptance criteria:**
- New `forge/meta/store-schema/feature.schema.md` defining: `id` (FEAT-NNN), `title`, `description`, `status` (draft/active/shipped/retired), `requirements[]`, `sprints[]` (back-refs), `tasks[]` (back-refs), `created_at`, `updated_at`.
- Features persisted under `.forge/store/features/` as JSON, mirrored into `engineering/features/<FEAT-ID>.md` by `collate`.
- `task.schema.md` and `sprint.schema.md` gain an optional `feature_id` field (nullable for backwards compatibility).
- `collate` regenerates `engineering/features/INDEX.md` (feature registry) and cross-links it from `MASTER_INDEX.md`.
- `validate-store` enforces referential integrity: any `feature_id` on a task/sprint must resolve to a known feature.
- `seed-store` scaffolds an empty `features/` directory on init.
- `/sprint-intake` workflow (`forge/meta/workflows/meta-sprint-intake.md`) is updated to ask "which Feature does this sprint advance?" and link the sprint to an existing feature or create a new one.
- `/sprint-plan` workflow propagates `feature_id` to generated tasks.

### 3. Feature testing convention [must-have]
Document and wire up the FEAT-ID test tagging convention.

**Acceptance criteria:**
- `docs/concepts/feature-testing.md` defines the three layers (task acceptance / sprint smoke / feature regression) and specifies the `FEAT-NNN` tag convention for test files or test names.
- `/forge:health` reports per-feature test coverage (count of tests tagged with each active FEAT-ID; warn on features with zero tagged tests).
- The convention is language-agnostic (tag in test name, filename, or comment docblock).

### 4. README + vision alignment [must-have]
Surface the new concepts and keep the meta-definition in sync.

**Acceptance criteria:**
- `README.md` "How it works" section gains the canonical containment diagram (replacing or supplementing the current linear arrow).
- `README.md` "Get Started" table gains a "Understand the core concepts" row pointing at `docs/concepts/index.md`.
- `forge/vision/01-OVERVIEW.md` is updated so its description of the Forge lifecycle matches the containment model in `docs/concepts/index.md` (no contradictions between meta and user docs).
- `docs/default-workflows.md` is removed and its content absorbed into `concepts/sprint.md` + `concepts/task.md`; any inbound links from README are repointed.
- `docs/customising-workflows.md` is kept as-is but gains a header link back to `concepts/extensibility.md`.

### 5. Release engineering [must-have]
Ship the sprint as a Forge release.

**Acceptance criteria:**
- `forge/.claude-plugin/plugin.json` version bumped (target: v1.0.0 candidate — actual number decided at commit time).
- `forge/migrations.json` entry added with `regenerate: ["tools", "workflows"]` (schema + workflows both changed) and clear notes about the Feature tier.
- Security scan run per CLAUDE.md; report saved to `docs/security/scan-v{VERSION}.md`; Security Scan History table in `README.md` updated.
- `/forge:update` from the previous version produces a clean upgrade on a test project — existing stores without features continue to validate (backwards compatible).

## Out of Scope

- Auto-generation of concept lifecycle diagrams from schemas — filed as [Entelligentsia/forge#22](https://github.com/Entelligentsia/forge/issues/22), target v1.1.
- Any new slash commands beyond what Feature-tier wiring requires.
- Translation / i18n of docs.
- New marketplace listing or publication flow changes.
- Rewriting `docs/commands/` reference pages (they stay reference-grade; concepts links *into* them).
- Full test suite for deterministic tools beyond what `validate-store --dry-run` already covers.
- Retroactively assigning `feature_id` to historical FORGE-S01 tasks / bugs (nullable field; historic records stay unlinked).
- A migration wizard that interviews users to classify existing sprints into features (deferred).

## Nice-to-Have *(attempt if must-haves complete)*

- `concepts/index.md` carries a short "glossary" appendix — one-line definitions of every term used across the concept pages.
- `/forge:health` gains a "concepts freshness" check that warns if `docs/concepts/` predates the latest schema change (bridge to issue #22).
- Short animated GIF or static mermaid of the Task lifecycle embedded in `README.md`.

## Constraints

- **Plugin compatibility:** Existing Forge users on pre-v1.0 must upgrade cleanly via `/forge:update`. Feature tier fields on task/sprint manifests MUST be nullable; stores without `features/` MUST continue to validate.
- **Distribution:** All changes under `forge/` are distributed to every installed user — material change, version bump required, migration entry mandatory, security scan mandatory per CLAUDE.md.
- **Dependencies:** Node.js built-ins only. No new npm packages.
- **Tool regeneration:** Users will need to run `/forge:update` after upgrading because both tools and workflows change. Migration notes must say so explicitly.
- **Backwards compatibility of schemas:** `feature_id` is additive and nullable. No existing fields may be renamed, removed, or have their type changed.
- **Meta/user-doc parity:** `forge/vision/*` and `docs/concepts/*` must not contradict each other at sprint close.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Feature-tier mental model proves wrong once real users try it, forcing a v1.1 schema break | Medium | Keep `feature.schema.md` minimal; only `id`/`title`/`description`/`status` are required. Everything else is optional. Ship concepts docs *together* with schema so the model is visible and correctable pre-release. |
| Hand-written state diagrams drift from schema as we iterate in this same sprint | High | Write diagrams last (after schema is frozen for the sprint); add CLAUDE.md invariant "schema change → update concepts diagram"; link to issue #22 for the permanent fix. |
| `collate` / `validate-store` / `seed-store` tool regeneration breaks existing projects on upgrade | Medium | Test `/forge:update` against a pristine clone of the Forge repo itself (dogfooding) before publishing the version bump. |
| Scope creep: "while we're in concepts, let's also fix X" pulls the sprint past its acceptance criteria | High | Explicit OUT list above. Any new item requires intake reopening, not an in-sprint decision. |
| Removing `docs/default-workflows.md` breaks external links (blog posts, tweets) | Low | Leave a stub file with a single redirect line pointing at `docs/concepts/index.md`. |
| `/forge:health` feature-coverage check produces noise on projects with zero features | Medium | Warning only fires when at least one active feature exists. Empty-features state is silent. |
| FEAT-ID tag convention is language-agnostic but hard to enforce uniformly — teams may tag inconsistently | Medium | Document multiple acceptable tag forms (filename, test name, docblock); `/forge:health` accepts any of them; tighten in v1.1 if needed. |
| Vision doc updates drift from concepts docs during the sprint itself | Low | Update vision as the *last* step, after concepts are frozen. |

## Carry-Over from FORGE-S01

| Item | Status | Notes |
|---|---|---|
| — | — | FORGE-S01 (Token Usage Tracking) closed cleanly with retrospective-done; no carry-over items. |

---

## Open decisions resolved during intake

1. **Feature tier in v1.0?** → YES. In scope for this sprint.
2. **`docs/concepts/` vs existing workflow docs?** → HYBRID. Absorb `default-workflows.md`; keep `customising-workflows.md` as the how-to with a link back from `concepts/extensibility.md`.
3. **FEAT-ID test tag convention in v1.0?** → YES. In scope.
4. **State diagrams hand-written or generated?** → HAND-WRITTEN for v1.0. Generator filed as [#22](https://github.com/Entelligentsia/forge/issues/22) for v1.1.
5. **README updates in scope?** → YES.
6. **Vision doc updates in scope?** → YES.

---

**Next step:** run `/sprint-plan` to break these requirements into tasks with estimates and a dependency graph.
