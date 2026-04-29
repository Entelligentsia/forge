# Decision: Split Public Plugin from Private Engineering Data

**Status:** Proposed  
**Date:** 2026-04-29

---

## Context

The `Entelligentsia/forge` repo currently serves three responsibilities:

1. **Marketplace** — `.claude-plugin/marketplace.json`, distribution metadata
2. **Plugin source** — `forge/` directory, installable by all users
3. **Engineering work** — `engineering/` (sprints, bugs, features, KB), `.forge/` (dogfooding instance)

Responsibility 3 is private Entelligentsia data — sprint plans, cost reports, bug triage, architecture decisions — that should not be in a public repo. Git history makes removal after-the-fact impractical without a `filter-repo` purge.

Hard constraints:
- Marketplace coordinates remain `Entelligentsia/forge`
- Plugin install coordinates remain `forge@forge`
- `forge/.claude-plugin/plugin.json` paths unchanged

---

## Decision

Split into two repos using a **gitignored clone** pattern:

```
Entelligentsia/forge                  ← public (plugin + marketplace + docs)
Entelligentsia/forge-engineering       ← private (engineering + dogfooding)
```

Developer setup nests the public repo inside the private repo:

```
~/src/forge-engineering/               ← CWD for sprint work
├── .git/
├── .gitignore                         ← "forge/" entry
├── engineering/                       ← sprints, bugs, features, KB
├── .forge/                            ← generated dogfooding instance
│   └── config.json                    ← paths.forgeRoot = "./forge/forge"
├── CLAUDE.md                          ← private engineering instructions
└── forge/                             ← gitignored clone of Entelligentsia/forge
    ├── forge/                         ← plugin source
    ├── .claude-plugin/
    └── CLAUDE.md                      ← public project guidelines
```

---

## Why Gitignored Clone (Not Submodule, Not Side-by-Side)

| Concern | Gitignored Clone | Git Submodule | Side-by-Side |
|---------|-----------------|---------------|--------------|
| Single CWD | ✅ | ✅ | ❌ two directories |
| Git coupling | ✅ none | ❌ pointer drift, detached HEAD | ✅ none |
| Commit workflow | ✅ normal | ❌ two-step | ✅ normal |
| CI complexity | ✅ none | ❌ must init submodules | ✅ none |
| External PRs | ✅ independent | ❌ pointer sync needed | ✅ independent |
| Path config | ✅ `./forge/forge` | ✅ `./forge/forge` | ⚠️ `../forge/forge` or absolute |
| Reproducibility | ⚠️ manual | ✅ pinned SHA | ⚠️ manual |

Submodules solve commit pinning but introduce git coupling that costs more than it saves for a two-repo setup with one private contributor. Side-by-side works but requires path juggling and two directories. Gitignored clone gets single-CWD convenience without submodule coupling.

---

## What Moves to `forge-engineering`

| Path | Current location | New location | Reason |
|------|-----------------|--------------|--------|
| `engineering/` | `~/src/forge/engineering/` | `~/src/forge-engineering/engineering/` | Private sprint/bug data |
| `.forge/` | `~/src/forge/.forge/` | `~/src/forge-engineering/.forge/` | Dogfooding instance, generated |
| KB references in CLAUDE.md | Root `CLAUDE.md` | Split: public stays, private moves | Private workflow pointers |
| `.forge/config.json` | `~/src/forge/.forge/` | `~/src/forge-engineering/.forge/` | Path config for private repo |

## What Stays in Public `Entelligentsia/forge`

| Path | Reason |
|------|--------|
| `forge/` | Plugin source — install target |
| `.claude-plugin/marketplace.json` | Marketplace descriptor |
| `docs/` | Public documentation |
| `CLAUDE.md` | Public project guidelines (stripped of engineering refs) |
| `README.md`, `LICENSE` | Standard repo files |

---

## Path Resolution After Split

`.forge/config.json` already has configurable paths:

```json
{
  "paths": {
    "engineering": "engineering",
    "store": ".forge/store",
    "workflows": ".forge/workflows",
    "commands": ".claude/commands",
    "templates": ".forge/templates",
    "customCommands": "engineering/commands",
    "forgeRoot": "./forge/forge"
  }
}
```

All `.cjs` tools resolve paths from this config at runtime (`config.paths?.engineering || 'engineering'`). The only change is `paths.forgeRoot` — currently an absolute path to the installed plugin, will become `./forge/forge` (relative to `forge-engineering/`).

Workflow `.md` files (meta-*) contain hardcoded `engineering/` and `.forge/` references. These are prompt templates, not scripts. Since CWD is `forge-engineering/`, relative paths resolve correctly. Zero code changes needed.

---

## Migration Steps

### 1. Create private repo

```bash
# Create Entelligentsia/forge-engineering on GitHub (private)
git clone https://github.com/Entelligentsia/forge-engineering.git ~/src/forge-engineering
```

### 2. Copy private data

```bash
cp -r ~/src/forge/engineering/ ~/src/forge-engineering/
cp -r ~/src/forge/.forge/ ~/src/forge-engineering/
```

### 3. Update `.forge/config.json`

Change `paths.forgeRoot` to `"./forge/forge"` in `forge-engineering/.forge/config.json`.

### 4. Clone public repo inside private repo

```bash
cd ~/src/forge-engineering
git clone https://github.com/Entelligentsia/forge.git forge
```

### 5. Add `.gitignore` entry

```bash
echo "forge/" >> ~/src/forge-engineering/.gitignore
```

### 6. Create private CLAUDE.md

Split current CLAUDE.md — public parts stay in `forge/CLAUDE.md`, private engineering instructions go to `forge-engineering/CLAUDE.md`.

### 7. Purge private data from public repo history

```bash
cd ~/src/forge
git filter-repo --path engineering/ --invert-paths
git filter-repo --path .forge/ --invert-paths
git push origin --force
```

Same treatment on `release` branch.

### 8. Add `.forge/` to public `.gitignore`

```bash
echo ".forge/" >> ~/src/forge/.gitignore
```

`engineering/` is already gone (filter-repo). `.forge/` is generated output and should never be tracked in the public repo.

### 9. Verify

- `forge@forge` install still works from public repo
- Sprint commands work from `forge-engineering/` CWD
- `git log` in public repo shows no engineering artifacts
- `git status` in `forge-engineering/` does not show `forge/` directory

---

## Risks and Mitigations

### Risk 1: `git clean -fdx` deletes `forge/` clone

**Impact:** High — loses uncommitted work and requires re-clone.  
**Likelihood:** Low — developers rarely run `git clean -fdx` intentionally.

**Mitigations:**
- Document in `forge-engineering/CLAUDE.md`: "Never run `git clean -fdx` — it deletes the gitignored `forge/` clone."
- Add `forge/` to `.git/info/exclude` as well (excluded from `git clean` but not visible in `.gitignore` to collaborators — use this only for personal protection, `.gitignore` for team-wide).
- Recovery is cheap: `git clone https://github.com/Entelligentsia/forge.git forge` — no data loss if `forge/` was committed and pushed.

### Risk 2: No commit pinning — `forge/` can drift to any branch/SHA

**Impact:** Medium — sprint work could run against wrong plugin version.  
**Likelihood:** Medium — easy to forget `git pull` inside `forge/`.

**Mitigations:**
- Optional: add `forgeRef` to `.forge/config.json`:
  ```json
  "forgeRef": "v0.27.1"
  ```
- `/forge:init` or `/forge:health` can verify `forge/` SHA matches `forgeRef` and warn on mismatch.
- For day-to-day work, `cd forge && git pull && git checkout main` is sufficient.
- Tag-based releases already exist (`v0.27.1`, etc.) — pin to tags, not SHAs.

### Risk 3: Workflow `.md` files reference `engineering/` — relative to CWD

**Impact:** Low — workflows are prompt templates, not scripts.  
**Likelihood:** Low — CWD is always `forge-engineering/` during sprint work.

**Mitigations:**
- No code changes needed — relative paths resolve from CWD.
- Document in `forge-engineering/CLAUDE.md`: "Always CWD to `forge-engineering/` before running sprint commands."
- `/forge:init` or `/forge:health` can verify CWD contains `engineering/` and `.forge/`.

### Risk 4: History rewrite on public repo breaks forks

**Impact:** High — anyone who forked `Entelligentsia/forge` will have divergent history.  
**Likelihood:** High — `git filter-repo` rewrites all SHAs.

**Mitigations:**
- Announce on README and any social channels before pushing the rewritten history.
- Provide a migration script for fork owners: `git remote update && git rebase upstream/main`.
- Since Forge has very few external contributors (if any), impact is likely minimal.
- **Alternative (lower risk):** Create a fresh repo with no history rather than rewriting. Copy `forge/`, `docs/`, `.claude-plugin/`, `CLAUDE.md` to a new repo. Loses git history but avoids fork breakage. Tag the last pre-split commit in the old repo for reference.

### Risk 5: `.forge/config.json` `forgeRoot` path not portable across machines

**Impact:** Medium — absolute paths break on different machines.  
**Likelihood:** Medium — current config uses absolute path `/home/boni/.claude/plugins/marketplaces/forge/forge`.

**Mitigations:**
- Use relative path `"./forge/forge"` — works on any machine with the nested-clone layout.
- `/forge:init` can validate the path and suggest fixes if `./forge/forge` doesn't exist.
- Document the expected directory layout in setup instructions.

### Risk 6: Developer onboarding confusion — two repos, nested clone

**Impact:** Medium — new developers need setup instructions.  
**Likelihood:** Medium — non-obvious layout without documentation.

**Mitigations:**
- Add `SETUP.md` to `forge-engineering/` with exact clone commands.
- `/forge:init` can detect missing `forge/` directory and print setup instructions.
- `CLAUDE.md` in `forge-engineering/` documents the two-layer architecture and expected paths.

---

## Decision Log

| Date | Author | Change |
|------|--------|--------|
| 2026-04-29 | Boni | Initial proposal — gitignored clone pattern |

---

## Open Questions

1. **History rewrite vs. fresh repo?** Filter-repo preserves history but breaks forks. Fresh repo is cleaner but loses git blame. Low risk either way given few external contributors.
2. **`forgeRef` pinning — needed now?** Can defer until sprint workflow instability is observed. Config field is cheap to add; verification can come later.
3. **Should `.forge/` be git-tracked in `forge-engineering/`?** Currently 665 files. Generated output, but useful for history. Consider `.gitignore`-ing the cache/ directory only.