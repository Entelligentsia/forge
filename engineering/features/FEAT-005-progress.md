# PROGRESS — FEAT-005: `/forge:config` Command + Fast-Mode-Respecting Regenerate

🌱 *Forge Engineer*

**Feature:** FEAT-005
**Target version:** 0.12.1
**Date:** 2026-04-17

---

## Summary

Implemented Parts A–D of FEAT-005:

- **Part A** — New `/forge:config` command (`forge/commands/config.md`) owning
  the `mode` field. Subcommands: bare summary, `mode` (read), `mode full`
  (promote — runs materialize-all + default regenerate, writes mode), `mode
  fast` (refused).
- **Part B** — `/forge:regenerate` now respects fast mode at every category.
  Single-file variants short-circuit on stub/missing. Default no-args run no
  longer flips mode and emits a per-category fast-mode footer.
- **Part C** — `/forge:materialize` is mode-neutral. `--all` no longer writes
  `mode: full`; description updated.
- **Part D** — `/forge:update` Step 6 final summary appends a fast-mode
  promotion hint when the project is still in fast mode.

Implementation is markdown-only orchestration — no `.cjs` code changes.
Existing utilities (`manage-config.cjs get/set mode`, `<!-- FORGE FAST-MODE
STUB` sentinel, `ensure-ready.cjs`) are reused.

---

## Syntax Check Results

No JS/CJS files modified — no `node --check` runs required for this feature.

```
$ ls forge/commands/*.md forge/migrations.json forge/.claude-plugin/plugin.json CHANGELOG.md
(markdown + json — no node syntax check applies)
```

## Test Suite Results

```
$ node --test forge/tools/__tests__/*.test.cjs
ℹ tests 286
ℹ pass 286
ℹ fail 0
```

All 286 tests pass. No new tests required — feature is markdown-only.

## Manifest Rebuild

```
$ node forge/tools/build-manifest.cjs --forge-root forge/
〇 structure-manifest.json written to forge/schemas/structure-manifest.json
── version: 0.12.1  total files: 59
   personas: 6  skills: 8  workflows: 18  templates: 9  commands: 13  schemas: 5
```

The manifest's `version` field synced to the new plugin version (0.12.1).
A previously-missed `edges.workflows` section materialised — that section
was added in 0.12.0 (FEAT-003) but the manifest had not been re-generated;
this rebuild brings it current. No mapping table changes needed (no files
added/renamed/removed in `forge/meta/personas/`, `forge/meta/workflows/`,
`forge/meta/templates/`, or `forge/schemas/*.schema.json`).

Reverse-drift warnings emitted (`meta-orchestrator.md`,
`meta-product-manager.md`) are pre-existing and unrelated to this feature.

---

## Files Changed

| File | Change |
|---|---|
| `forge/commands/config.md` | NEW — `/forge:config` command per FEAT-005 Part A |
| `forge/commands/regenerate.md` | Added fast-mode awareness preamble; per-category materialized filter; default-run footer; removed mode-flip block |
| `forge/commands/materialize.md` | Removed `manage-config.cjs set mode full` write; description and copy clarify mode neutrality; added promotion hint |
| `forge/commands/update.md` | Step 6 emits fast-mode promotion hint when `mode == "fast"` post-migration |
| `forge/.claude-plugin/plugin.json` | Version 0.12.0 → 0.12.1 |
| `forge/migrations.json` | Added `0.12.0 → 0.12.1` entry (no regeneration required) |
| `forge/schemas/structure-manifest.json` | Rebuilt — version sync 0.11.3 → 0.12.1, `edges.workflows` materialised |
| `CHANGELOG.md` | Prepended `[0.12.1] — 2026-04-17` entry; Unreleased now annotated as FEAT-004 in flight |
| `engineering/features/FEAT-005-progress.md` | NEW — this file |

---

## Plugin Checklist

| Item | Status |
|---|---|
| Version bumped (`plugin.json`) | 〇 0.12.0 → 0.12.1 |
| Migration entry added (`migrations.json`) | 〇 |
| Changelog entry prepended (`CHANGELOG.md`) | 〇 |
| Test suite passes (286 tests) | 〇 |
| Build-manifest re-run | 〇 |
| Concepts diagram update needed? | × — no schema lifecycle changes |
| Security scan | △ pending — must run `/security-watchdog:scan-plugin forge:forge --source-path forge/` and save report to `docs/security/scan-v0.12.1.md`; update `README.md` and `docs/security/index.md` |

---

## Deviations from PLAN.md

None of substance. Two minor design refinements made during implementation:

1. **`/forge:config` mode subcommand on `unset`** — when `mode` is absent
   (legacy install predating the field), `mode full` writes the field
   directly without re-running materialize/regenerate; `mode fast` is
   accepted as a no-op (`〇 Already in fast mode.`). Spec did not explicitly
   call this out; chosen to avoid spurious rebuild on legacy projects.

2. **Fast-mode workflows category orchestration** — when fast-mode filter
   is active, the orchestration sub-step (step 8 of workflows full rebuild)
   is skipped. Orchestration depends on the complete workflow set; running
   it against a partially materialised project would produce stale
   references. Orchestration files refresh on full promotion or full
   workflow rebuild. Spec did not explicitly cover this; chose the safer
   skip.

3. **Per-namespace manifest clearing in fast mode** — instead of calling
   `clear-namespace`, fast-mode regenerate calls `remove` only for the
   filtered files. This preserves manifest entries for stubs/missing files
   that we are intentionally leaving alone. Spec implied this by saying
   "Non-materialized artifacts remain untouched (stubs stay stubs)"; this
   is the manifest-side implementation detail.

---

## FEAT-004 Coordination

FEAT-005 spec Part D notes that FEAT-004's resume sub-prompt should call
`/forge:config mode full` instead of raw `manage-config.cjs set mode`.
FEAT-004 is currently in flight (visible in `engineering/features/FEAT-004*`)
and has not been merged. That coordination is FEAT-004's responsibility on
its next implementation pass — no FEAT-004 files are touched by FEAT-005.

The FEAT-004 spec amendment (removing the full → fast resume switch case
because `/forge:config mode fast` is now refused) should be folded into
FEAT-004 directly when its implementation continues.

---

## Knowledge Writeback

No surprising plugin-architecture or distribution-behaviour findings during
this feature. No `engineering/architecture/` or
`engineering/stack-checklist.md` updates required.

---

## Next Steps for Maintainer

1. Run security scan:
   ```
   /security-watchdog:scan-plugin forge:forge --source-path forge/
   ```
2. Save full report (do not summarise) to `docs/security/scan-v0.12.1.md`.
3. Prepend a row to the Security Scan History table in `README.md` (and
   remove the oldest row so it shows exactly the 3 most recent scans).
4. Prepend a row to `docs/security/index.md`.
5. Commit with version bump (or follow-up `security:` commit).
