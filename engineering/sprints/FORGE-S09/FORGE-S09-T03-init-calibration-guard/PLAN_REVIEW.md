# PLAN REVIEW — FORGE-S09-T03: Init — calibration baseline write + incomplete init guard

🌿 *Forge Supervisor*

**Task:** FORGE-S09-T03

---

**Verdict:** Approved

---

## Review Summary

The plan correctly scopes the work to `forge/init/sdlc-init.md` only, using only Node.js
built-ins for all inline scripts, and correctly handles the ordering constraint (guard before
baseline, both before progress checkpoint). The security posture is clean — no untrusted
user input is interpolated in any script. One advisory gap: `forge/migrations.json` is not
listed in the Files to Modify table, though the impact assessment correctly identifies it as
required.

## Feasibility

Approach is realistic. Phase 5 of `sdlc-init.md` (lines 128–139) is a thin delegation block
that reads `generate-skills.md` and writes the progress checkpoint. Both new steps insert
cleanly before the progress write. The plan's decision to leave `forge/commands/init.md`
unchanged is verified correct — the pre-flight plan in init.md describes phase names and
counts, neither of which changes.

All inline scripts use only `crypto` and `fs` from Node.js built-ins. Scope is appropriate
for an M estimate.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes — `0.9.9` → `0.9.10`. Current version confirmed as `0.9.9`.
- **Migration entry targets correct?** Yes — `regenerate: []` is correct. `sdlc-init.md` is
  plugin source, not a user-project artifact. Existing projects do not need to regenerate
  anything; they get the updated behaviour automatically when the plugin upgrades.
- **Security scan requirement acknowledged?** Yes — explicitly required in Plugin Impact Assessment.

## Security

No prompt injection risk. New Markdown instructions reference only hardcoded field names
from the schema `required` arrays and hardcoded file paths. No user-supplied values are
interpolated into any script or message string. The `node -e` inline scripts construct
their own output from static file reads — no shell injection vector via user input.

The completeness guard display format uses literal field names from `sdlc-config.schema.json`
(e.g. `project.prefix`, `commands.test`) — these are compile-time constants, not runtime
values read from untrusted sources.

## Architecture Alignment

- Only built-in `require()` calls (`crypto`, `fs`). No npm. Compliant.
- No new JS/CJS files introduced. No hook discipline concerns.
- Paths in inline scripts: `.forge/config.json`, `$FORGE_ROOT/.claude-plugin/plugin.json`,
  `engineering/MASTER_INDEX.md`, `.forge/store/sprints/` — these are written as literal
  strings in a Markdown instruction file. Not a tool-code hardcoding violation (tool-code
  rule applies to `.cjs` files, not to `node -e` illustrative commands in Markdown).
- No schema changes. `calibrationBaseline` was already added to `sdlc-config.schema.json`
  by T02 — verified.

## Testing Strategy

Adequate for a Markdown-only change. `node --check` is correctly excluded (no JS files
modified). `validate-store --dry-run` as smoke test is appropriate. Three manual trace
paths (happy, partial-config, fresh-init) cover all branches of both new features.

---

## If Approved

### Advisory Notes

1. **Files to Modify table is incomplete** — `forge/migrations.json` must be added as a
   file to modify. The impact assessment correctly identifies the migration entry as required,
   but it is absent from the Files to Modify table. The implementation phase should add the
   migration entry to `forge/migrations.json` (with `from: "0.9.9"`, `version: "0.9.10"`,
   `regenerate: []`, `breaking: false`).

2. **Version bump** — `forge/.claude-plugin/plugin.json` must also be modified (version
   `0.9.9` → `0.9.10`). This is implied by the impact assessment but not listed in the Files
   to Modify table. Implementation should add it explicitly.

3. **Security scan** — because `forge/` is modified, implementation must run
   `/security-watchdog:scan-plugin forge:forge --source-path forge/` and save the report to
   `docs/security/scan-v0.9.10.md`. The plan correctly requires this; implementation must
   not skip it.

4. **Sprint coverage filter** — the `sprintsCovered` node script filters on `status` values
   `done` and `retrospective-done`. Consider also including `"approved"` if that is ever a
   terminal sprint status, but based on current schema the two listed values are sufficient.
   Non-blocking.
