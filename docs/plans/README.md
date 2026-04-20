# Orchestrator Hardening Plans

Four independently shippable engineering plans to improve quality, speed, and
token economy of the Forge meta orchestrator (`run-sprint`, `run-task`,
`fix-bug`). Each plan is a self-contained spec with scope, files, algorithm,
tests, risks, and acceptance criteria.

## Recommended sequencing

1. [Plan 3 — Gate-Check Enforcement](03-gate-check-enforcement.md) — quality foundation, zero token impact, surfaces missing-prerequisite bugs loudly so later plans land safer.
2. [Plan 1 — Persona/Skill by Reference](01-persona-skill-by-reference.md) — biggest token win, additive, env-flag rollback.
3. [Plan 2 — Artifact Summaries in Task Manifest](02-artifact-summaries.md) — schema bump; benefits from Plan 1's leaner prompts.
4. [Plan 4 — Architecture Context Pack](04-context-pack.md) — complementary to Plan 2; land after 1–3 for a clean measurement baseline.
5. [Plan 5 — Write-Boundary Schema Enforcement](05-write-boundary-schema-enforcement.md) — closes the probabilistic-bypass gap with a PreToolUse hook; land after Plan 3 so the orchestrator safety net is in place.
6. [Plan 6 — `forge-dev` Contributor Tooling Pack](06-forge-dev-pack.md) — codifies the five architectural motifs Plans 1–5 established as contributor-side guardrails and automations. Sequenced independently of user releases: contributor-only, does not touch `forge/` behaviour.

Each plan: one patch-version bump, one `migrations.json` entry, one
`CHANGELOG.md` entry, one security scan, `integrity.json` regeneration.
Expected cadence: ~4 sequential patch releases over ~2 weeks, no breaking
migrations. **Plan 6 is the exception** — contributor-only, no user-facing
version bump, no migration entry, no security scan.

## Release checklist (applies to every plan)

Per `CLAUDE.md`:

- [ ] Write failing test first for every `.cjs` change
- [ ] All `node --test forge/tools/__tests__/*.test.cjs` pass (currently 241)
- [ ] Bump `forge/.claude-plugin/plugin.json` version
- [ ] Add entry to `forge/migrations.json` (`from`, `version`, `notes`, `regenerate`, `breaking`, `manual`)
- [ ] Add entry to `CHANGELOG.md` (newest-first)
- [ ] If `meta/` structure changed, update `forge/tools/build-manifest.cjs` and re-run
- [ ] Regenerate `forge/integrity.json` via `forge/tools/gen-integrity.cjs`
- [ ] Update `EXPECTED=` hash in `forge/commands/health.md`
- [ ] Run `/security-watchdog:scan-plugin forge:forge --source-path forge/`
- [ ] Save scan to `docs/security/scan-v{VERSION}.md`
- [ ] Update `docs/security/index.md` and README `## Security` table
