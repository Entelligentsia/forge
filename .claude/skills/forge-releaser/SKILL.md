---
name: forge-releaser
description: Promote a validated Forge version to skillforge distribution. Use after forge-packager and forge-validator have completed. Handles merge, tag, push, and skillforge repo update with rollback.
---

# Forge Releaser

Promote a validated Forge version to skillforge distribution.
Run this after `/forge-packager` and `/forge-validator` have both completed successfully.

## Iron Laws

1. ONLY edit files in `forge/`. NEVER edit `.forge/` or `engineering/` to fix Forge itself.
2. Every change to a `.cjs` tool must be preceded by a failing test.
3. Schema changes that affect entity lifecycle require concepts diagram updates.
4. Version bump required for material changes. Migration entry required. Tests must pass.
5. Silent continuation past failures is never acceptable.

## Prerequisites

Before invoking this skill, confirm ALL of the following:

- [ ] `/forge-validator` completed with all gates passing
- [ ] All changes are committed on `main`
- [ ] Working tree is clean (`git status` shows no uncommitted changes)
- [ ] You know the version being released (from `forge/.claude-plugin/plugin.json`)

If any prerequisite is missing, STOP. Do not proceed with the release.

## Procedure

### Step 1 — Verify clean state

```sh
git status
git log --oneline -3
```

Confirm: working tree clean, latest commit is the version bump.

### Step 2 — Merge main into release

```sh
git checkout release
git merge main
```

If merge conflicts occur:
1. DO NOT force-push or `--no-verify`
2. Resolve conflicts manually, favouring `main` branch content
3. Commit the merge
4. Verify tests still pass: `node --test forge/tools/__tests__/*.test.cjs`

### Step 3 — Create and push version tag

Replace `X.Y.Z` with the version from `plugin.json`:

```sh
git tag -a vX.Y.Z release -m "Release vX.Y.Z"
git push origin release
git push origin vX.Y.Z
```

The tag ensures skillforge gets a fresh clone and breaks version caches
in Claude Code's plugin installation system.

### Step 4 — Update skillforge repository

```sh
[ -d ../skillforge ] || git clone https://github.com/Entelligentsia/skillforge.git ../skillforge
cd ../skillforge
git pull origin main
```

Edit `.claude-plugin/marketplace.json`: change the forge entry's `"ref": "release"`
to `"ref": "vX.Y.Z"`.

```sh
git commit -am "chore: pin forge to vX.Y.Z tag"
git push origin main
cd ../forge
```

### Step 5 — Switch back to main

```sh
git checkout main
```

### Step 6 — Verify distribution

After pushing, verify:
1. Tag exists: `git tag -l 'vX.Y.Z'`
2. Skillforge references the tag: `grep -c "vX.Y.Z" ../skillforge/.claude-plugin/marketplace.json`
3. Update URLs in `forge/.claude-plugin/plugin.json` point to the correct branch

## Rollback

If any step fails AFTER pushing:

1. **Tag pushed but skillforge not updated:** Complete the skillforge update
   manually. The tag is already public — rolling it back is worse than completing.
2. **Skillforge push failed:** Fix the issue and push again.
3. **Merge to release broke something:** Fix on `main`, bump version, and
   re-run the full release process. Do NOT delete or move the tag.

If a step fails BEFORE pushing, simply switch back to `main` and fix the issue:

```sh
git checkout main
```

## Checklist

After completing all steps, verify:

- [ ] `release` branch merged from `main`
- [ ] Version tag created and pushed
- [ ] `release` branch pushed to origin
- [ ] Skillforge repo updated with new tag reference
- [ ] Back on `main` branch
- [ ] Working tree clean