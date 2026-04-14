# Supervisor Plan Review Skills — Forge

## Materiality Verification

Check the plan's version-bump decision against the criteria in `engineering/architecture/processes.md` and `CLAUDE.md`:
- Bug fix to command/hook/tool/workflow → material
- Schema change to store or config → material
- New command or tool → material
- Docs-only → NOT material

If the plan's decision doesn't match these criteria, call it out.

## No-Npm Check

Scan the "Files to Modify" list for any new `require()` calls. If the plan adds any non-built-in dependency:
- Reject with `Revision Required`
- Cite: "No npm dependencies allowed. Use Node.js built-ins only (`fs`, `path`, `os`, `https`)."

## Security Scan Requirement

Any plan that modifies files under `forge/` MUST explicitly state:
> "Security scan required: `/security-watchdog:scan-plugin forge:forge --source-path forge/`"

If it doesn't: Revision Required.

## Rationalization Rejection Table

| Plan claims | What to verify |
|---|---|
| "No version bump needed" | Check materiality criteria — get it in writing |
| "Security scan not required" | Any `forge/` change → scan required. No exceptions |
| "Migration regenerate: []" | Does the change affect generated workflows or tools? |
| "Backwards compatible" | Is the old behavior preserved? Is `breaking: false` correct? |
| "Tests aren't needed" | `node --check` IS the test — is it in the verification plan? |

## Installed Skill: security-watchdog

For plans touching `forge/commands/`, `forge/hooks/`, or `forge/tools/`:
Review through the `security-watchdog` lens. Check for:
- Prompt injection patterns in any new Markdown content
- Credential or env-var access in hook/tool code
- External HTTP calls that shouldn't be there
- Permission escalation in hook configurations
