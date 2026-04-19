---
name: health
description: Use when you want to check if the engineering knowledge base is stale, has gaps, or has store integrity issues
---

# /forge:health

Assess the health and currency of the project's SDLC knowledge base.

## Checks

| Check | What It Detects |
|-------|----------------|
| **Config completeness** | Missing required fields in `.forge/config.json` — blocks further checks if incomplete |
| **KB freshness** | Hash mismatch between current `MASTER_INDEX.md` and calibration baseline — detects technical or business drift |
| **Stale docs** | Architecture sub-docs not updated in N sprints |
| **Orphaned entities** | Entities in code (ORM models, types) not in `engineering/business-domain/entity-model.md` |
| **Unused checklist items** | Stack-checklist items never triggered in reviews |
| **Coverage gaps** | Architecture areas with no sub-document |
| **Writeback backlog** | `[?]` items not yet confirmed by a retrospective |
| **Store integrity** | Run `node "$FORGE_ROOT/tools/validate-store.cjs" --dry-run` |
| **Modified generated files** | Generated files that have been manually edited since last recorded — run `node "$FORGE_ROOT/tools/generation-manifest.cjs" list --modified` |
| **Generated file structure** | Files expected by the plugin's structure-manifest that are absent from `.forge/` or `.claude/commands/` |
| **Skill gaps** | Marketplace skills relevant to the stack that are not installed |
| **Feature Test Coverage** | Features with zero tagged tests |
| **Concepts freshness** | `docs/concepts/*.md` pages older than `forge/meta/store-schema/` updates |
| **Context pack freshness** | `source_hash` in `.forge/cache/context-pack.json` vs. current hash of `engineering/architecture/*.md` |
| **Plugin integrity** | Plugin command and agent files modified since last release hash was recorded |

## How to run

First, resolve the plugin root and project root:
```
FORGE_ROOT: !`echo "${CLAUDE_PLUGIN_ROOT}"`
```

Open the run with the oracle hero + subtitle:

```sh
node "$FORGE_ROOT/tools/banners.cjs" oracle
node "$FORGE_ROOT/tools/banners.cjs" --subtitle "Reading the project's pulse — config, KB freshness, store integrity, structural completeness"
```

`banners.cjs` strips ANSI in `NO_COLOR` / non-tty / `--plain` contexts.

Parse `$ARGUMENTS` for a `--path <dir>` argument:
- If present, `PROJECT_ROOT = <dir>` (absolute or relative to the current working directory — resolve to absolute).
- If absent, `PROJECT_ROOT = .` (current working directory).

All file paths below are relative to `PROJECT_ROOT`. All shell tool invocations must be run from `PROJECT_ROOT`:
```sh
cd "$PROJECT_ROOT" && node "$FORGE_ROOT/tools/..."
```

1. **Config-completeness check** — Read `$PROJECT_ROOT/.forge/config.json`.
   If it does not exist, stop and tell the user to run `/forge:init` in that directory first.
   If it exists, validate it against `$FORGE_ROOT/sdlc-config.schema.json`:
   - Read the schema and extract all `required` fields at each level (top-level and nested objects).
   - Required top-level fields: `version`, `project`, `stack`, `commands`, `paths`.
   - Nested required fields: `project.prefix`, `project.name`, `commands.test`, `paths.engineering`, `paths.store`, `paths.workflows`, `paths.commands`, `paths.templates`.
   - For each required field, verify it exists in the config and has a non-empty value.
   - If all required fields are present and non-empty, emit:
     > 〇 Config complete — all required fields present.
   - If any required fields are missing or empty, list each missing field by path (e.g. `project.prefix`, `commands.test`) with a short description, then **exit early** with:
     > △ Config incomplete — missing required fields:
     >   · `project.prefix` — short project prefix (e.g. ACME)
     >   · `commands.test` — test command (e.g. npm test)
     >
     > Run `/forge:init` to complete configuration.
     Do **not** cascade into subsequent checks that may fail on incomplete config.
2. **KB freshness check** — Read `calibrationBaseline` from `$PROJECT_ROOT/.forge/config.json`.
   - If `calibrationBaseline` is absent, emit:
     > △ No calibration baseline found — run `/forge:init` to establish one.
     Skip the freshness check and proceed to step 3.
   - If `calibrationBaseline` exists, compute the current hash of `MASTER_INDEX.md` using the same algorithm as `/forge:init`:
     ```sh
     cd "$PROJECT_ROOT" && node -e "const crypto=require('crypto'),fs=require('fs'); const cfg=JSON.parse(fs.readFileSync('.forge/config.json','utf8')); const engPath=(cfg.paths&&cfg.paths.engineering)||'engineering'; const lines=fs.readFileSync(engPath+'/MASTER_INDEX.md','utf8').split('\n').filter(l=>l.trim()&&!l.trim().startsWith('<!--')); console.log(crypto.createHash('sha256').update(lines.join('\n')).digest('hex'))"
     ```
   - Compare the computed hash against `calibrationBaseline.masterIndexHash`:
     - If they match, emit:
       > 〇 KB fresh — no drift since last calibration (last calibrated: `calibrationBaseline.lastCalibrated`, version: `calibrationBaseline.version`)
     - If they differ, read `$PROJECT_ROOT/engineering/MASTER_INDEX.md` and categorize the drift based on which sections have changed. Categorize sections as follows:
       - **Technical sections**: stack, routing, database, deployment, processes, architecture, schemas, conventions, stack-checklist
       - **Business sections**: entity-model, domain, features, acceptance criteria, business-domain
       If changes are only in technical sections: emit "technical". If only in business sections: emit "business". If in both: emit "technical + business".
       Emit:
       > △ KB drifted — <category> changes detected since last calibration (last calibrated: `calibrationBaseline.lastCalibrated`)
       >   Run `/forge:calibrate` to re-align the knowledge base.
3. Read the knowledge base files in `$PROJECT_ROOT/engineering/`
4. Read the store in `$PROJECT_ROOT/.forge/store/` for sprint/task history
5. Scan the codebase for entities not in the knowledge base (Grep for model/type definitions)
6. Run store validation:
   ```sh
   cd "$PROJECT_ROOT" && node "$FORGE_ROOT/tools/validate-store.cjs" --dry-run
   ```
   Include the result in the report.
7. Check modified generated files:
   ```sh
   cd "$PROJECT_ROOT" && node "$FORGE_ROOT/tools/generation-manifest.cjs" list --modified
   ```
   If any modified or missing files are reported, include them in the health
   report under **Modified generated files** with the note:
   > These files were manually edited after generation. Regeneration will warn
   > before overwriting them. Run `/forge:regenerate` to review and update.
   If all files are pristine (or the tool is absent), omit this section.
8. Check generated file structure:
   ```sh
   cd "$PROJECT_ROOT" && node "$FORGE_ROOT/tools/check-structure.cjs" --path "$PROJECT_ROOT"
   ```
   If missing files are reported, include them in the health report under
   **Generated file structure** with note:
   > N expected file(s) are missing from generated output. Run `/forge:update` to
   > regenerate missing files, or `/forge:regenerate <namespace>` for targeted repair.
   If all files are present (exit 0), emit:
   > 〇 Generated file structure — all expected files present.
   If the tool is absent (file not found), skip this check silently.
   Note: custom `paths.*` overrides in `.forge/config.json` are respected by
   check-structure.cjs. Projects using default paths will see no difference.
9. Check skill gaps: run `node "$FORGE_ROOT/tools/list-skills.js"` to get the live
   installed skill list from `~/.claude/plugins/installed_plugins.json` (source of
   truth — not the config, which can be stale). Read `$FORGE_ROOT/meta/skill-recommendations.md`,
   cross-reference the stack against live installed skills, report any uninstalled
   high-confidence recommendations with one-line install instructions. If the live
   list differs from `installedSkills` in config, update config to match.
10. Check test coverage for active features:
    - Read `$PROJECT_ROOT/.forge/store/features/` to find all features with `"status": "active"`.
    - If zero active features exist, skip this check.
    - Otherwise, scan all test directories under `$PROJECT_ROOT` (e.g. `test/`, `tests/`, `spec/`, `__tests__/`) and test files (`*.test.*`, `*.spec.*`) for the `FEAT-NNN` identifier of each active feature.
    - You should account for three tag forms: filename (`feat-NNN-login.test.js`), test name string (`describe('[FEAT-NNN]')`), or docblock comment (`// @feat FEAT-NNN`).
    - For each active feature, report the count of test files or names matching its ID.
    - Warn explicitly: `⚠ FEAT-NNN has 0 tagged tests` if an active feature has zero hits.
11. Check concepts freshness:
    - Compare the modification timestamps of files in `$PROJECT_ROOT/docs/concepts/*.md` against the newest schema modification in `$FORGE_ROOT/meta/store-schema/`.
    - If any concept doc is older than the newest schema change, emit a notice that it may be stale.
12. Check persona pack freshness:
    - If `$PROJECT_ROOT/.forge/cache/persona-pack.json` does not exist, emit:
      > △ Persona pack missing — run `/forge:regenerate` to build it.
      (The pack is consumed by `meta-orchestrate` and `meta-fix-bug` when `FORGE_PROMPT_MODE=reference`.)
    - Otherwise read the pack's `source_hash`, then compute the current hash:
      ```sh
      CURRENT=$(node -e "const t=require('$FORGE_ROOT/tools/build-persona-pack.cjs'); console.log(t.computeSourceHash({personaDir:'$FORGE_ROOT/meta/personas', skillDir:'$FORGE_ROOT/meta/skills'}))")
      STORED=$(node -e "console.log(require('$PROJECT_ROOT/.forge/cache/persona-pack.json').source_hash)")
      ```
      If `CURRENT != STORED`, emit:
      > △ Persona pack stale — meta/ has changed since last build. Run `/forge:regenerate` to refresh.
      Otherwise emit:
      > 〇 Persona pack fresh.
13. Check context pack freshness:
    - Compute the current source hash over `engineering/architecture/*.md`
      (excluding `*.draft.md`) using the same algorithm as `build-context-pack.cjs`:
      ```sh
      ENGINEERING=$(node "$FORGE_ROOT/tools/manage-config.cjs" get paths.engineering 2>/dev/null || echo engineering)
      node "$FORGE_ROOT/tools/build-context-pack.cjs" --arch-dir "$ENGINEERING/architecture" 2>/dev/null
      # The tool exports computeSourceHash — call it programmatically if preferred:
      CURRENT=$(node -e "const t=require('$FORGE_ROOT/tools/build-context-pack.cjs'); try { console.log(t.computeSourceHash('$PROJECT_ROOT/$ENGINEERING/architecture')); } catch(e) { console.log('n/a'); }")
      ```
    - If `engineering/architecture/` does not exist, skip this check silently.
    - If `.forge/cache/context-pack.json` does not exist, emit:
      > △ Context pack missing — run `/forge:regenerate` to build it.
      (The pack is injected by `meta-orchestrate` and `meta-fix-bug` to reduce per-phase architecture reads.)
    - Otherwise read `source_hash` from `.forge/cache/context-pack.json` and compare:
      ```sh
      STORED=$(node -e "console.log(require('$PROJECT_ROOT/.forge/cache/context-pack.json').source_hash)")
      ```
      If `CURRENT != STORED` (and `CURRENT != 'n/a'`), emit:
      > △ Context pack stale — architecture docs have changed since last build. Run `/forge:regenerate` or `/forge:collate` to rebuild.
      Otherwise emit:
      > 〇 Context pack fresh.
14. Check plugin integrity:
    First, verify the integrity verifier itself has not been tampered with:
    ```sh
    ACTUAL=$(node -e "const c=require('crypto'),f=require('fs'); console.log(c.createHash('sha256').update(f.readFileSync('$FORGE_ROOT/tools/verify-integrity.cjs')).digest('hex'))")
    EXPECTED="3ec3c970dd3d7c3001f8f373bcc40556803eadd2fc2afafb14f1c232cba4cc3f"
    ```
    If `ACTUAL != EXPECTED`, emit:
    > △ Integrity verifier itself appears modified — run `/forge:update` to restore. Skipping integrity check.
    And skip the rest of this step.

    If the verifier hash matches, run:
    ```sh
    node "$FORGE_ROOT/tools/verify-integrity.cjs" --forge-root "$FORGE_ROOT"
    ```
    Include the output line verbatim in the report (it already uses 〇/△/× format).
    Note: local verification is tamper-evident, not tamper-proof. `/forge:update` is
    the authoritative restore path.

15. Report all findings with actionable recommendations.
    If `--path` was used, open the report with: `Health report for: $PROJECT_ROOT`
16. Close the report with: `If you've found a bug in Forge itself, run /forge:report-bug`

## Output

A health report to stdout — no files modified.

After the report's findings, close with a single status line that
reflects the overall verdict (synthesized from check 12's findings):

```sh
# Pick one of three status emojis based on the worst finding observed:
#   〇 = all checks pass         (green)
#   △ = warnings, no errors      (caution)
#   × = at least one failure     (alert)
node "$FORGE_ROOT/tools/banners.cjs" --subtitle "{〇|△|×} Health check complete — {N} 〇, {W} △, {E} ×"
```

If exactly zero issues were found, also re-render the oracle badge as a
"sealed" closing mark:

```sh
node "$FORGE_ROOT/tools/banners.cjs" --badge oracle
```

## Arguments

$ARGUMENTS

| Argument | Purpose |
|----------|---------|
| `--path <dir>` | Run health check against a different project directory instead of the current working directory. Accepts an absolute path or a path relative to the current directory. |

## On error

If any step above fails unexpectedly, describe what went wrong and ask:

> "This looks like a Forge bug. Would you like to file a report to help improve it? Run `/forge:report-bug` — I'll pre-fill the report from this conversation."
