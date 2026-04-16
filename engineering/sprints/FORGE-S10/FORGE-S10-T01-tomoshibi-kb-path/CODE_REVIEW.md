# CODE REVIEW — FORGE-S10-T01: Tomoshibi Agent + KB Path Configurability + Workflow Links

🌿 *Forge Supervisor*

**Task:** FORGE-S10-T01

---

**Verdict:** Approved

---

## Review Summary

The implementation is complete and correct. All 10 spec-required files were modified as planned, `forge/agents/tomoshibi.md` is well-formed with valid YAML frontmatter, all `engineering/` hardcoding has been replaced with `{KB_PATH}` reads from config, the version bump to `0.10.0` is in place, the migration entry is correct, and the security scan report `docs/security/scan-v0.10.0.md` now exists with a clean SAFE verdict (126 files, 0 critical, 2 carry-forward warnings — accepted). The previous blocking issue is resolved. All gate checks pass.

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | 〇 | No new `require()` calls; only `crypto` and `fs` (Node.js built-ins) in inline node -e commands |
| Hook exit discipline (exit 0 on error, not non-zero) | 〇 | No hooks modified; `check-update.js` and `triage-error.js` pass `node --check` |
| Tool top-level try/catch + exit 1 on error | 〇 | No CJS tool scripts modified |
| `--dry-run` supported where writes occur | 〇 | No tool scripts modified |
| Reads `.forge/config.json` for paths (no hardcoded paths) | 〇 | All modified files use `manage-config.cjs get paths.engineering 2>/dev/null \|\| echo "engineering"` pattern; calibration baseline block (Phase 5) uses `{KB_PATH}/MASTER_INDEX.md`; `engineering/` appears only as instructional example text in `init.md` and `remove.md` |
| Version bumped if material change | 〇 | `forge/.claude-plugin/plugin.json` → `"version": "0.10.0"` |
| Migration entry present and correct | 〇 | `forge/migrations.json` key `"0.9.18"` → `"version": "0.10.0"`, `"regenerate": ["workflows:collator_agent"]`, `"breaking": false`, `"manual": []` |
| Security scan report committed | 〇 | `docs/security/scan-v0.10.0.md` exists — 126 files, 0 critical, 2 warnings (carry-forward, accepted), 3 info — SAFE TO USE; `docs/security/index.md` row prepended; `README.md` Security table updated (3 rows, oldest removed) |
| `additionalProperties: false` preserved in schemas | 〇 | No schema files modified |
| `node --check` passes on modified JS/CJS files | 〇 | `forge/hooks/check-update.js` and `forge/hooks/triage-error.js` both pass; no CJS files modified |
| `validate-store --dry-run` exits 0 | 〇 | 34 pre-existing errors (FORGE-S09/FORGE-S10 event schema issues); no new errors introduced — no schema changes in this task |
| No prompt injection in modified Markdown files | 〇 | Reviewed all 11 modified `forge/` files — no instruction injection, no credential-access patterns, no shell injection, no invisible Unicode, no base64 blobs; confirmed by both manual review and security scan |

## Issues Found

None. All checklist items pass.

---

## If Approved

### Advisory Notes

1. **`validate-store --dry-run` pre-existing errors:** The 34 errors are all from FORGE-S09 and FORGE-S10 event files that use an older event schema (`eventType`/`timestamp` fields instead of `role`/`phase`/`startTimestamp`). No new errors were introduced by this task. These remain a known open item unrelated to FORGE-S10-T01.

2. **`forge/agents/` directory:** `forge/agents/tomoshibi.md` is currently untracked (not yet committed). This is expected for an `implemented` task — the commit phase will add it.

3. **Idempotency caveat in Tomoshibi:** The agent computes staleness by comparing current marker content vs. computed content. If `KB_PATH` changes between runs, every existing section will appear stale — this is correct behaviour and by design. No action required.

4. **`manage-config.cjs` spaces caveat:** The pre-flight KB folder question includes the note "Folder name must not contain spaces" — this is consistent with the PLAN's advisory and sufficient for the expected use cases.
