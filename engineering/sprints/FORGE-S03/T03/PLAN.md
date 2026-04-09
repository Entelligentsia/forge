# PLAN — FORGE-S03-T03: Version bump to 0.6.1 with security scan and release commit

🌱 *Forge Engineer*

**Task:** FORGE-S03-T03
**Sprint:** FORGE-S03
**Estimate:** S

---

## Objective

Bump Forge from 0.6.0 to 0.6.1, run the mandatory security scan per CLAUDE.md
versioning protocol, update the README security scan history table, and produce
a clean release commit. T01 and T02 have already been committed; the
`0.6.0→0.6.1` migration entry was added in T02.

## Approach

1. Verify prerequisites (T01/T02 committed, migration entry present).
2. Edit `forge/.claude-plugin/plugin.json` to set `"version": "0.6.1"`.
3. Run `/security-watchdog:scan-plugin` on the source directory `forge/`.
4. Save the full scan report to `docs/security/scan-v0.6.1.md`.
5. Add a row to the Security Scan History table in `README.md`.
6. Run `node forge/tools/validate-store.cjs --dry-run` and `node --check` on JS files.
7. Commit all changes with message `chore: Release v0.6.1 [FORGE-S03-T03]`.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/.claude-plugin/plugin.json` | `"version": "0.6.0"` → `"0.6.1"` | Canonical version source of truth |
| `docs/security/scan-v0.6.1.md` | Create — full security scan report | Required by CLAUDE.md versioning protocol for every release |
| `README.md` | Add row to Security Scan History table | Track scan history per CLAUDE.md |

## Plugin Impact Assessment

- **Version bump required?** Yes — this task IS the version bump to 0.6.1.
- **Migration entry required?** Already present in `forge/migrations.json` (added by T02). No action needed.
- **Security scan required?** Yes — `forge/` is modified (plugin.json version field change).
- **Schema change?** No.

## Testing Strategy

- Syntax check: `node --check forge/tools/validate-store.cjs forge/tools/collate.cjs` (no new JS files modified)
- Store validation: `node forge/tools/validate-store.cjs --dry-run` (no schema change; run as a gate check)
- Verify scan report exists and is non-empty before committing.

## Acceptance Criteria

- [ ] `forge/.claude-plugin/plugin.json` `"version"` is `"0.6.1"`
- [ ] `forge/migrations.json` has `"0.6.0"` key with `"version": "0.6.1"` (pre-existing from T02)
- [ ] `docs/security/scan-v0.6.1.md` exists with full (non-summarised) scan report
- [ ] `README.md` Security Scan History table has a row for v0.6.1 with date `2026-04-09`
- [ ] `node --check` passes on all modified JS/CJS files
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0
- [ ] All changes in a single commit with message `chore: Release v0.6.1 [FORGE-S03-T03]`

## Operational Impact

- **Distribution:** Users will see the new version available; running `/forge:update` from
  `0.6.0` will apply the `0.6.0→0.6.1` migration (no regeneration required, no breaking changes).
- **Backwards compatibility:** Fully backwards compatible. The migration entry has `"regenerate": []`
  and `"breaking": false`.
