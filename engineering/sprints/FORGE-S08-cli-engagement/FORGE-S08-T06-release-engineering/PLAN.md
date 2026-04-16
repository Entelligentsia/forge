# PLAN — FORGE-S08-T06: Release engineering — version bump, migration, security scan

**Task:** FORGE-S08-T06
**Sprint:** FORGE-S08
**Estimate:** S
**Depends on:** FORGE-S08-T01, T02, T03, T04, T05

---

## Objective

Batch all S08 changes plus uncommitted material changes in `forge/` into a single version bump, write the migration entry, run the security scan, and update README security history.

## Approach

All S08 changes are command/meta file edits — no new tools, no new hooks, no generated artifact structure changes. There are also uncommitted material changes (command frontmatter, schema updates, tool spec update, path references) that must be included in this release to avoid version fragmentation.

The migration entry needs `regenerate: ["commands", "tools"]` because command frontmatter changes and schema/tool spec changes require users to regenerate their local copies.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/.claude-plugin/plugin.json` | Bump version from 0.9.1 to 0.9.2 | Required for every material change |
| `forge/migrations.json` | Add migration entry from 0.9.1 to 0.9.2 | Required per CLAUDE.md |
| `docs/security/scan-v0.9.2.md` | Save full security scan report | Required per CLAUDE.md |
| `README.md` | Add row to Security Scan History table | Required per CLAUDE.md |

Additionally, the following uncommitted changes must be committed before the version bump (they are material changes in `forge/`):

| Uncommitted File | Change | Rationale |
|---|---|---|
| `forge/commands/add-pipeline.md` | Added `name:` frontmatter | Command registration |
| `forge/commands/health.md` | Added `name:` frontmatter + `list-skills.js` path fix (hooks → tools) | Command registration + path correction for T01 rename |
| `forge/commands/migrate.md` | Added `name:` frontmatter | Command registration |
| `forge/commands/remove.md` | Added `name:` frontmatter | Command registration |
| `forge/commands/report-bug.md` | Added `name:` frontmatter | Command registration |
| `forge/commands/store-repair.md` | Added `name:` frontmatter | Command registration |
| `forge/commands/update-tools.md` | Added `name:` frontmatter | Command registration |
| `forge/meta/skill-recommendations.md` | `list-skills.js` path fix (hooks → tools) | Path correction for T01 rename |
| `forge/meta/store-schema/event.schema.md` | Token fields (`inputTokens`, `outputTokens`, etc.) + `tokenSource` enum | Schema evolution from S01 |
| `forge/meta/store-schema/sprint.schema.md` | `path` field + `abandoned` status | Schema evolution from S06/S07 |
| `forge/meta/store-schema/task.schema.md` | `feature_id` field + `abandoned` status | Schema evolution from S06/S07 |
| `forge/meta/tool-specs/seed-store.spec.md` | Bug status default `open` → `reported` | Alignment with BUG-002 fix |

## Plugin Impact Assessment

- **Version bump required?** Yes — this task IS the version bump.
- **Migration entry required?** Yes — `regenerate: ["commands", "tools"]`. Command frontmatter changes require `commands` regeneration; schema and tool spec changes require `tools` regeneration.
- **Security scan required?** Yes — any change to `forge/` requires a scan.
- **Schema change?** Yes — event, sprint, and task schemas have new fields and status values. These are documentation schemas in `forge/meta/store-schema/` (not the JSON schemas in `forge/schemas/` used by validate-store, but they feed into the tool specs).

## Detailed Changes

### 0. Commit uncommitted material changes

Stage and commit the uncommitted `forge/` changes listed above. These are small, low-risk changes that align with the S08 release. Commit message should reference S08.

### 1. Version bump

Read current version from `forge/.claude-plugin/plugin.json`. Increment patch version from `0.9.1` to `0.9.2`. Record as `NEW_VERSION`.

### 2. Migration entry

Add to `forge/migrations.json` under the `0.9.1` key:

```json
{
  "0.9.1": {
    "version": "0.9.2",
    "date": "<DATE_OF_SCAN>",
    "notes": "CLI engagement — init pre-flight plan, phase/step banners, checkpoint/resume, per-file status lines, batch Step 5 audit, command name frontmatter, list-skills moved from hooks to tools, schema updates (event tokens, sprint path, task feature_id, abandoned status), seed-store bug status default",
    "regenerate": ["commands", "tools"],
    "breaking": false,
    "manual": []
  }
}
```

### 3. Security scan

Run the scan on the source directory (not the cache):

```
/security-watchdog:scan-plugin forge:forge --source-path forge/
```

Save the full report (do not summarise) to `docs/security/scan-v0.9.2.md`.

### 4. README update

Add a row to the Security Scan History table in `README.md` under `## Security`:

```markdown
| 0.9.2 | <DATE> | [scan-v0.9.2.md](docs/security/scan-v0.9.2.md) | CLI engagement — commands only, no new tools or hooks; schema and tool spec updates |
```

## Testing Strategy

- Verify `node --check forge/tools/list-skills.js` — the renamed file must be valid
- Verify `node --check forge/tools/validate-store.cjs` passes
- Verify `node forge/tools/validate-store.cjs --dry-run` exits 0 — required because schema changes affect validation
- Verify `forge/.claude-plugin/plugin.json` version is incremented to 0.9.2
- Verify `forge/migrations.json` has a new entry with `from` = 0.9.1, `version` = 0.9.2
- Verify migration chain is walkable from oldest entry to 0.9.2 (no gaps)
- Verify `docs/security/scan-v0.9.2.md` exists and contains the full report
- Verify README Security table has the new row for 0.9.2
- Verify all uncommitted `forge/` changes are committed before the version bump commit

## Acceptance Criteria

- [ ] All uncommitted material changes in `forge/` are committed
- [ ] `forge/.claude-plugin/plugin.json` version is bumped from 0.9.1 to 0.9.2
- [ ] `forge/migrations.json` contains a new entry: `from` = 0.9.1, `version` = 0.9.2
- [ ] Migration `notes` mentions: init pre-flight, banners, checkpoint, status lines, batch Step 5, command name frontmatter, list-skills rename, schema updates
- [ ] `regenerate: ["commands", "tools"]`, `breaking: false`, `manual: []`
- [ ] `docs/security/scan-v0.9.2.md` exists with full scan report
- [ ] `README.md` Security Scan History table contains a row for 0.9.2
- [ ] `node --check forge/tools/list-skills.js` exits 0
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0

## Operational Impact

- **Distribution:** Users must run `/forge:update` after installing 0.9.2. The migration entry instructs them to regenerate commands and tools.
- **Backwards compatibility:** Fully backwards compatible. No breaking changes. New schema fields (`inputTokens`, `outputTokens`, etc., `path`, `feature_id`) are all optional. New `abandoned` status value is additive.