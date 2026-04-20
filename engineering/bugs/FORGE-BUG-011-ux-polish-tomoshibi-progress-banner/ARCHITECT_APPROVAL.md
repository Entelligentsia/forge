# Architect Approval — FORGE-BUG-011

🗻 *Forge Architect*

**Status:** Approved

## Distribution Notes

**Version bump:** `0.18.1` → `0.19.0` — correct minor-level bump for a bundled
UX polish touching three sub-issues (gh#51 tomoshibi prefix lowercase, gh#52
progress IPC persona emoji, gh#54 ensure-ready single-line banner). All three
changes are material (plugin-shipped agents and tools) and warrant a version
stamp per CLAUDE.md policy.

**Migration entry:** `forge/migrations.json` has a correct top-level keyed
entry under `"0.18.1"` pointing at `"version": "0.19.0"` with
`"regenerate": []`, `"breaking": false`, `"manual": []`. The zero-regenerate
decision is correct: (a) `tomoshibi.md` is a plugin-shipped agent at
`$FORGE_ROOT/agents/tomoshibi.md` — there is no generated copy at
`.forge/agents/`, so users receive the fix in-place via `/forge:update`;
(b) `store-cli.cjs` and `ensure-ready.cjs` are plugin tools that update
automatically on install with no regeneration required. Users running
`/forge:update` will pick up the changes and no follow-up action is needed.

**Security scan:** `docs/security/scan-v0.19.0.md` present and SAFE TO USE
(166 files, 0 critical, 3 warnings, 4 info). All three warnings are
accepted carry-forwards from v0.18.1 (the `/tmp` update-check cache write,
the bounded `raw.githubusercontent.com` version-check GET, and the
`FORGE_SKIP_WRITE_VALIDATION` documented bypass). The v0.19.0 delta
paragraph correctly identifies the only new code surface since v0.18.1
(the preflight-gate.cjs read-only fix — already merged as `3576f59`) and
the three new inert JSON Schema files. `docs/security/index.md` has the
v0.19.0 row prepended at the top; `README.md` Security table shows
exactly three rows (v0.19.0, v0.18.1, v0.18.0) with v0.15.0 correctly
rolled off per the CLAUDE.md invariant.

**User-facing impact:** Pure UX polish. Tomoshibi's slash-command
suggestions now correctly track the lowercase command namespace
(`.claude/commands/{prefix_lower}/`) even when the stored prefix is
uppercase; progress IPC heartbeat lines gain a persona emoji and bracketed
status for readability; ensure-ready's capability-upgrade announcement
collapses to a single inline line. No API breaks, no disk-layout changes,
no new trust boundaries.

## Operational Notes

**Regeneration:** None required. `/forge:update` alone is sufficient for
all installed users.

**Deployment:** Plugin-ships-code only — no changes to hooks, no new
write paths, no new network calls. The existing `validate-write.js` hook
is untouched; the existing schema set gains no new required fields.
Installed users on v0.18.1 advance to v0.19.0 transparently.

**Test posture:** 500/500 tests pass (up from baseline 494 — net +6 for
the new store-cli IPC and ensure-ready single-line contracts). No test
deletions; three ensure-ready tests updated in place to the new
single-line contract as documented in the plan. TDD order was honoured
(failing test → implementation → green) per PROGRESS.md.

**Integrity:** `integrity.json` regenerated for v0.19.0 (20 files).
`verify-integrity.cjs` hash unchanged, so the `EXPECTED=` literal in
`commands/health.md` needed no update — correct handling.

**Manual steps for users:** None.

## Follow-Up Items

- **None blocking.** The three carry-forward security warnings remain
  documented and accepted. No new tech debt was surfaced during this
  review.
- **Observation (non-blocking):** The progress-IPC stdout summary in
  `store-cli.cjs` uses a lazy `require('./banners.cjs')` + try/catch for
  graceful degradation on unknown banner keys. This pattern is sound but
  worth codifying as a shared helper if other CLI surfaces begin resolving
  persona emoji at emit time. Candidate future refactor — not required now.
