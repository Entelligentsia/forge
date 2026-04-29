# /forge:update

**Category:** Forge plugin command  
**Run from:** Any Forge-initialised project directory

---

## Purpose

Propagates a Forge plugin upgrade into the project's generated artifacts. Reads the migration manifest, computes the delta from the previously-installed version to the current one, runs exactly the regeneration targets that are required — no more — and records the new baseline.

Run this after installing or upgrading Forge (`/plugin install forge@skillforge` for stable,
or `/plugin install forge@forge` for canary).

---

## Invocation

```bash
/forge:update                    # auto-detect versions from cache
/forge:update --from 0.2.0       # override baseline version (if cache is missing)
```

---

## How version tracking works

The `check-update.js` session hook caches the local plugin version at each session start. When `/plugin install` upgrades the plugin between sessions, the next session start detects the version change and writes `migratedFrom` into the cache. `/forge:update` reads that field as its baseline.

```mermaid
flowchart LR
    PI[/plugin install] -->|version changes| SH[SessionStart hook\ndetects delta\nwrites migratedFrom to cache]
    SH -->|user runs| FU([/forge:update])
    FU --> MF[Read migratedFrom\nfrom cache]
    MF --> CV[Read current version\nfrom plugin.json]
    CV --> MJ[Walk migrations.json\nfrom baseline to current]
    MJ --> AGG[Aggregate regeneration targets]
    AGG --> CONF[Show summary\nask to confirm]
    CONF --> RUN[Run regeneration]
    RUN --> WRITE[Write new baseline\nto cache]
```

---

## Reads

| Source | Purpose |
|---|---|
| `$FORGE_ROOT/.claude-plugin/plugin.json` | Current plugin version |
| `CLAUDE_PLUGIN_DATA/update-check-cache.json` | `migratedFrom` — the pre-upgrade baseline |
| `$FORGE_ROOT/migrations.json` | Migration manifest — maps version pairs to regeneration targets |

---

## Migration manifest

`migrations.json` maps each `from` version to a migration step:

```json
{
  "0.2.0": {
    "version": "0.3.0",
    "notes": "Pluggable pipeline routing, manage-config tool, extended regenerate.",
    "regenerate": ["tools", "workflows"],
    "breaking": false,
    "manual": []
  }
}
```

If upgrading across multiple versions (e.g., 0.2.0 → 0.4.0), the command walks the chain and aggregates all `regenerate` targets and `manual` steps.

---

## Summary report (before running)

```
Forge 0.2.0 → 0.3.0

Changes:
  Pluggable pipeline routing, manage-config tool, extended /forge:regenerate.

Regeneration required:
  tools      — re-generate engineering/tools/ from updated tool specs
  workflows  — re-generate .forge/workflows/ from updated meta-definitions

Proceed? [Y/n]
```

If any migration step has `breaking: true`, the user must confirm they have completed the manual steps before regeneration runs.

---

## Produces

Updated artifacts per the regeneration targets (see [`/forge:regenerate`](regenerate.md) for what each target produces).

Updates the cache:
```json
{ "migratedFrom": "0.3.0", "localVersion": "0.3.0" }
```

---

## On failure / blockers

| Situation | Behaviour |
|---|---|
| `migratedFrom` not in cache | Ask user for baseline version; or pass `--from <version>` |
| No migration path found | Warn user; recommend `regenerate workflows tools` as a safe fallback |
| Breaking changes — manual steps not confirmed | Do not run regeneration until confirmed |
| Regeneration fails mid-run | Report which target failed; remaining targets not run |

---

## Idempotent

If `migratedFrom` equals the current version, the command reports "Already up to date" and exits without modifying anything. Safe to run multiple times.

---

## Related commands

| Command | Purpose |
|---|---|
| [`/forge:regenerate`](regenerate.md) | Manual regeneration by category |
| [`/forge:health`](health.md) | Check for remaining drift after update |
