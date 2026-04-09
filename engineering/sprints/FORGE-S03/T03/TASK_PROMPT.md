# FORGE-S03-T03: Version bump to 0.6.1 with security scan and release commit

**Sprint:** FORGE-S03
**Estimate:** S
**Pipeline:** default

---

## Objective

Bump Forge to 0.6.1, run the mandatory security scan, update the README
security history table, and commit the release following the CLAUDE.md
versioning protocol.

**Depends on:** FORGE-S03-T01 and FORGE-S03-T02 both committed.

## Acceptance Criteria

1. `forge/.claude-plugin/plugin.json` `"version"` field is `"0.6.1"`.
2. `forge/migrations.json` has a `"0.6.0"` key with `"version": "0.6.1"` (added in T02).
3. `docs/security/scan-v0.6.1.md` exists and contains the full security scan report (not a summary).
4. `README.md` Security Scan History table has a row for v0.6.1.
5. All changes committed in a single commit with message `chore: Release v0.6.1 [FORGE-S03-T03]`.

## Steps

### 1. Verify prerequisites

Confirm T01 and T02 are committed:
```sh
git log --oneline -5
```

Confirm the 0.6.0→0.6.1 migration entry exists in `forge/migrations.json`.

### 2. Bump version

Edit `forge/.claude-plugin/plugin.json`:
```json
"version": "0.6.1"
```

### 3. Run security scan

```
/security-watchdog:scan-plugin forge:forge --source-path forge/
```

If the skill does not support `--source-path`, instruct it explicitly to scan
`/home/boni/src/forge/forge/` (the source directory, not the plugin cache).

Save the **full report** (do not summarise) to `docs/security/scan-v0.6.1.md`.

### 4. Update README

Add a row to the Security Scan History table in `README.md` under `## Security`:

| Version | Date | Report | Summary |
|---------|------|--------|---------|
| 0.6.1 | 2026-04-09 | [scan-v0.6.1.md](docs/security/scan-v0.6.1.md) | {one-line summary from scan} |

### 5. Validate and commit

```sh
node forge/tools/validate-store.cjs
node --check forge/tools/validate-store.cjs forge/tools/collate.cjs
```

Commit all changes:
```
chore: Release v0.6.1 [FORGE-S03-T03]
```

## Plugin Artifacts Modified

- `forge/.claude-plugin/plugin.json` — version bump
- `docs/security/scan-v0.6.1.md` — new security scan report
- `README.md` — security scan history row

## Operational Impact

- **Regeneration:** None. The 0.6.1 migration entry has `"regenerate": []`.
- **Breaking changes:** None.
