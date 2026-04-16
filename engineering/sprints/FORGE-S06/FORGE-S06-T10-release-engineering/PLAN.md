# PLAN — FORGE-S06-T10: Release engineering — version bump, migration, security scan

🌱 *Forge Engineer*

**Task:** FORGE-S06-T10
**Sprint:** FORGE-S06
**Estimate:** S

---

## Objective

Bump Forge from `0.7.11` to `0.8.0`, add a migration entry in `forge/migrations.json`
that summarises the cumulative FORGE-S06 sprint changes (T01–T09), run the security
scan, save the report to `docs/security/scan-v0.8.0.md`, and update the README
security table. This is the final release gate for Sprint S06.

> **Note on version numbers:** The task prompt was drafted when the sprint started
> at `0.7.2`. By the time T10 is being planned, the version has advanced to `0.7.11`
> through individual per-task bumps (T01–T09 each carried their own version bump
> and individual migration entry). The correct migration key is therefore `"0.7.11"`,
> not `"0.7.2"`. The new version is still `0.8.0` as intended.

---

## Approach

This is a pure release-engineering task — no functional code changes. Steps:

1. Bump `version` in `forge/.claude-plugin/plugin.json` from `0.7.11` to `0.8.0`.
2. Add a single consolidated migration entry in `forge/migrations.json` keyed
   `"0.7.11"` with:
   - `"version": "0.8.0"`
   - `"notes"` — one-line summary of the sprint as a whole
   - `"regenerate": ["workflows", "personas"]` (users need both; workflows had
     Persona sections removed, personas are now a default regenerate target)
   - `"breaking": false`
   - `"manual": []`
3. Run `/security-watchdog:scan-plugin forge:forge --source-path forge/` to obtain
   a fresh scan report for the new version.
4. Save the full scan report to `docs/security/scan-v0.8.0.md`.
5. Add a row to the README security table (above the existing 0.7.11 row).
6. Run `node forge/tools/validate-store.cjs --dry-run` to confirm store integrity.

---

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/.claude-plugin/plugin.json` | Bump `"version"` from `"0.7.11"` to `"0.8.0"` | Material sprint release |
| `forge/migrations.json` | Add entry keyed `"0.7.11"` → `0.8.0` | Migration chain must be complete |
| `docs/security/scan-v0.8.0.md` | Create — full scan report | Required by CLAUDE.md for every version bump |
| `README.md` | Add row to security table | Required by CLAUDE.md |

No changes to `forge/commands/`, `forge/hooks/`, `forge/tools/`, `forge/schemas/`,
or `forge/meta/`. This task is docs/metadata only — except that `forge/.claude-plugin/plugin.json`
and `forge/migrations.json` live inside `forge/`, so a security scan is required.

---

## Plugin Impact Assessment

- **Version bump required?** Yes — bumping `0.7.11` → `0.8.0` as per sprint plan.
- **Migration entry required?** Yes — keyed `"0.7.11"`, regenerate `["workflows", "personas"]`.
- **Security scan required?** Yes — any change inside `forge/` requires a scan.
- **Schema change?** No — no schema files are modified.

### Migration entry rationale

- `"workflows"` — meta-workflows no longer contain inline `## Persona` sections
  (changed in T02); users must regenerate workflows so their project workflows pick up
  the persona-purified templates.
- `"personas"` — `/forge:regenerate` now includes `personas` in its default run (T03);
  users should regenerate personas to ensure noun-based persona files are present and
  current.

---

## Testing Strategy

- Syntax check: N/A — no `.js`/`.cjs` files are modified.
- Store validation: `node forge/tools/validate-store.cjs --dry-run` — must exit 0.
- Manual verification: confirm `plugin.json` reads `"version": "0.8.0"` and
  `migrations.json` has the `"0.7.11"` key.

---

## Acceptance Criteria

- [ ] `forge/.claude-plugin/plugin.json` `"version"` is `"0.8.0"`
- [ ] `forge/migrations.json` has key `"0.7.11"` with `"version": "0.8.0"`,
      `"regenerate": ["workflows", "personas"]`, `"breaking": false`, `"manual": []`
- [ ] `docs/security/scan-v0.8.0.md` exists and contains the full scan report
- [ ] README security table has a row for version `0.8.0`
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0
- [ ] All modified files end with a trailing newline

---

## Operational Impact

- **Distribution:** Users upgrading via `/forge:update` will be instructed to run
  `/forge:regenerate workflows` and `/forge:regenerate personas` to pick up the
  sprint's functional workflow changes.
- **Backwards compatibility:** `breaking: false` — existing project stores, configs,
  and custom commands are unaffected. Only generated workflow/persona artifacts need
  regeneration.
