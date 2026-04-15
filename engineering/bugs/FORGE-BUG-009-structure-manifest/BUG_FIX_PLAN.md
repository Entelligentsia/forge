# BUG_FIX_PLAN — FORGE-BUG-009

**Bug:** Structure manifest: deterministic check and course-correct for generated `.forge/` and `.claude/commands/`
**Root cause categories:** `data-integrity` (stale generation-manifest entries), `business-rule` (missing structure check feature)
**Status:** in-progress
**Version bump:** 0.9.7 → 0.9.8

---

## Overview

Two interrelated defects:

1. **Data-integrity:** `.forge/generation-manifest.json` holds 14 stale entries from the
   old role-based naming scheme (`plan.md`, `implement.md`, etc.) that was replaced by
   noun-based names (`engineer.md`, `bug-fixer.md`, etc.). These entries will never resolve
   to present files, so `forge:health` permanently surfaces 14 `× missing` lines.
   Root cause: `forge/commands/regenerate.md` records new manifest entries for each namespace
   but never evicts old entries from the same namespace before writing.

2. **Business-rule / missing feature:** No mechanism exists to declare which files MUST
   exist in the generated `.forge/` and `.claude/commands/` trees. When `forge/meta/`
   evolves (new file, rename, deletion), drift between source and generated output is
   silent and undetected until a workflow fails at runtime.

**Scope note on `skills` and default regenerate:** The default `/forge:regenerate` run
covers `workflows + commands + templates + personas` — `skills` is intentionally NOT in
the default set. This means that even after this fix, a plain `/forge:regenerate` will
not clear stale skill entries; users must run `/forge:regenerate skills` explicitly.
The 14-entry bug in the dogfooding instance is specifically `.forge/personas/` (7) AND
`.forge/skills/` (7), and the skills entries persisted because the default regenerate
never ran the skills namespace. This limitation is documented under Risk Notes and in
the acceptance criteria. Adding `skills` to the default set is intentional scope creep
and is not included in this fix.

---

## Implementation Phases

### Phase A — Fix stale generation-manifest entries (immediate data-integrity fix)

#### Step A1 — Add `clear-namespace` subcommand to `generation-manifest.cjs`

**File:** `forge/tools/generation-manifest.cjs`
**Change type:** extend existing tool

Add a `clear-namespace <prefix>` subcommand after the `remove` handler.

Semantics:
- Argument: a path prefix string (e.g. `.forge/personas/` or `.forge/skills/`)
- **Prefix validation (guard against footguns):** Reject prefixes that do not start
  with `.forge/` or `.claude/` AND do not end with `/`. Exit 2 with error:
  > Usage error: prefix must start with .forge/ or .claude/ and end with /
  This prevents `clear-namespace personas` (no leading dot/slash) from silently
  matching anything that starts with `p`.
- Remove all `manifest.files` entries whose key starts with the given prefix
- Print: `〇 Cleared N entries matching <prefix>`
- If N == 0, print: `── No entries matching <prefix>`
- Exit 0 in all cases when prefix is valid; exit 2 on invalid prefix

Update the usage block at the top of the file to include:
```
  clear-namespace <prefix>  Remove all entries whose path starts with <prefix>.
                            prefix must start with .forge/ or .claude/ and end with /
```

Run `node --check forge/tools/generation-manifest.cjs` after edit.

**Acceptance test (manual):**
```sh
node forge/tools/generation-manifest.cjs clear-namespace .forge/personas/
# Should print: 〇 Cleared N entries matching .forge/personas/
node forge/tools/generation-manifest.cjs list
# Stale persona entries should be gone

# Test the prefix guard:
node forge/tools/generation-manifest.cjs clear-namespace personas
# Should exit 2 with: Usage error: prefix must start with .forge/ or .claude/ and end with /
node forge/tools/generation-manifest.cjs clear-namespace .forge/personas
# Same guard: should exit 2 (no trailing slash)
```

#### Step A2 — Add `clear-namespace` call in `regenerate.md` per-namespace sections

**File:** `forge/commands/regenerate.md`
**Change type:** edit existing command

In the **`personas`** category section, immediately before the "For each file being written"
loop (before step 5 in the current text), add a step:

```
Clear stale entries for this namespace:
node "$FORGE_ROOT/tools/generation-manifest.cjs" clear-namespace .forge/personas/
```

Apply the same insertion to the other namespace sections that record manifest hashes
**and that run as part of the default full rebuild**:

| Section | Namespace prefix to clear | In default run? |
|---------|--------------------------|-----------------|
| `personas` | `.forge/personas/` | Yes |
| `workflows` | `.forge/workflows/` | Yes |
| `commands` | `.claude/commands/` | Yes |
| `templates` | `.forge/templates/` | Yes (see template note below) |
| `skills` | `.forge/skills/` | **No** — skills is NOT in the default run |

The clear must happen **before** any `record` call in the same regeneration run so that
obsolete entries are gone before fresh hashes land.

**Template namespace note — CUSTOM_COMMAND_TEMPLATE.md:**
`CUSTOM_COMMAND_TEMPLATE.md` lives in `.forge/templates/` and is referenced by
`forge/commands/add-pipeline.md`. It has no meta-source in `forge/meta/templates/` —
it is a one-shot init artifact, not regenerated from a meta file. After
`clear-namespace .forge/templates/`, its manifest entry is evicted and it is never
re-recorded by the templates loop (because it is not in the TEMPLATE_MAP).

To prevent this regression, after the templates regeneration loop completes, add
a re-record step:

```sh
# Re-record the one-shot init artifact that is not regenerated:
if [ -f ".forge/templates/CUSTOM_COMMAND_TEMPLATE.md" ]; then
  node "$FORGE_ROOT/tools/generation-manifest.cjs" record .forge/templates/CUSTOM_COMMAND_TEMPLATE.md
fi
```

This ensures the file remains tracked in the manifest even though no meta source
regenerates it. See also Phase B1 for how TEMPLATE_MAP handles this file.

For sub-target regeneration (single-file mode), do **not** clear the whole namespace —
only clear the specific entry for the file being replaced, or skip clearing entirely
(the namespace-wide clear only applies to full-rebuild mode).

Specifically: in the sub-target branches of `personas` and `workflows`, insert:
```
node "$FORGE_ROOT/tools/generation-manifest.cjs" remove .forge/<namespace>/<sub-target>.md 2>/dev/null || true
```
before the record call. This handles the case where the sub-target is a rename (old name
is removed, new name is recorded).

For the `skills` namespace: the `clear-namespace .forge/skills/` call is added to the
`skills` category section of `regenerate.md`, but since `skills` is NOT in the default
run, it only executes when the user explicitly runs `/forge:regenerate skills`. This is the
documented limitation: plain `/forge:regenerate` still cannot clear stale skill entries
automatically.

#### Step A3 — Remove the 14 stale entries from the dogfooding instance

**File:** `.forge/generation-manifest.json` (dogfooding fix — edit directly via tool)
**Change type:** dogfooding data repair

Run the following 14 `remove` calls via Bash to eliminate the stale entries:

```sh
cd /home/boni/src/forge
for f in \
  ".forge/personas/plan.md" \
  ".forge/personas/implement.md" \
  ".forge/personas/review-plan.md" \
  ".forge/personas/review-code.md" \
  ".forge/personas/validate.md" \
  ".forge/personas/approve.md" \
  ".forge/personas/commit.md" \
  ".forge/skills/plan-skills.md" \
  ".forge/skills/implement-skills.md" \
  ".forge/skills/review-plan-skills.md" \
  ".forge/skills/review-code-skills.md" \
  ".forge/skills/validate-skills.md" \
  ".forge/skills/approve-skills.md" \
  ".forge/skills/commit-skills.md"; do
    node forge/tools/generation-manifest.cjs remove "$f"
done
```

After running, verify with:
```sh
node forge/tools/generation-manifest.cjs list --modified
# Should show 0 × missing entries for .forge/personas/ and .forge/skills/
node forge/tools/generation-manifest.cjs status
# Should show all tracked files in pristine/modified states, none × missing
```

---

### Phase B — Build-manifest tool

#### Step B1 — Create `forge/tools/build-manifest.cjs`

**File:** `forge/tools/build-manifest.cjs` (NEW)
**Change type:** new tool

This tool reads `forge/meta/` and derives a `structure-manifest.json` describing every
file that MUST exist in a correctly-generated project.

**Interface:**
```
node build-manifest.cjs [--forge-root <path>] [--output <path>]
```
- `--forge-root` defaults to `process.cwd()` (must point at the `forge/` plugin directory)
- `--output` defaults to `<forge-root>/schemas/structure-manifest.json`

**Architecture — static mapping tables:**

The tool uses five explicit, hardcoded mapping tables (one per namespace). These are
intentionally static rather than derived by scanning, because the naming conventions
are irregular and must be audited when changed.

```js
// 1. Personas — meta-{name}.md → .forge/personas/{name}.md
//    Exclusions: meta-orchestrator.md, meta-product-manager.md (no generated output)
const PERSONA_MAP = [
  ['meta-architect.md',    'architect.md'],
  ['meta-bug-fixer.md',    'bug-fixer.md'],
  ['meta-collator.md',     'collator.md'],
  ['meta-engineer.md',     'engineer.md'],
  ['meta-qa-engineer.md',  'qa-engineer.md'],
  ['meta-supervisor.md',   'supervisor.md'],
];

// 2. Skills — same name as persona output but with -skills.md suffix
//    Derived from PERSONA_MAP, not from meta-skills/ files
const SKILL_NAMES = PERSONA_MAP.map(([, out]) => out.replace('.md', '-skills.md'));

// 3. Workflows — explicit source → output mapping (irregular names)
const WORKFLOW_MAP = [
  ['meta-approve.md',                  'architect_approve.md'],
  ['meta-collate.md',                  'collator_agent.md'],
  ['meta-commit.md',                   'commit_task.md'],
  ['meta-fix-bug.md',                  'fix_bug.md'],
  ['meta-implement.md',                'implement_plan.md'],
  ['meta-orchestrate.md',              'orchestrate_task.md'],
  ['meta-plan-task.md',                'plan_task.md'],
  ['meta-retrospective.md',            'sprint_retrospective.md'],
  ['meta-review-implementation.md',    'review_code.md'],
  ['meta-review-plan.md',              'review_plan.md'],
  ['meta-review-sprint-completion.md', 'architect_review_sprint_completion.md'],
  ['meta-sprint-intake.md',            'architect_sprint_intake.md'],
  ['meta-sprint-plan.md',              'architect_sprint_plan.md'],
  ['meta-update-implementation.md',    'update_implementation.md'],
  ['meta-update-plan.md',              'update_plan.md'],
  ['meta-validate.md',                 'validate_task.md'],
  [null,                               'quiz_agent.md'],   // orchestration-generated
  [null,                               'run_sprint.md'],   // orchestration-generated
];

// 4. Templates — explicit mapping
//    CUSTOM_COMMAND_TEMPLATE.md is a one-shot init artifact (no meta source):
//    it is written at init time and never regenerated from a meta file.
//    Source is null — same pattern as orchestration-generated workflows.
const TEMPLATE_MAP = [
  ['meta-code-review.md',         'CODE_REVIEW_TEMPLATE.md'],
  ['meta-plan.md',                'PLAN_TEMPLATE.md'],
  ['meta-plan-review.md',         'PLAN_REVIEW_TEMPLATE.md'],
  ['meta-progress.md',            'PROGRESS_TEMPLATE.md'],
  ['meta-retrospective.md',       'RETROSPECTIVE_TEMPLATE.md'],
  ['meta-sprint-manifest.md',     'SPRINT_MANIFEST_TEMPLATE.md'],
  ['meta-sprint-requirements.md', 'SPRINT_REQUIREMENTS_TEMPLATE.md'],
  ['meta-task-prompt.md',         'TASK_PROMPT_TEMPLATE.md'],
  [null,                          'CUSTOM_COMMAND_TEMPLATE.md'],  // one-shot init artifact
];

// 5. Commands — from generate-commands.md explicit list
const COMMAND_NAMES = [
  'sprint-intake.md', 'plan.md', 'review-plan.md', 'implement.md',
  'review-code.md', 'fix-bug.md', 'sprint-plan.md', 'run-task.md',
  'run-sprint.md', 'collate.md', 'retrospective.md', 'approve.md', 'commit.md',
];
```

**Schema files (5):** Derived by reading `<forge-root>/schemas/*.schema.json` at
build time and recording their `<name>.schema.json` basenames.

**Reverse-drift detection:** After building the manifest, the tool scans:
- `forge/meta/personas/meta-*.md`
- `forge/meta/workflows/meta-*.md`
- `forge/meta/templates/meta-*.md`

For each meta file found, it checks whether the file appears as the source field (`[0]`)
in the corresponding mapping table. If a meta file is NOT referenced by any entry, emit
a non-fatal warning (exit 0, but print visibly):

```
△ Reverse-drift warning: forge/meta/personas/meta-newrole.md found in meta/ but is not referenced by PERSONA_MAP. Add it to the mapping table or confirm it intentionally has no generated output.
```

This catches: "contributor adds `meta-newpersona.md` but forgets to add it to PERSONA_MAP."
The tool exits 0 regardless — this is a developer warning only, not a blocking error.

**Source verification:** For each entry in PERSONA_MAP, WORKFLOW_MAP, and TEMPLATE_MAP
whose source field is non-null, the tool also checks that the source file exists in
`forge/meta/` and emits a warning (non-fatal) for any missing source file.
This provides a sanity check when sources are renamed.

**Output format — `structure-manifest.json`:**

```json
{
  "version": "0.9.8",
  "generatedAt": "<ISO timestamp>",
  "generatedByTool": "build-manifest.cjs",
  "namespaces": {
    "personas": {
      "logicalKey": "personas",
      "dir": ".forge/personas",
      "files": ["architect.md", "bug-fixer.md", "collator.md",
                "engineer.md", "qa-engineer.md", "supervisor.md"]
    },
    "skills": {
      "logicalKey": "skills",
      "dir": ".forge/skills",
      "files": ["architect-skills.md", "bug-fixer-skills.md", "collator-skills.md",
                "engineer-skills.md", "qa-engineer-skills.md", "supervisor-skills.md"]
    },
    "workflows": {
      "logicalKey": "workflows",
      "dir": ".forge/workflows",
      "files": ["architect_approve.md", "architect_review_sprint_completion.md",
                "architect_sprint_intake.md", "architect_sprint_plan.md",
                "collator_agent.md", "commit_task.md", "fix_bug.md",
                "implement_plan.md", "orchestrate_task.md", "plan_task.md",
                "quiz_agent.md", "review_code.md", "review_plan.md",
                "run_sprint.md", "sprint_retrospective.md", "update_implementation.md",
                "update_plan.md", "validate_task.md"]
    },
    "templates": {
      "logicalKey": "templates",
      "dir": ".forge/templates",
      "files": ["CODE_REVIEW_TEMPLATE.md", "CUSTOM_COMMAND_TEMPLATE.md",
                "PLAN_REVIEW_TEMPLATE.md", "PLAN_TEMPLATE.md", "PROGRESS_TEMPLATE.md",
                "RETROSPECTIVE_TEMPLATE.md", "SPRINT_MANIFEST_TEMPLATE.md",
                "SPRINT_REQUIREMENTS_TEMPLATE.md", "TASK_PROMPT_TEMPLATE.md"]
    },
    "commands": {
      "logicalKey": "commands",
      "dir": ".claude/commands",
      "files": ["approve.md", "collate.md", "commit.md", "fix-bug.md",
                "implement.md", "plan.md", "retrospective.md", "review-code.md",
                "review-plan.md", "run-sprint.md", "run-task.md",
                "sprint-intake.md", "sprint-plan.md"]
    },
    "schemas": {
      "logicalKey": "schemas",
      "dir": ".forge/schemas",
      "files": ["bug.schema.json", "event.schema.json", "feature.schema.json",
                "sprint.schema.json", "task.schema.json"]
    }
  }
}
```

Note: `logicalKey` is added to each namespace entry to enable `check-structure.cjs`
to resolve the actual filesystem directory through `.forge/config.json` at runtime
(see Phase C).

**Total expected output files:** 6 + 6 + 18 + 9 + 13 + 5 = **57** files across 6 namespaces.
(+1 from original 56 due to adding `CUSTOM_COMMAND_TEMPLATE.md` to `templates`.)

Run `node --check forge/tools/build-manifest.cjs` after creating.

#### Step B2 — Run `build-manifest.cjs` to generate `forge/schemas/structure-manifest.json`

```sh
cd /home/boni/src/forge
node forge/tools/build-manifest.cjs --forge-root forge/
```

Verify the output exists and contains all 57 file entries:
```sh
node -e "
  const m = JSON.parse(require('fs').readFileSync('forge/schemas/structure-manifest.json','utf8'));
  const total = Object.values(m.namespaces).reduce((s,n)=>s+n.files.length,0);
  console.log('Total files:', total, '(expected 57)');
"
```

---

### Phase C — Check-structure tool

#### Step C1 — Create `forge/tools/check-structure.cjs`

**File:** `forge/tools/check-structure.cjs` (NEW)
**Change type:** new tool

This tool reads `structure-manifest.json` from the plugin and checks each listed file
against the actual filesystem under `PROJECT_ROOT`.

**Interface:**
```
node check-structure.cjs [--strict] [--path <project-root>]
```
- `--path <project-root>`: directory to check against (defaults to `process.cwd()`)
- `--strict`: also report files present in each namespace directory that are NOT in the
  manifest (extra/unrecognized files)

**Config-aware path resolution:**

The tool reads `<project-root>/.forge/config.json` to resolve the actual filesystem
directory for each namespace. For each namespace in the manifest, the tool:

1. Reads the `logicalKey` field from the namespace entry (e.g. `"personas"`,
   `"workflows"`, `"commands"`, `"templates"`, `"schemas"`)
2. Checks if `.forge/config.json` `paths.<logicalKey>` is set; if so, uses that value
   as the directory path relative to `PROJECT_ROOT`
3. Falls back to the manifest's `dir` field if no config override is present

This ensures the checker respects custom `paths.*` values in `.forge/config.json`.
If `.forge/config.json` is absent or unparseable, fall back to using the manifest's
`dir` field for all namespaces and emit a single warning:
```
△ .forge/config.json not found or unreadable — using manifest default paths
```

**Logic:**

```
1. Load $FORGE_ROOT/schemas/structure-manifest.json
   (FORGE_ROOT resolved from __dirname/../ — the tool lives in forge/tools/)
2. Load <project-root>/.forge/config.json (for path overrides)
3. For each namespace in manifest.namespaces:
   a. Resolve actual dir: config.paths[logicalKey] ?? namespace.dir
   b. For each expected filename:
      - Check if <project-root>/<resolved-dir>/<filename> exists
      - Categorize: present | missing
   c. If --strict: also walk the namespace dir for files not in the manifest → extra
4. Emit summary per namespace:
   〇 .forge/personas/ — 6/6 present
   × .forge/workflows/ — 15/18 present, 3 missing:
       × fix_bug.md
       × orchestrate_task.md
       × quiz_agent.md
5. Emit totals:
   ── Structure check: 54 present, 3 missing (of 57 expected)
6. Exit 0 if all present (or 0 missing)
   Exit 1 if any missing
   (Extra-only → exit 0 without --strict, exit 1 with --strict if any extra found)
```

**Output style:** Japanese marks as per project style: `〇` = present, `△` = extra/warning, `×` = missing.

If all 57 files are present:
```
〇 Structure check: all 57 expected files present.
```

Run `node --check forge/tools/check-structure.cjs` after creating.

---

### Phase D — Integrate `check-structure` into `forge:health`

**File:** `forge/commands/health.md`
**Change type:** add new check step

Add a new check immediately after Step 6 (modified generated files) and before Step 7
(skill gaps). Insert as **Step 7: Generated file structure** and renumber subsequent
steps 7→8, 8→9, 9→10, 10→11.

New step text:

```markdown
7. Check generated file structure:
   ```sh
   cd "$PROJECT_ROOT" && node "$FORGE_ROOT/tools/check-structure.cjs" --path "$PROJECT_ROOT"
   ```
   If missing files are reported, include them in the health report under
   **Generated file structure** with note:
   > N expected file(s) are missing from generated output. Run `/forge:update` to
   > regenerate missing files, or `/forge:regenerate <namespace>` for targeted repair.
   If all files are present (exit 0), emit:
   > 〇 Generated file structure — all expected files present.
   If the tool is absent (file not found), skip this check silently.
   Note: custom `paths.*` overrides in `.forge/config.json` are respected by
   check-structure.cjs. Projects using default paths will see no difference.
```

Update the Checks table at the top of `health.md` to add a new row:

| **Generated file structure** | Files expected by the plugin's structure-manifest that are absent from `.forge/` or `.claude/commands/` |

---

### Phase E — Integrate `check-structure` into `forge:update` Step 4

**File:** `forge/commands/update.md`
**Change type:** add post-migration check

At the end of Step 4 (Apply migrations), after all regeneration targets have been
executed and confirmed successful, add the following:

```markdown
### Post-migration structure check

After all regeneration targets complete, run:
```sh
node "$FORGE_ROOT/tools/check-structure.cjs" --path .
```

If exit 0 (all present):
> 〇 All expected generated files are present.

If exit 1 (gaps remain):
> △ Structure check: N file(s) still missing after migration:
>   (list missing files)
>
> This may indicate a failed regeneration step. Re-run `/forge:regenerate <namespace>`
> for each affected namespace, or `/forge:regenerate` to rebuild all targets.
> Note: skills entries require an explicit `/forge:regenerate skills` — they are not
> included in the default regenerate run.

Do NOT block migration success on gaps — surface them as a warning only. The user
is already informed of failed regeneration steps by the Iron Laws above; this check
is an additional safety net.
```

Insert this block immediately before the "→ Step 5" transition, after the final
regeneration loop.

**Acceptance criterion for Phase E (smoke test):**
After all code changes are complete, verify that `update.md` contains the
`check-structure.cjs` invocation by reading the file and confirming the block above
is present at the end of Step 4. As a simpler alternative to a full live migration
simulation: read the updated `update.md` and confirm:
1. The `node "$FORGE_ROOT/tools/check-structure.cjs" --path .` line is present
2. It appears after the final regeneration loop and before the Step 5 transition
3. The warning text for gaps mentions `/forge:regenerate skills` explicitly

A full live upgrade simulation (copy dogfooding instance to `/tmp/forge-test/`, run
`/forge:update` against it) is the ideal verification. If the environment supports it,
perform the simulation and confirm the post-migration structure banner is displayed.

---

### Phase F — Update CLAUDE.md

**File:** `CLAUDE.md` (project root — this is docs, no version bump needed)
**Change type:** documentation

In the **Versioning** section's "Also required with every version bump" list, add a
note after the security scan item:

```markdown
4. **Run `build-manifest.cjs` after any meta/ file change:**
   If you add, rename, or remove any file in `forge/meta/personas/`,
   `forge/meta/workflows/`, `forge/meta/templates/`, or `forge/schemas/*.schema.json`,
   update the corresponding mapping table in `forge/tools/build-manifest.cjs` and
   re-run it to regenerate `forge/schemas/structure-manifest.json`. Commit both the
   updated tool and the updated manifest together.
   Note: `CUSTOM_COMMAND_TEMPLATE.md` is a one-shot init artifact (no meta source).
   Do not add a meta source for it — keep its TEMPLATE_MAP entry as `[null, 'CUSTOM_COMMAND_TEMPLATE.md']`.
```

Also add a row to the "Where things live" table:

| Rebuild structure manifest | Edit mapping in `forge/tools/build-manifest.cjs`, then `node forge/tools/build-manifest.cjs --forge-root forge/` |

---

### Phase G — Version bump and migration

#### Step G1 — Bump version in `forge/.claude-plugin/plugin.json`

**File:** `forge/.claude-plugin/plugin.json`
**Change:** `"version": "0.9.7"` → `"version": "0.9.8"`

Note: The analysis said `0.9.6 → 0.9.7`, but `0.9.7` was already taken by the
fix-bug persona assignment fix committed to `forge/migrations.json`. The correct
bump is `0.9.7 → 0.9.8`.

#### Step G2 — Add migration entry to `forge/migrations.json`

Add at the top of the object (most-recent entry first):

```json
"0.9.7": {
  "version": "0.9.8",
  "date": "2026-04-15",
  "notes": "Structure manifest: add check-structure.cjs and build-manifest.cjs for deterministic generated-file verification; add clear-namespace to generation-manifest.cjs (with prefix-shape guard); integrate structure check into forge:health and forge:update. Fixes 14 stale generation-manifest entries from role-based naming. CUSTOM_COMMAND_TEMPLATE.md now tracked in structure-manifest (57 expected files, up from 56).",
  "regenerate": [],
  "breaking": false,
  "manual": []
}
```

`regenerate: []` because:
- The new tools (`build-manifest.cjs`, `check-structure.cjs`) ship with the plugin
  and are invoked directly via `$FORGE_ROOT/tools/` — no user regeneration needed.
- The updated `health.md` and `update.md` are plugin commands, not generated files —
  they take effect immediately on install.
- `structure-manifest.json` is a new file in `forge/schemas/` — it is present in the
  installed plugin from day one, no separate regeneration target.
- `breaking: false` holds only because CUSTOM_COMMAND_TEMPLATE.md is tracked but its
  manifest entry re-record is handled transparently via the re-record step in A2.

#### Step G3 — Security scan

After all code changes are complete, run:
```
/security-watchdog:scan-plugin forge:forge --source-path forge/
```

Save the full report to `docs/security/scan-v0.9.8.md` and commit it.

Add a row to the Security Scan History table in `README.md`:
```
| 0.9.8 | 2026-04-15 | [scan-v0.9.8.md](docs/security/scan-v0.9.8.md) | <summary> |
```

---

## File Change Summary

| File | Nature | Phase |
|------|--------|-------|
| `forge/tools/generation-manifest.cjs` | Extend: add `clear-namespace` subcommand with prefix-shape guard | A1 |
| `forge/commands/regenerate.md` | Edit: add `clear-namespace` call before each full-rebuild loop (personas, workflows, commands, templates); add CUSTOM_COMMAND_TEMPLATE.md re-record step after templates loop; add `clear-namespace` to skills section (explicit-only) | A2 |
| `.forge/generation-manifest.json` | Dogfooding fix: remove 14 stale entries | A3 |
| `forge/tools/build-manifest.cjs` | NEW: derive structure-manifest from forge/meta/ with reverse-drift detection | B1 |
| `forge/schemas/structure-manifest.json` | NEW (generated): structure manifest output (57 files, includes CUSTOM_COMMAND_TEMPLATE.md) | B2 |
| `forge/tools/check-structure.cjs` | NEW: filesystem checker vs structure-manifest; config-aware path resolution via .forge/config.json paths.* | C1 |
| `forge/commands/health.md` | Edit: add Step 7 structure check (renumber 7-10 → 8-11); add note about custom paths support | D |
| `forge/commands/update.md` | Edit: add post-migration structure check at end of Step 4; warning mentions skills limitation | E |
| `CLAUDE.md` | Docs: document build-manifest.cjs run requirement; note CUSTOM_COMMAND_TEMPLATE.md init-only status | F |
| `forge/.claude-plugin/plugin.json` | Version bump: 0.9.7 → 0.9.8 | G1 |
| `forge/migrations.json` | Add migration entry `0.9.7 → 0.9.8` | G2 |
| `docs/security/scan-v0.9.8.md` | Security scan report | G3 |

---

## Implementation Order

Phases must be executed in this order due to dependencies:

1. **A1** (extend generation-manifest.cjs with clear-namespace + prefix guard) — independent
2. **A2** (update regenerate.md) — depends on A1 (references new subcommand); add skills section clear + template re-record step
3. **A3** (remove stale entries from dogfooding instance) — can use the new subcommand from A1, or `remove` the old way; either is fine
4. **B1** (create build-manifest.cjs with reverse-drift detection, CUSTOM_COMMAND_TEMPLATE.md in TEMPLATE_MAP) — independent
5. **B2** (run build-manifest to generate structure-manifest.json) — depends on B1; verify total is 57
6. **C1** (create check-structure.cjs with config-aware path resolution) — depends on B2 (reads structure-manifest.json)
7. **D** (update health.md) — depends on C1 existing
8. **E** (update update.md with skills limitation note) — depends on C1 existing
9. **F** (update CLAUDE.md with CUSTOM_COMMAND_TEMPLATE note) — independent
10. **G1+G2** (version bump + migration with updated notes) — after all code changes
11. **G3** (security scan) — must be last; scans final state

---

## Acceptance Criteria

- [ ] `node "$FORGE_ROOT/tools/generation-manifest.cjs" clear-namespace .forge/personas/` removes all persona entries and prints `〇 Cleared N entries matching .forge/personas/`
- [ ] `node "$FORGE_ROOT/tools/generation-manifest.cjs" clear-namespace personas` exits 2 with usage error (prefix guard rejects missing `.forge/` prefix)
- [ ] `node "$FORGE_ROOT/tools/generation-manifest.cjs" clear-namespace .forge/personas` exits 2 with usage error (prefix guard rejects missing trailing `/`)
- [ ] `node "$FORGE_ROOT/tools/generation-manifest.cjs" list --modified` reports 0 `× missing` for `.forge/personas/` and `.forge/skills/` namespaces in the dogfooding instance
- [ ] `forge/commands/regenerate.md` calls `clear-namespace` before each full-rebuild loop for: personas, workflows, commands, templates
- [ ] `forge/commands/regenerate.md` calls `clear-namespace .forge/skills/` in the `skills` category section (NOT in the default run path)
- [ ] `forge/commands/regenerate.md` re-records `CUSTOM_COMMAND_TEMPLATE.md` after the templates loop (conditional on file existence)
- [ ] `node forge/tools/build-manifest.cjs --forge-root forge/` produces `forge/schemas/structure-manifest.json` with exactly **57** entries across 6 namespaces
- [ ] `forge/schemas/structure-manifest.json` templates namespace contains `CUSTOM_COMMAND_TEMPLATE.md`
- [ ] `forge/tools/build-manifest.cjs` emits a reverse-drift warning when a `meta-*.md` file exists in `forge/meta/` but is not referenced by any mapping table entry
- [ ] `node forge/tools/check-structure.cjs` exits 0 when all 57 files are present, exits 1 if any are missing
- [ ] `node forge/tools/check-structure.cjs` reads `.forge/config.json` `paths.*` keys to resolve directories; or, if `config.json` is absent, falls back to manifest `dir` field with a warning
- [ ] `.forge/templates/CUSTOM_COMMAND_TEMPLATE.md` survives a full `/forge:regenerate templates` run (it must remain present and remain tracked in the generation-manifest)
- [ ] `forge/commands/health.md` contains Step 7 structure check with correct shell invocation referencing `check-structure.cjs`
- [ ] `forge/commands/update.md` contains post-migration structure check at the end of Step 4 with mention of `/forge:regenerate skills` for skill gaps
- [ ] `update.md` smoke test: reading the file confirms `node "$FORGE_ROOT/tools/check-structure.cjs" --path .` appears after the final regeneration loop and before the Step 5 transition
- [ ] `CLAUDE.md` documents `build-manifest.cjs` run requirement for meta/ file changes and notes `CUSTOM_COMMAND_TEMPLATE.md` is a `[null, ...]` init-only entry
- [ ] `forge/.claude-plugin/plugin.json` version is `0.9.8`
- [ ] `forge/migrations.json` contains `"0.9.7"` entry pointing to version `"0.9.8"`
- [ ] `node --check` passes on all modified/created `.cjs` files
- [ ] Security scan report saved to `docs/security/scan-v0.9.8.md`
- [ ] README.md security table updated

---

## Risk Notes

**Risk: `clear-namespace` too broad.** Mitigated by the prefix-shape guard added in A1:
the subcommand now rejects any prefix that doesn't start with `.forge/` or `.claude/`
and end with `/`. Exit 2 with a clear usage error. This closes the footgun of
`clear-namespace personas` matching unintended entries.

**Risk: `CUSTOM_COMMAND_TEMPLATE.md` orphaned by template clear.** Mitigated by:
(a) adding it to TEMPLATE_MAP with `null` source in B1 (so check-structure knows to
expect it), and (b) adding an explicit re-record step in regenerate.md after the
templates loop in A2 (so the generation-manifest stays in sync). These two changes
together ensure the file is both tracked in the structure-manifest and re-recorded
in the generation-manifest on every templates regeneration run.

**Risk: `skills` stale entries not cleared by default regenerate.** By design:
`skills` is not in the default run. Users must run `/forge:regenerate skills` explicitly
to clear stale skill entries after a rename. This limitation is documented in the
Overview and in the update.md warning text (Phase E). The implementation for the
`skills` section in A2 is correct — `clear-namespace .forge/skills/` is present in the
skills category section; it just doesn't execute on a default `/forge:regenerate` run.

**Risk: `build-manifest.cjs` drifts from `forge/meta/`.** Mitigated by two mechanisms:
(1) The CLAUDE.md update (Phase F) formally documents the requirement to update mapping
tables and re-run the tool after any meta/ file change. (2) The reverse-drift detection
added in B1 warns at build time if meta files are not referenced by any mapping table.
Together these provide both human process and automated detection.

**Risk: `check-structure.cjs` FORGE_ROOT resolution.** The tool is invoked as
`node "$FORGE_ROOT/tools/check-structure.cjs"`, so `__dirname` resolves to
`$FORGE_ROOT/tools/`. The manifest is at `$FORGE_ROOT/schemas/structure-manifest.json`,
i.e. `path.join(__dirname, '..', 'schemas', 'structure-manifest.json')`. This is safe
for both managed installs and canary installs.

**Risk: partial execution leaves manifest in incomplete state.** If `clear-namespace`
succeeds but subsequent `record` calls fail midway, the manifest is left with an
incomplete namespace. The tool does not perform atomic swap. Recovery: re-run
`/forge:regenerate <namespace>` to rebuild. This is documented-by-convention; no
atomicity mechanism is added in this fix.

**Risk: `structure-manifest.json` version diverges from plugin.json.** The
`build-manifest.cjs` embeds the version from `forge/.claude-plugin/plugin.json` at
build time. As long as the release engineering checklist includes running
`build-manifest.cjs`, versions stay in sync. The CLAUDE.md addition formalises this.
