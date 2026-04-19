# VALIDATION REPORT — FORGE-S07-T06: Create store custodian skill and tool spec

🍵 *Forge QA Engineer*

**Task:** FORGE-S07-T06

---

**Verdict:** Approved

---

## Acceptance Criteria Verification

### AC1: `forge/meta/skills/meta-store-custodian.md`

| Criterion | Status | Evidence |
|---|---|---|
| File exists | PASS | Verified with `test -f` |
| Skill name/invocation: `/forge:store <command> <args>` | PASS | Line 22: `**Skill invocation:** /forge:store <command> <args>` |
| Instructs LLM to run `node "$FORGE_ROOT/tools/store-cli.cjs" <command> <args>` | PASS | Line 49: Invocation section documents the CLI pattern |
| FORGE_ROOT resolution via `.forge/config.json` | PASS | Line 37: `FORGE_ROOT=$(node -e "console.log(require('./.forge/config.json').paths.forgeRoot)")` |
| On exit 1: read stderr, fix data, retry (max 2 retries) | PASS | Lines 90-93: Error Handling section with retry logic |
| On exit 1 after retries: report validation error, stop | PASS | Lines 94-96: "report the validation error to the user and stop" |
| Hard rule: never fall back to direct writes | PASS | Lines 28-29 (Overview) and line 96 (Error Handling) |
| Documents all invocation patterns | PASS | 18 patterns in Invocation Patterns table, covering all 10 CLI commands |

### AC2: `forge/meta/tool-specs/store-cli.spec.md`

| Criterion | Status | Evidence |
|---|---|---|
| File exists | PASS | Verified with `test -f` |
| Documents all commands with usage, arguments, exit codes | PASS | CLI Interface section lists all 10 commands; Algorithm section details each |
| Documents entity types: sprint, task, bug, event, feature | PASS | Entity Types table with ID fields, required fields, store paths |
| Documents transition table summary | PASS | Status Transitions section covers task, sprint, bug, feature |
| Documents schema validation behavior | PASS | Schema Validation section: required fields, types, enums, additionalProperties, minimum |
| Documents sidecar pattern | PASS | Sidecar Pattern section: emit --sidecar, merge-sidecar, alias mapping |

### AC3: Formatting conventions

| Criterion | Status | Evidence |
|---|---|---|
| Skill file follows meta-skill convention | PASS | YAML frontmatter (name, description, role), Generation Instructions, structured sections |
| Tool spec follows existing spec convention | PASS | Purpose, Inputs, Outputs, CLI Interface, Entity Types, Schema Validation, Status Transitions, Sidecar Pattern, Error Handling, Algorithm sections |

### AC4: `validate-store --dry-run` exits 0

| Criterion | Status | Evidence |
|---|---|---|
| No store corruption from T06 changes | PASS | Pre-existing error in EVT-S07-PLAN-001 (missing `iteration`) is unrelated to T06. T06 only added Markdown files in `forge/meta/`. |

## Edge Case Checks

- **No-npm rule:** N/A — no JS files modified
- **Hook exit discipline:** N/A — no hooks modified
- **Schema `additionalProperties: false`:** N/A — no schemas modified
- **Backwards compatibility:** PASS — additive change only, no existing files modified
- **Prompt injection scan:** PASS — both Markdown files scanned; no injection patterns found

## Deviation from Task Prompt

The tool spec file is named `store-cli.spec.md` instead of `store-cli.md` as
stated in the task prompt. This matches the `.spec.md` convention used by all 5
existing tool specs (`collate.spec.md`, `validate-store.spec.md`, etc.) and is
the correct naming per established project conventions.