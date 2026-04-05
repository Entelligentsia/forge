# FORGE-S01-T07: Bug report opt-in — token data in bug reports with user prompt

**Sprint:** FORGE-S01
**Estimate:** S
**Pipeline:** default

---

## Objective

Update the bug report workflow so users are prompted whether to include token
usage data from the relevant sprint. Support a per-project default in config.

## Acceptance Criteria

1. `/forge:report-bug` command/workflow prompts the user:
   > "Include token usage data from the relevant sprint in this report? (Helps the Forge team diagnose efficiency issues) [Y/n]"
2. If user opts in: append the sprint's `COST_REPORT.md` content to the GitHub issue body
3. If user opts out: no cost data included
4. Config override: if `.forge/config.json` → `pipeline.includeTokenDataInBugReports` is set (boolean), use that value and skip the prompt
5. If no config default and no relevant sprint exists, skip the prompt entirely
6. Update `forge/sdlc-config.schema.json` to include the new config field (optional boolean under `pipeline`)

## Context

Depends on T05 (COST_REPORT.md must exist for there to be data to include).

The report-bug command is at `forge/commands/report-bug.md`. It uses `gh issue create`
to file GitHub issues. The token data attachment should be a collapsible `<details>`
block in the issue body so it doesn't clutter the main report.

## Plugin Artifacts Involved

- `forge/commands/report-bug.md` — the bug report command
- `forge/sdlc-config.schema.json` — config schema (add optional field)

## Operational Impact

- **Version bump:** Required (bundled with T08)
- **Regeneration:** Users must regenerate commands
- **Security scan:** Not required for this task alone
