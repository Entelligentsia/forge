# FORGE-S02-T08: forge:health — per-feature FEAT-ID test coverage reporting

**Sprint:** FORGE-S02
**Estimate:** M
**Pipeline:** default

---

## Objective

Extend the `/forge:health` command to report per-feature test coverage by
scanning for tests tagged with `FEAT-NNN` identifiers across the project.
The check is language-agnostic (accepts tags in test names, filenames, or
comment docblocks). It warns only when at least one active feature exists and
a feature has zero tagged tests.

## Acceptance Criteria

1. `forge/commands/health.md` gains a **Feature Test Coverage** check section
   that instructs the model to:
   - Read all active features from `.forge/store/features/` (status `active`).
   - Scan the project's test files (common directories: `test/`, `tests/`,
     `spec/`, `__tests__/`, `*.test.*`, `*.spec.*`) for occurrences of each
     active feature's `FEAT-NNN` ID.
   - Report: for each active feature, count of files / test names containing
     its ID.
   - Warn: `⚠ FEAT-NNN has 0 tagged tests` for any active feature with no hits.
   - Silent when zero active features exist.
2. The check documents three acceptable tag forms: test file name (e.g.
   `feat-001-login.test.js`), test name string (e.g. `describe('[FEAT-001]')`),
   comment docblock (e.g. `// @feat FEAT-001`).
3. The health command retains all existing checks (no regressions).
4. Optionally: add a `concepts freshness` check that emits a notice if any
   `docs/concepts/*.md` file is older than the newest schema change in
   `forge/meta/store-schema/` (nice-to-have per sprint requirements; include
   only if it does not inflate scope).

## Context

- Depends on T06 (collate) because `health` will need the feature registry
  to be generated before it can list active features. At runtime this means
  collate should have been run; health is a read-only check.
- The `/forge:health` command at `forge/commands/health.md` is a Markdown slash
  command file — add the new check as an additional numbered step or section.
- Tag convention must be language-agnostic — the instruction to the model is
  to use `grep` or equivalent pattern matching across the test directories.
- The sprint requirements note: "Warning only fires when at least one active
  feature exists. Empty-features state is silent."

## Plugin Artifacts Involved

- **[MODIFY]** `forge/commands/health.md`

## Operational Impact

- **Version bump:** Not required for this task — deferred to T10.
- **Regeneration:** No user action needed — command files are not regenerated
  by `/forge:update` (they are copied, not generated). The updated command
  takes effect on the next plugin reload.
- **Security scan:** Required at T10 (covers all `forge/` changes).
