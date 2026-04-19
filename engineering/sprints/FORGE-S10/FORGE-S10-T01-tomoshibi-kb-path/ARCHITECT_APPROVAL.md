# Architect Approval — FORGE-S10-T01

🗻 *Forge Architect*

**Status:** Approved

---

## Architectural Review

**Backwards compatibility:** Fully backwards compatible. `paths.engineering` already exists in `forge/sdlc-config.schema.json` with `"default": "engineering"` — existing projects are unaffected. Tomoshibi's prompt is advisory and per-file opt-in; declining has no side effects.

**Migration correctness:** Migration entry `"0.9.18"` → `"0.10.0"` is correct. `"regenerate": ["workflows:collator_agent"]` is appropriate — users must regenerate their collator_agent.md to gain the Tomoshibi invocation in the Finalize step. `breaking: false` is correct; all changes are additive. No manual steps required.

**Update path:** The change does not affect `/forge:update` itself (other than adding a new Step 7). The `check-update.js` hook is unmodified and passes `node --check`. The update flow is not disrupted.

**Cross-cutting concerns:** The KB path configurability touches init, update, remove, and collate — all correctly updated. Smoke-test and knowledge-base generation use the configured `{KB_PATH}` path. The Phase 5 calibration baseline in sdlc-init.md uses `{KB_PATH}/MASTER_INDEX.md` (the easy-to-miss reference noted in the PLAN). `remove.md` correctly reads KB path from config.

**Operational impact:** New `forge/agents/` directory introduced. This is a standard plugin-supported path (auto-discovered by plugin loader). No new disk-write sites beyond what Tomoshibi manages at runtime (managed sections in user agent instruction files — opt-in). New `docs/security/scan-v0.10.0.md` report committed. README security table updated.

**Security posture:** No new trust boundaries introduced. Tomoshibi writes only to user agent instruction files after explicit per-session approval. Security scan `docs/security/scan-v0.10.0.md` is present: 126 files, 0 critical, 2 carry-forward warnings (accepted), SAFE verdict. README and `docs/security/index.md` updated.

---

## Distribution Notes

- Version bump to `0.10.0` — first named agent in the plugin, new init phase, new update step, new collate finalization step.
- Migration entry `"0.9.18"` → `"0.10.0"` with `regenerate: ["workflows:collator_agent"]` — existing users must run `/forge:update` after upgrading to regenerate their collator_agent workflow.
- Security scan: `docs/security/scan-v0.10.0.md` — 126 files, 0 critical, 2 carry-forward warnings, SAFE.
- `docs/security/index.md` and README `## Security` table updated.

## Operational Notes

- The `forge/agents/` directory is new to the plugin. It is auto-discovered by the Claude Code plugin loader — no manual registration required.
- Users on previous versions: fully backwards compatible. The `paths.engineering` field defaults to `"engineering"` in the schema; no init re-run needed.
- After installing 0.10.0, users should run `/forge:update` to regenerate `collator_agent.md` so it gains the Tomoshibi invocation in the Finalize step.
- No manual steps required beyond the standard update flow.

## Follow-Up Items

- The `FORGE-S10-T01: undeclared field: "createdAt"` in validate-store is a data quality issue in the task record (field not in task schema). This should be addressed in a future store-repair or schema update sprint — it is not a blocker.
- The 34 pre-existing validate-store errors (FORGE-S09/S10 legacy event schema) remain an open item to address separately.
