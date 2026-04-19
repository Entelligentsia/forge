# FORGE-S06-T05: Suppress false breaking-change confirmation in forge:update

**Sprint:** FORGE-S06
**Estimate:** S
**Pipeline:** default

---

## Objective

When all model values in `.forge/config.json` pipeline fields are standard Forge aliases (`sonnet`, `opus`, `haiku`) or absent, skip the breaking-change manual confirmation step automatically. Only halt when a genuinely non-standard value is detected. This closes SPRINT_REQUIREMENTS item 3.

## Acceptance Criteria

1. Upgrading a project whose config contains only `sonnet`/`opus`/`haiku` model values in pipeline phases completes without a manual confirmation prompt for the model-migration manual step
2. The step only halts when a non-standard model value (raw model ID like `claude-3-opus` or unknown alias) is detected in the config
3. The check applies to the manual step: "Check .forge/config.json for custom 'model' overrides in config.pipelines..."
4. `node --check forge/tools/validate-store.cjs --dry-run` exits 0

## Context

**The bug:** The migration from 0.6.13→0.7.0 has `breaking: true` with a manual step:
```
"Check .forge/config.json for custom 'model' overrides in config.pipelines. If present, manually migrate these to the 'requirements' block format in corresponding workflow artifacts."
```

When `/forge:update` processes this migration, it halts and asks the user to confirm they've completed the manual step. But if the user's `.forge/config.json` only has standard aliases like `"model": "sonnet"`, there's nothing to manually fix — the orchestrator already handles these correctly. The confirmation is a false alarm.

**Fix approach:**

In the migration confirmation flow (Step 4 "Confirm and regenerate" and Step 2B), before prompting for manual step confirmation, read `.forge/config.json` and scan all pipeline phases' `model` fields. If every `model` value is one of the standard Forge aliases (`sonnet`, `opus`, `haiku`) or absent, the manual step is auto-confirmed and the prompt is skipped.

The relevant section in `forge/commands/update.md` to modify is where `breaking: true` and `manual` items are checked. Add a pre-check that scans `.forge/config.json` pipelines for non-standard model values and auto-skips the confirmation if none are found.

## Plugin Artifacts Involved

- `forge/commands/update.md` — the only file to modify

## Operational Impact

- **Version bump:** required — changes update flow behavior
- **Regeneration:** no user action needed
- **Security scan:** required