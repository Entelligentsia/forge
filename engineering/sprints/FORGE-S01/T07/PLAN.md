# PLAN — FORGE-S01-T07: Bug report opt-in — token data in bug reports with user prompt

**Task:** FORGE-S01-T07
**Sprint:** FORGE-S01
**Estimate:** S

---

## Objective

Extend `forge/commands/report-bug.md` so that when a relevant sprint exists with a
`COST_REPORT.md`, the user is prompted whether to include token usage data in the
filed GitHub issue. Support a per-project default via `.forge/config.json` →
`pipeline.includeTokenDataInBugReports` that silently opts in or out without
prompting. Update `forge/sdlc-config.schema.json` to document the new config field.

## Approach

### What is being changed

Only two `forge/` artifacts are modified:

1. **`forge/commands/report-bug.md`** — the slash command Markdown that drives
   Claude's behaviour when `/forge:report-bug` is invoked.
2. **`forge/sdlc-config.schema.json`** — add the optional `includeTokenDataInBugReports`
   boolean under the `pipeline` object.

No CJS tools, hooks, schemas (store), or workflows are touched.

### Changes to `forge/commands/report-bug.md`

A new **Step 2b — Token data opt-in** is inserted between the existing Step 2
(Gather automatic context) and Step 3 (Interview the user).

#### Step 2b logic

1. **Detect a relevant sprint.** A "relevant sprint" is the most recently active
   or in-progress sprint. To find it: read `.forge/config.json` to obtain the
   `paths.store` path (defaulting to `.forge/store`), then look for any
   `COST_REPORT.md` file under `engineering/sprints/` by reading the sprint
   directory list. Use the most recently modified sprint directory that contains a
   `COST_REPORT.md`. If none exists, skip the rest of Step 2b entirely.

2. **Check config override.** Read `.forge/config.json` (already loaded in Step 2
   as `forge_config`). If `pipeline.includeTokenDataInBugReports` is a boolean:
   - `true` → set `include_token_data = true`, skip the prompt
   - `false` → set `include_token_data = false`, skip the prompt

3. **Prompt the user** (only if no config override and a `COST_REPORT.md` was
   found):
   ```
   Include token usage data from the relevant sprint in this report?
   (Helps the Forge team diagnose efficiency issues) [Y/n]
   ```
   Treat empty / Enter as **Y**. Set `include_token_data` accordingly.

4. **Capture the cost data.** If `include_token_data = true`, read the content of
   the detected `COST_REPORT.md` file. Store as `cost_report_content`.

#### Changes to Step 4 — Draft the issue

In the body template, append a collapsible block after the `## Environment`
section **only when `include_token_data = true`**:

```markdown
<details>
<summary>Token Usage Data</summary>

{cost_report_content}

</details>
```

No other changes to the body template.

### Changes to `forge/sdlc-config.schema.json`

Add `includeTokenDataInBugReports` as an optional boolean property under the
existing `pipeline` object (alongside `skipPhases` and `maxReviewIterations`):

```json
"includeTokenDataInBugReports": {
  "type": "boolean",
  "description": "If set, silently opt in (true) or out (false) of appending sprint token usage data to Forge bug reports. When absent, the user is prompted at report time."
}
```

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/commands/report-bug.md` | Insert Step 2b (token opt-in logic); extend Step 4 body template with collapsible cost data block | Primary deliverable |
| `forge/sdlc-config.schema.json` | Add optional `pipeline.includeTokenDataInBugReports` boolean | Schema documentation for the new config field |

## Plugin Impact Assessment

- **Version bump required?** Yes — bundled with T08. Changes to
  `forge/commands/report-bug.md` are material (installed users will receive a
  different bug report command after regenerating).
- **Migration entry required?** Yes (in T08) — `regenerate: ["commands"]` so
  users run `/forge:update` to receive the updated command. Target version: `0.4.0`.
- **Security scan required?** Yes — any change to `forge/` requires a scan.
  Bundled with T08.
- **Schema change?** Yes — `forge/sdlc-config.schema.json` gains one optional
  field under `pipeline`. No store schema (`forge/schemas/*.schema.json`) is
  touched; no `validate-store.cjs` changes needed.

## Testing Strategy

- **Syntax check:** not applicable — only Markdown and JSON files are modified.
- **Store validation:** `node forge/tools/validate-store.cjs --dry-run` — run to
  confirm no regressions (guards against accidental drift).
- **JSON validity:** ensure `forge/sdlc-config.schema.json` remains valid JSON
  after the edit (e.g. `node -e "require('./forge/sdlc-config.schema.json')"` exits 0).
- **Manual review of command logic:**
  - Read the updated `report-bug.md` and verify Step 2b is correctly positioned
    and describes all three paths (no sprint, config override, prompt).
  - Confirm the `<details>` block in Step 4 is conditional on `include_token_data`.
  - Confirm Step 2b is skipped gracefully when no `COST_REPORT.md` exists.

## Acceptance Criteria

- [ ] `/forge:report-bug` prompts "Include token usage data…" when a `COST_REPORT.md`
      exists for a relevant sprint and no config override is set
- [ ] Opt-in appends a `<details>` collapsible block containing `COST_REPORT.md`
      content to the issue body
- [ ] Opt-out produces no cost data in the issue body
- [ ] `pipeline.includeTokenDataInBugReports: true` in `.forge/config.json` silently
      includes the data without prompting
- [ ] `pipeline.includeTokenDataInBugReports: false` silently excludes the data
      without prompting
- [ ] No relevant sprint / no `COST_REPORT.md` → Step 2b is skipped entirely
- [ ] `forge/sdlc-config.schema.json` includes the new `includeTokenDataInBugReports`
      field under `pipeline`
- [ ] `node -e "require('./forge/sdlc-config.schema.json')"` exits 0 (valid JSON)
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0

## Operational Impact

- **Distribution:** Users must run `/forge:update` after T08 ships (version `0.4.0`)
  to receive the updated `report-bug.md` command. Until then, their existing command
  continues to work — it just lacks the token opt-in.
- **Backwards compatibility:** Fully preserved. Step 2b degrades gracefully to a
  no-op when no `COST_REPORT.md` exists (the common case for projects that have not
  run a sprint with T05 installed).
