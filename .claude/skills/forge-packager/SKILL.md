---
name: forge-packager
description: Version bump, migration entry, and CHANGELOG for Forge releases. Use when all changes are implemented and validated. Follows the exact CLAUDE.md versioning sequence.
---

# Forge Packager

Version bump, migration entry, and CHANGELOG for Forge releases.
Run this after all changes are implemented and validated (forge-validator).

## Iron Laws

1. ONLY edit files in `forge/`. NEVER edit `.forge/` or `engineering/` to fix Forge itself.
2. Every change to a `.cjs` tool must be preceded by a failing test.
3. Schema changes that affect entity lifecycle require concepts diagram updates.
4. Version bump required for material changes. Migration entry required. Tests must pass.
5. Silent continuation past failures is never acceptable.

## Procedure

### Step 1 — Read current version

```sh
node -e "console.log(require('./forge/.claude-plugin/plugin.json').version)"
```

### Step 2 — Determine new version

| Change type | Bump |
|-------------|------|
| Bug fix, small enhancement | Patch (0.X.Y → 0.X.Y+1) |
| New feature, workflow change, tool addition | Minor (0.X.Y → 0.X+1.0) |
| Breaking schema change, removed feature | Major (0.X.Y → 0+1.0.0) |

Most Forge changes are minor bumps. Patch bumps are for typos and
non-behavioural fixes. Major bumps are rare and require `breaking: true`.

### Step 3 — Bump version in plugin.json

Edit `forge/.claude-plugin/plugin.json` — update the `version` field.

### Step 4 — Add migration entry to migrations.json

Steps 4 and 5 are **parallel** — they have no ordering dependency. Complete both
before moving on to Step 6.

Add a new entry at the TOP of `forge/migrations.json`. The JSON key is the
previous version (acting as the `"from"` version):

```json
"0.X.Y": {
  "version": "0.X.Z",
  "date": "YYYY-MM-DD",
  "notes": "One-line human-readable summary.",
  "regenerate": ["workflows:specific_workflow", "personas:specific_persona"],
  "breaking": false,
  "manual": ["Run /forge:update to regenerate specific_workflow and specific_persona."]
}
```

**Critical: `regenerate` uses granular sub-targets, not bare categories.**

The update command supports `category:sub_target` syntax:
- ✗ `"workflows"` — regenerates ALL workflows (wasteful)
- ✓ `"workflows:orchestrate_task"` — regenerates only the changed workflow
- ✓ `"personas:orchestrator"` — regenerates only the changed persona

Only use a bare category if the change genuinely affects all items in that category.

If no regeneration is needed, use `"regenerate": []`.

`manual` describes any steps the user must perform after updating. If none,
use `"manual": []`.

If `"tools"` or `"workflows"` appears in `regenerate`, users will need to run
`/forge:update` after installing — make sure the migration notes make this clear.

### Step 5 — Add CHANGELOG entry

Edit `CHANGELOG.md` — prepend at the top (newest-first order):

```markdown
## [X.Y.Z] — YYYY-MM-DD

One-paragraph description of what changed.

**Regenerate:** targets, targets (if regeneration required; omit if not)

> Manual: step description (if manual steps required; omit if not)

---
```

Append `**△ Breaking**` to the heading if `breaking: true`.

### Step 6 — Verify tests pass

```sh
node --test forge/tools/__tests__/*.test.cjs
```

All tests must pass before the version bump is finalized.

### Step 7 — Remind about post-bump steps

The following steps are NOT performed by this skill (they belong to forge-validator):

1. Run `node forge/tools/build-manifest.cjs --forge-root forge/` (if meta files changed)
2. Run `node forge/tools/gen-integrity.cjs --forge-root forge/`
3. Update `EXPECTED=` hash in `forge/commands/health.md`
4. Run security scan: `/security-watchdog:scan-plugin forge:forge --source-path forge/`
5. Save scan report to `docs/security/scan-v{VERSION}.md`
6. Update `docs/security/index.md` and `README.md` Security table

Run `/forge-validator` to execute these steps.

## Checklist

After completing all steps, verify:

- [ ] `plugin.json` version bumped
- [ ] `migrations.json` entry added with granular sub-targets
- [ ] `CHANGELOG.md` entry prepended
- [ ] Test suite passes
- [ ] forge-validator run for post-bump steps