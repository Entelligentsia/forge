# PLAN REVIEW — FORGE-S08-T06: Release engineering — version bump, migration, security scan

🌿 *Forge Supervisor*

**Task:** FORGE-S08-T06

---

**Verdict:** Approved

---

## Review Summary

The revised plan comprehensively addresses all previous review findings. Uncommitted material changes are now explicitly enumerated and included in the release scope. The `regenerate` targets correctly reflect command frontmatter and schema/tool spec changes. The migration notes cover all substantive changes including the list-skills rename and schema evolution.

## Feasibility

The approach is realistic and correctly scoped. The decision to include all uncommitted material changes in this release avoids version fragmentation. The four primary files (plugin.json, migrations.json, scan report, README) plus 12 uncommitted files are all small, low-risk changes. The S estimate remains appropriate.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes — 0.9.1 to 0.9.2 patch bump.
- **Migration entry targets correct?** Yes — `regenerate: ["commands", "tools"]` correctly reflects that command frontmatter and schema/tool spec changes require user-side regeneration.
- **Security scan requirement acknowledged?** Yes — `--source-path forge/` specified correctly.

## Security

No new security risks. The security scan is explicitly planned. The list-skills.js rename from hooks to tools reduces hook surface area (positive). All changes are to Markdown command files, meta documentation, and JSON configuration — no executable code changes that could introduce injection or exfiltration.

## Architecture Alignment

- Follows the established release engineering pattern from S07-T09 and prior releases.
- No npm dependencies introduced.
- Migration entry format follows the established schema.
- `breaking: false` and `manual: []` are correct.
- New schema fields (`inputTokens`, `outputTokens`, etc., `path`, `feature_id`) are all optional — no breaking changes.
- New `abandoned` status is additive to existing enums.

## Testing Strategy

The revised plan now includes:
- `node --check forge/tools/list-skills.js` — covers the renamed file
- `node forge/tools/validate-store.cjs --dry-run` — covers schema validation
- Migration chain walkability check
- All other verification steps are appropriate

---

## Advisory Notes for Implementation

1. When bumping the version, verify that the migration chain in `migrations.json` is walkable — the `0.9.1` key must exist as the prior version entry.
2. The security scan should be run against the full `forge/` directory AFTER committing the uncommitted changes (Step 0 must complete before Step 3).
3. The README Security Scan History row should use the date the scan is actually performed, not a pre-filled date.
4. The uncommitted changes in `.forge/store/` (task status updates, events) are NOT material and should NOT be included in the version bump commit — they are dogfooding data.
5. The deleted `.forge/store/events/FORGE-S02/...` event file is also NOT material.