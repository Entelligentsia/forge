---
name: forge-validator
description: Validate Forge plugin changes before commit. Use after implementing changes to forge/ to run the full compliance gate — tests, manifest, integrity, health hash, security scan, and grep assertions.
---

# Forge Validator

Validate Forge plugin changes before commit. Run this after implementing
changes to `forge/` to confirm all CLAUDE.md compliance requirements are met.

## Iron Laws

1. ONLY edit files in `forge/`. NEVER edit `.forge/` or `engineering/` to fix Forge itself.
2. Every change to a `.cjs` tool must be preceded by a failing test.
3. Schema changes that affect entity lifecycle require concepts diagram updates.
4. Version bump required for material changes. Migration entry required. Tests must pass.
5. Silent continuation past failures is never acceptable.

## Compliance Gates

Run each gate in order. If any gate fails, STOP and fix before proceeding.

### Gate 1 — Test Suite

```sh
node --test forge/tools/__tests__/*.test.cjs
```

**Pass condition:** All tests pass (0 failures, 0 cancelled).

If any test fails, the change is not ready. Fix the issue and re-run.

### Gate 1b — Lint Verification

For every modified `.js` or `.cjs` file in `forge/hooks/` or `forge/tools/`, run:

```sh
node --check <each modified file>
```

Additionally, run the project lint check:

```sh
node --check forge/tools/collate.cjs forge/tools/validate-store.cjs forge/tools/seed-store.cjs forge/tools/manage-config.cjs forge/tools/estimate-usage.cjs forge/hooks/check-update.js forge/hooks/triage-error.js forge/hooks/list-skills.js
```

**Pass condition:** All `--check` commands exit 0 with no output.

### Gate 1c — Schema Validation

Only required if any `forge/schemas/*.schema.json` files were modified.

```sh
node forge/tools/validate-store.cjs --dry-run
```

**Pass condition:** Dry-run exits 0 with no validation errors.

### Gate 2 — Build Manifest

Only required if any files in `forge/meta/personas/`, `forge/meta/workflows/`,
`forge/meta/templates/`, or `forge/schemas/*.schema.json` were added, renamed,
or removed.

Note: `CUSTOM_COMMAND_TEMPLATE.md` is a one-shot init artifact (no meta source).
Do not add a meta source for it — keep its TEMPLATE_MAP entry as
`[null, 'CUSTOM_COMMAND_TEMPLATE.md']`.

```sh
node forge/tools/build-manifest.cjs --forge-root forge/
```

**Pass condition:** `forge/schemas/structure-manifest.json` written, version matches `plugin.json`.
Commit both the updated tool and the updated manifest together.

### Gate 3 — Integrity Manifest

```sh
node forge/tools/gen-integrity.cjs --forge-root forge/
```

**Pass condition:** `forge/integrity.json` written with current version.

### Gate 4 — Health Hash

Compute the SHA-256 of `verify-integrity.cjs`:

```sh
node -e "const c=require('crypto'),f=require('fs'); \
  console.log(c.createHash('sha256').update(f.readFileSync('forge/tools/verify-integrity.cjs')).digest('hex'))"
```

Compare the output to the `EXPECTED=` value in `forge/commands/health.md`.

**Pass condition:** Hashes match. If they don't, update the `EXPECTED=` value in
`forge/commands/health.md` to match the computed hash.

### Gate 5 — Security Scan

```sh
/security-watchdog:scan-plugin forge:forge --source-path forge/
```

If the scan skill does not support `--source-path`, tell it explicitly to scan
the source at `/home/boni/src/forge/forge/` instead of the installed plugin cache.

**Pass condition:** Save the full report (do NOT summarise) to
`docs/security/scan-v{VERSION}.md` where `{VERSION}` is from `plugin.json`.
Commit the report together with the version bump in the same commit, or in a
follow-up `security:` commit.

**If the scan report is missing or has critical findings: the change is
Revision Required.** Do not proceed to commit. Fix the critical findings and
re-scan.

Then update security indexes:

1. **`docs/security/index.md`** — prepend a new row at the top of the table
2. **`README.md` `## Security` table** — prepend the new row, then remove the
   oldest row so the table always shows exactly the 3 most recent scans.
   The line below the table must remain: `[Full scan history →](docs/security/index.md)`

If the `## Security` section does not yet exist in `README.md`, create it
directly above `## Supported Stacks`:

```markdown
## Security

Every release is scanned with `/security-watchdog:scan-plugin` before
publication. Reports are filed as versioned artifacts in
[`docs/security/`](docs/security/).

| Version | Date | Report | Summary |
|---------|------|--------|---------|

[Full scan history →](docs/security/index.md)
```

### Gate 6 — Grep Assertions

Run verification greps to confirm the changes were applied correctly. These
are specific to the current release. Examples:

```sh
# All escalation calls inlined (no bare escalate_to_human in algorithm)
grep -c "escalate_to_human" forge/meta/workflows/meta-orchestrate.md

# All phase gates have blocked/escalated guards
grep -c "forbid task.status == blocked" forge/meta/workflows/meta-orchestrate.md
grep -c "forbid task.status == escalated" forge/meta/workflows/meta-orchestrate.md

# Iron Law present
grep -c "silently work around" forge/meta/workflows/meta-orchestrate.md
```

**Pass condition:** Counts match expected values.

### Gate 7 — Migration Sub-Target Granularity

Check that the migration entry in `forge/migrations.json` uses granular
sub-targets (e.g., `"workflows:orchestrate_task"`) not bare categories
(e.g., `"workflows"`). The update command supports `category:sub_target` syntax.

**Pass condition:** All `regenerate` entries use the most specific sub-target possible.

## Report

After all gates, produce a summary:

```
## Forge Validation Report — v{VERSION}

| Gate | Status | Details |
|------|--------|---------|
| Test Suite | ✗/✓ | N tests, N failures |
| Lint Verification | ✗/✓ | N files checked, N failures |
| Schema Validation | ✗/✓/skipped | Dry-run result |
| Build Manifest | ✗/✓/skipped | Version, file count |
| Integrity | ✗/✓ | Version, file count |
| Health Hash | ✗/✓ | Match/mismatch |
| Security Scan | ✗/✓ | N critical, N warnings |
| Grep Assertions | ✗/✓ | All counts match |
| Migration Granularity | ✗/✓ | All sub-targets specific |
```

## Write-Boundary Contract

Writes to Forge-owned JSON (`task.json`, `sprint.json`, `bug.json`, events,
sidecars, `COLLATION_STATE.json`, `progress.log`) may use `Write` or `Edit`
directly — they do NOT need to route through `store-cli`. However, every write
to a Forge-owned path is schema-validated at the filesystem boundary by the
`PreToolUse` hook at `hooks/validate-write.js`. A malformed write is rejected
with a message naming the offending field and the relevant schema. Fix the data
and retry — do NOT disable the hook.

Emergency bypass: `FORGE_SKIP_WRITE_VALIDATION=1` for a single turn (operator
repair only). The hook logs the bypass.

If any gate is ✗, the changes are NOT ready for commit. Fix and re-run.