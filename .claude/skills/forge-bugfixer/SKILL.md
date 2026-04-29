---
name: forge-bugfixer
description: Triage, diagnose, and fix bugs in the Forge plugin source. Use when fixing a reported GitHub issue or discovered bug in forge/. Enforces test-first bug fixing and CLAUDE.md compliance.
---

# Forge Bugfixer

Triage, diagnose, and fix bugs in the Forge plugin source (`forge/`).

## Iron Laws

1. ONLY edit files in `forge/`. NEVER edit `.forge/` or `engineering/` to fix Forge itself.
2. Every change to a `.cjs` tool must be preceded by a failing test.
3. Schema changes that affect entity lifecycle require concepts diagram updates.
4. Version bump required for material changes. Migration entry required. Tests must pass.
5. Silent continuation past failures is never acceptable.

## Two-Layer Boundary

Bugs in Forge's runtime behaviour are often observed in the generated output
(`.forge/workflows/`, `.forge/personas/`, `.forge/skills/`). The fix NEVER goes
there. The fix goes in the meta source:

| Observed in | Fix goes in |
|-------------|-------------|
| `.forge/workflows/orchestrate_task.md` | `forge/meta/workflows/meta-orchestrate.md` |
| `.forge/personas/orchestrator.md` | `forge/meta/personas/meta-orchestrator.md` |
| `.forge/skills/engineer-skills.md` | `forge/meta/skills/meta-engineer-skills.md` |
| `.forge/store/` data corruption | `forge/tools/store-cli.cjs` or `forge/hooks/validate-write.js` |
| Command behaves wrong | `forge/commands/<name>.md` |
| Hook fires incorrectly | `forge/hooks/<name>.js` |
| Tool script bug | `forge/tools/<name>.cjs` |

## Procedure

### Step 1 — Triage the bug

1. Read the bug report (GitHub issue, error message, observed behaviour)
2. Classify: Is this a bug in Forge itself, or a bug in the project using Forge?
3. If in Forge: identify which component (workflow, persona, tool, hook, command, schema)
4. Classify root cause category: `validation`, `auth`, `business-rule`,
   `data-integrity`, `race-condition`, `integration`, `configuration`, `regression`
5. When multiple root causes apply, classify by the deepest one: if a generated
   file is wrong because the meta was wrong, the root cause is `business-rule`
   (the meta), not `regression` (the stale file)
6. Create or locate the bug record via `store-cli write bug` — NEVER write
   `.forge/store/bugs/*.json` directly

### Step 2 — Locate the defect

1. Find the specific file in `forge/` that contains the bug
2. Identify the exact function, section, or line causing the issue
3. For workflow bugs: read the meta source, NOT the generated `.forge/workflows/` output

### Step 3 — Write a failing test (for `.cjs` tools)

This is the Iron Law. No exceptions.

1. Open `forge/tools/__tests__/<tool>.test.cjs`
2. Write a test that reproduces the bug
3. Run it: `node --test forge/tools/__tests__/<tool>.test.cjs`
4. Confirm: the test FAILS (proves the bug exists)

For workflow/persona/command bugs (markdown files), there are no automated
tests. Instead: document the bug reproduction steps and expected vs actual
behaviour in the implementation notes.

### Step 4 — Fix the defect

1. Edit the source file in `forge/`
2. If it's a meta source (`forge/meta/`), do NOT edit the generated output
3. If you added a new meta file, update `build-manifest.cjs` and run it

### Step 5 — Verify the fix

1. For `.cjs` tools: run the specific test, then the full suite:
   ```sh
   node --test forge/tools/__tests__/<tool>.test.cjs
   node --test forge/tools/__tests__/*.test.cjs
   ```
2. For other files: verify the change by reading the updated file

### Step 6 — Assess versioning impact

Most bug fixes in Forge are material changes (they affect installed projects).

**Beware mis-classification:** Plans routinely mark bug fixes as "not material" when they are. When in doubt, bump.

1. **Version bump required?** — Yes, unless the bug is documentation-only
2. **Migration required?** — Yes, if workflows or personas need regeneration
3. **Regenerate targets?** — Use granular sub-targets (e.g., `"workflows:orchestrate_task"`)
4. **Breaking?** — Only if the fix changes the contract in a way that requires manual user action

Suggest the migration entry:
```json
"0.X.Y": {
  "version": "0.X.Z",
  "date": "YYYY-MM-DD",
  "notes": "Fix <bug-description> (GH-NN).",
  "regenerate": ["workflows:affected_workflow"],
  "breaking": false,
  "manual": []
}
```

### Step 7 — Post-fix steps

Remind to run:
- `/forge-packager` — for the version bump, migration, and CHANGELOG
- `/forge-validator` — for the compliance gate (tests, integrity, security scan)