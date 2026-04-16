# CODE REVIEW — FORGE-S08-T06: Release engineering — version bump, migration, security scan

🌿 *Forge Supervisor*

**Task:** FORGE-S08-T06

---

**Verdict:** Approved

---

## Review Summary

All changes are correct and match the approved plan. The version bump from 0.9.1 to 0.9.2, migration entry with `regenerate: ["commands", "tools"]`, security scan report, and README update are all in place. The prior commit (338431c) correctly includes the 12 uncommitted material changes. The uncommitted changes (plugin.json, migrations.json, README, scan report, and dogfooding data) are ready for the final commit.

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | 〇 | All require() calls use Node.js built-ins (fs, path, os, https, crypto) or local modules (./store.cjs) |
| Hook exit discipline (exit 0 on error, not non-zero) | 〇 | check-update.js and triage-error.js both have `process.on('uncaughtException', () => process.exit(0))`. No hook changes in this release. |
| Tool top-level try/catch + exit 1 on error | 〇 | No new tools. list-skills.js is a utility, not a CLI entry point — uses exit 0 pattern correctly. |
| `--dry-run` supported where writes occur | 〇 | No new write operations. Existing tools unchanged. |
| Reads `.forge/config.json` for paths (no hardcoded paths) | 〇 | No path changes. Command files use `$CLAUDE_PLUGIN_ROOT` and `$FORGE_ROOT` correctly. |
| Version bumped if material change | 〇 | plugin.json version: 0.9.1 -> 0.9.2 |
| Migration entry present and correct | 〇 | 0.9.1 -> 0.9.2, regenerate: ["commands", "tools"], breaking: false, manual: [], notes cover all changes. Chain walkable 0.8.0 -> 0.9.2. |
| Security scan report committed | 〇 | docs/security/scan-v0.9.2.md exists, verdict SAFE TO USE, 0 critical, 2 carry-forward warnings. |
| `additionalProperties: false` preserved in schemas | 〇 | No JSON schema changes. Documentation schemas in forge/meta/store-schema/ updated correctly with new fields. |
| `node --check` passes on modified JS/CJS files | 〇 | list-skills.js and validate-store.cjs pass. |
| `validate-store --dry-run` exits 0 | 〇* | Pre-existing errors only (32 legacy S01 data issues + sprint path fields). No new errors from v0.9.2 changes. |
| No prompt injection in modified Markdown files | 〇 | All 7 command files only added `name:` frontmatter. health.md path fix is benign. Schema docs are data tables, no instruction content. |

## Issues Found

None. All changes are release engineering (version bump, migration, scan) and metadata (frontmatter additions, path fixes, schema documentation updates).

---

## If Approved

### Advisory Notes

1. The `validate-store --dry-run` exit code is 1 due to 32 pre-existing errors from legacy S01 event data and sprint `path` fields not yet in `forge/schemas/sprint.schema.json`. This is a known gap tracked in BUG-002 and BUG-003. The v0.9.2 changes do not introduce any new errors.

2. The security scan was run against SHA 338431c (the material changes commit). The uncommitted version bump, migration, and README changes are purely JSON/Markdown with no security implications.

3. The scan report correctly identifies `list-skills.js` as moved from hooks/ to tools/ (no longer in hooks.json).

4. The `.forge/store/` changes (task status updates, event files) are dogfooding data, not plugin source. They should NOT be included in the version bump commit.