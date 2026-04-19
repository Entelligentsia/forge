# CODE REVIEW — FORGE-BUG-009: Structure manifest — deterministic check and course-correct for generated `.forge/` and `.claude/commands/`

🌿 *Forge Supervisor*

**Task:** FORGE-BUG-009
**Reviewer:** Forge Supervisor (review-code phase, iteration 2)
**Review date:** 2026-04-15
**Plan under review:** `engineering/bugs/FORGE-BUG-009-structure-manifest/BUG_FIX_PLAN.md` (v0.9.7 → 0.9.8)

---

**Verdict:** Approved

---

## Review Summary

All three blockers from iteration 1 have been resolved. `docs/security/scan-v0.9.8.md`
now exists (111 files, 0 critical, 1 warning accepted, 3 info — SAFE TO USE). The
README.md Security table shows exactly the three most recent scans (0.9.9, 0.9.8, 0.9.7)
with the oldest rotated out. `docs/security/index.md` has the 0.9.8 row prepended. A
`docs/security/scan-v0.9.9.md` was also produced to cover the banner library additions
that were present in the working tree during the scan. The implementation itself — new
tools `build-manifest.cjs` and `check-structure.cjs`, the `clear-namespace` extension to
`generation-manifest.cjs`, the 14-entry dogfooding cleanup, and the command integrations
in `regenerate.md`, `health.md`, and `update.md` — was correct in iteration 1 and
remains unchanged and correct here.

---

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | 〇 | All three tools use only Node built-ins (`fs`, `path`, `crypto`). |
| Hook exit discipline (exit 0 on error, not non-zero) | N/A | No hook files changed. |
| Tool top-level try/catch + exit 1 on error | 〇 | `build-manifest.cjs` and `check-structure.cjs` use top-level try/catch with `process.exit(1)`. `generation-manifest.cjs` uses `process.on('uncaughtException')` + per-path try/catch, consistent with the file's pre-existing pattern. |
| `'use strict';` as first executable line | 〇 | Present on line 2 (after shebang) in all three tool files. |
| `--dry-run` supported where writes occur | △ | `build-manifest.cjs` writes without `--dry-run`. Pre-existing pattern for plugin-build tools; advisory only (see note 1). |
| Reads `.forge/config.json` for paths (no hardcoded paths) | 〇 | `check-structure.cjs` reads `paths.<logicalKey>` from `.forge/config.json` with documented fallback. `build-manifest.cjs` writes to plugin-internal `forge/schemas/` — the `paths.*` convention does not apply. |
| Version bumped if material change | 〇 | `plugin.json` shows `0.9.9` (a subsequent 0.9.8→0.9.9 bump applied on top). Migration entry `0.9.7` → `0.9.8` is present and correct. |
| Migration entry present and correct | 〇 | `forge/migrations.json` `"0.9.7"` entry: `version: "0.9.8"`, `regenerate: []`, `breaking: false`. Notes string accurately describes the change. |
| Security scan report committed | 〇 | `docs/security/scan-v0.9.8.md` exists. Scan covers all forge/ source at current state including 0.9.9 carry-over (documented in scan preamble). Verdict: SAFE TO USE. |
| README security table updated | 〇 | README.md shows 0.9.9, 0.9.8, 0.9.7 — exactly 3 rows. `[Full scan history →](docs/security/index.md)` line present. |
| `docs/security/index.md` updated | 〇 | 0.9.9 and 0.9.8 rows prepended at top of history table. |
| `additionalProperties: false` preserved in schemas | N/A | No `.schema.json` files modified. `structure-manifest.json` is a generated artifact, not a JSON Schema. |
| `node --check` passes on modified JS/CJS files | 〇 | Re-verified: `generation-manifest.cjs`, `build-manifest.cjs`, `check-structure.cjs` all pass `node --check`. |
| `validate-store --dry-run` exits 0 | △ | Pre-existing errors (BUG-002/003/004). None introduced by this change. Schema was not modified. |
| No prompt injection in modified Markdown files | 〇 | `regenerate.md`, `health.md`, `update.md`, `CLAUDE.md` — all operator-facing instruction prose; no role-reset phrases, no hidden-instruction patterns. |
| Plan compliance — 57 files in structure-manifest | 〇 | 6 personas + 6 skills + 18 workflows + 9 templates + 13 commands + 5 schemas = 57. |
| Plan compliance — clear-namespace prefix guard | 〇 | `clear-namespace personas` → exit 2. `clear-namespace .forge/personas` → exit 2. `clear-namespace .forge/personas/` → no error. |
| Plan compliance — dogfooding manifest cleaned | 〇 | 14 stale role-based entries removed from `.forge/generation-manifest.json`. |
| Plan compliance — regenerate.md clear-namespace in every default namespace | 〇 | personas (L80), workflows (L143), commands (L182), templates (L212), skills (L105 — correctly in non-default section). |
| Plan compliance — CUSTOM_COMMAND_TEMPLATE re-record | 〇 | L222-227 in `regenerate.md`, conditional on file existence. |
| Plan compliance — health.md Step 7 | 〇 | `check-structure.cjs --path "$PROJECT_ROOT"` added as Step 7. Checks table row added. Steps renumbered 7-11 → 8-12. |
| Plan compliance — update.md post-migration check | 〇 | Block at L468-489, before Step 5 (L503). Warning mentions `/forge:regenerate skills`. Non-blocking on gaps. |
| Plan compliance — CLAUDE.md documents build-manifest requirement | 〇 | Item 4 in Versioning section; "Rebuild structure manifest" row in Where-things-live table. |

---

## Issues Found

None blocking.

---

## If Approved

### Advisory Notes

1. **`build-manifest.cjs` has no `--dry-run` flag.** This tool is invoked only during
   plugin development (per CLAUDE.md item 4), not by the user CLI. Low-impact. A future
   `--check` mode that prints expected output without writing would be useful for CI
   invariant verification, but is not required for this release.

2. **Carry-forward edits in `forge/meta/`** (`meta-architect.md`, `meta-bug-fixer.md`,
   `meta-collator.md`, `meta-engineer.md`, `meta-orchestrator.md`, `meta-supervisor.md`,
   `meta-fix-bug.md`, `meta-orchestrate.md`) are from the 0.9.9 banner library work.
   Per the task brief, these are intentionally out of scope and will be committed
   separately. **Do NOT include them in the FORGE-BUG-009 commit.** Stage only the
   files listed in the commit scope below.

3. **`check-structure.cjs` config-warning phrasing** (L60 and L63) emits the same
   "config.json not found or unreadable" message for both "file absent" and "JSON
   parse error" cases. Minor UX nit — not a correctness issue.

4. **`clear-namespace` calls in `regenerate.md` are unguarded by `MANIFEST_TOOL`
   existence.** Pre-existing pattern elsewhere in the file (the `record` calls are
   also unguarded). Acceptable as-is; consistent with current conventions.

---

### Commit Scope

The FORGE-BUG-009 commit should stage exactly these files:

**New files (untracked):**
- `forge/tools/build-manifest.cjs`
- `forge/tools/check-structure.cjs`
- `forge/schemas/structure-manifest.json`
- `docs/security/scan-v0.9.8.md`
- `docs/security/scan-v0.9.9.md`
- `docs/security/index.md`
- `engineering/bugs/FORGE-BUG-009-structure-manifest/` (entire directory)

**Modified files (subset of `git status` M-entries):**
- `forge/tools/generation-manifest.cjs`
- `forge/commands/regenerate.md`
- `forge/commands/health.md`
- `forge/commands/update.md`
- `forge/.claude-plugin/plugin.json`
- `forge/migrations.json`
- `CLAUDE.md`
- `README.md`
- `.forge/generation-manifest.json`

**Do NOT stage:**
- `forge/meta/personas/meta-*.md` (0.9.9 banner work — separate commit)
- `forge/meta/workflows/meta-fix-bug.md` (0.9.9 banner work — separate commit)
- `forge/meta/workflows/meta-orchestrate.md` (0.9.9 banner work — separate commit)
- `forge/tools/banners.cjs` (0.9.9 work — untracked but out of scope)
- `forge/tools/banners.sh` (0.9.9 work — untracked but out of scope)
- `.forge/config.json`, `.forge/update-check-cache.json` (dogfooding runtime state)
- `.forge/store/` event and bug files (dogfooding pipeline artifacts)
- `docs/banners.md`, `docs/agents.sh` (0.9.9 work)

---

**Verdict:** Approved
