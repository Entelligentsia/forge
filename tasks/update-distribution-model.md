# Task: Update Distribution Model — Stable via skillforge, Canary via forge

## Context

Forge is now distributed through two channels:

- **Stable** — distributed as a git submodule inside `Entelligentsia/skillforge`, pinned to a release tag.
  Install: `/plugin marketplace add Entelligentsia/skillforge` → `/plugin install forge@skillforge`
- **Canary** — distributed directly from `Entelligentsia/forge`, tracking `main`.
  Install: `/plugin marketplace add Entelligentsia/forge` → `/plugin install forge@forge`

This means `Entelligentsia/forge` is no longer the recommended install path for most users — it is now the canary/development channel only.

## Changes Required

Update every file listed below. Do not change anything else.

---

### 1. README.md

**Quick Start section (lines ~39–45) and Install section (lines ~151–159):**

Replace:
```
/plugin marketplace add Entelligentsia/forge
/plugin install forge@forge
```
With:
```
# Stable (recommended)
/plugin marketplace add Entelligentsia/skillforge
/plugin install forge@skillforge

# Canary (latest development build)
/plugin marketplace add Entelligentsia/forge
/plugin install forge@forge
```

Remove the "pending approval" note — it is no longer accurate.

---

### 2. docs/existing-project.md and docs/default-workflows.md

Any occurrence of:
```
/plugin install Entelligentsia/forge
```
Replace with:
```
/plugin install forge@skillforge
```

---

### 3. docs/commands/forge/update.md

Update the note "Run this after `/plugin install Entelligentsia/forge`." to:
```
Run this after installing or upgrading Forge (`/plugin install forge@skillforge` for stable,
or `/plugin install forge@forge` for canary).
```

---

### 4. forge/commands/update.md

The raw GitHub URLs for version checking must stay pointing to `Entelligentsia/forge/main` —
that is the source of truth regardless of install channel. No change needed here.

However, any user-facing instruction text within this file that tells users how to upgrade
(e.g. "run `/plugin install forge@forge`") should be updated to show both channels:
```
/plugin install forge@skillforge   # stable
/plugin install forge@forge        # canary
```

---

### 5. forge/vision/07-PLUGIN-STRUCTURE.md

Any install example referencing `forge@agentic-skills` or `forge@forge` as the sole option
should be updated to the two-channel model shown above.

---

### 6. engineering/architecture/deployment.md

Update the install path block to:
```
# Stable
/plugin marketplace add Entelligentsia/skillforge
/plugin install forge@skillforge

# Canary
/plugin marketplace add Entelligentsia/forge
/plugin install forge@forge
```

Update the release process section to reflect that a stable release requires:
1. Tag the commit in `Entelligentsia/forge`
2. Bump the submodule pointer in `Entelligentsia/skillforge` to that tag
3. Merge the skillforge bump to `main`

---

### 7. engineering/architecture/processes.md

Replace:
```
/plugin install forge@forge   (or: /plugin install Entelligentsia/forge)
```
With the two-channel model. Note that the release checklist now includes a skillforge submodule bump step.

---

## Definition of Done

- All files above updated consistently
- No remaining references to `forge@forge` as the *sole* or *recommended* install path
- The two-channel model (stable = `@skillforge`, canary = `@forge`) is clear everywhere the install story is told
- Commit with message: `docs: update distribution model — stable via skillforge, canary via forge`
