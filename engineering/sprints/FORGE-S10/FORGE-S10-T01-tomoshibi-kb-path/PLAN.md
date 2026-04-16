# PLAN — FORGE-S10-T01: Tomoshibi Agent + KB Path Configurability + Workflow Links

🌱 *Forge Engineer*

**Task:** FORGE-S10-T01
**Sprint:** FORGE-S10
**Estimate:** L

---

## Objective

Introduce Tomoshibi (灯), Forge's first named agent, whose mission is to ensure every coding-agent
instruction file in a user's project (CLAUDE.md, AGENTS.md, .cursorrules,
.github/copilot-instructions.md, GEMINI.md, etc.) has up-to-date links to both the Forge knowledge
base and the generated workflow entry points. Additionally, make the KB folder name user-configurable
during init pre-flight rather than silently defaulting to `engineering/`.

Together these changes solve a persistent gap: after `forge:init` completes, other coding agents are
blind to the KB and SDLC workflows Forge just generated; and projects where `engineering/` already
carries another meaning cannot use a different folder name without manual config surgery.

---

## Approach

### Part A — Tomoshibi Agent

Create `forge/agents/tomoshibi.md` — a full named-agent definition following the Claude Code
`agents/` convention (auto-discovered by the plugin loader).

**Agent responsibilities:**

1. Read `paths.engineering` from `.forge/config.json` → KB root path (`KB_PATH`).
2. Detect agent instruction files using a known-agent detection table:

   | File | Coding tool |
   |------|------------|
   | `CLAUDE.md` | Claude Code |
   | `AGENTS.md` | OpenAI Codex / generic |
   | `AGENT.md` | generic |
   | `.github/copilot-instructions.md` | GitHub Copilot |
   | `.cursorrules` | Cursor (legacy) |
   | `.cursor/rules/*.mdc` | Cursor (current) |
   | `GEMINI.md` | Google Gemini |

3. For each found file: check for both managed marker pairs (KB links and workflow links).
4. Before writing: verify which KB index files and workflow files actually exist on disk.
5. Present a single consolidated approval prompt (covering all detected files) with explicit reasoning.
6. On approval: write/refresh both managed sections (idempotent via markers).
7. On subsequent runs: diff current marker content vs. computed content — only prompt if stale.

**Two managed sections per file:**

```markdown
<!-- forge-kb-links: managed by Forge — do not edit manually -->
## Forge Knowledge Base

| Index | Contents |
|-------|----------|
| [MASTER_INDEX]({KB_PATH}/MASTER_INDEX.md) | All sprints, tasks, bugs, and features |
| [Architecture]({KB_PATH}/architecture/INDEX.md) | Stack, processes, database, routing, deployment |
| [Business Domain]({KB_PATH}/business-domain/INDEX.md) | Entity model and domain concepts |

Personas live in `.forge/personas/`.
<!-- /forge-kb-links -->

<!-- forge-workflow-links: managed by Forge — do not edit manually -->
## Forge Workflows

| Workflow | Purpose |
|----------|---------|
| [Plan](.forge/workflows/plan_task.md) | Research codebase → implementation plan |
| [Implement](.forge/workflows/implement_plan.md) | Execute approved plan → code changes |
| [Fix bug](.forge/workflows/fix_bug.md) | Triage → fix → verify |
| [Run task](.forge/workflows/orchestrate_task.md) | Full task pipeline (plan → implement → review → commit) |
| [Run sprint](.forge/workflows/run_sprint.md) | Full sprint orchestration |
<!-- /forge-workflow-links -->
```

Rules:
- Only rows for files that actually exist on disk are written (no dead links)
- KB section: `MASTER_INDEX.md`, `architecture/INDEX.md`, `business-domain/INDEX.md`
- Workflow section: fixed set of user-facing entry points (`plan_task`, `implement_plan`, `fix_bug`, `orchestrate_task`, `run_sprint`, `architect_sprint_plan`, `architect_sprint_intake`) — included only if the file exists
- Sections are independent — each has its own markers and can be refreshed independently

**Approval prompt format:**

```
灯 Tomoshibi — KB & Workflow Visibility

Forge has generated a knowledge base and SDLC workflows for this project. Without links
to these in your agent instruction files, every new conversation starts blind — no KB
context, no workflow playbook.

Found agent instruction files:
  〇 CLAUDE.md        — no Forge KB links, no workflow links
  〇 AGENTS.md        — no Forge KB links, no workflow links

Add ## Forge Knowledge Base and ## Forge Workflows sections to each? [Y/n]
(or choose individually: [c])
```

**Trigger points:**
- `forge:init` Phase 12 (new) — after smoke test, KB just built
- `forge:update` Step 7 (new) — after state record
- `meta-collate.md` Finalize step 4 (new) — after MASTER_INDEX write

### Part B — KB Path Configurability

Add a pre-flight question in `sdlc-init.md` **before Phase 1**, immediately after `$FORGE_ROOT` setup:

```
━━━ Knowledge Base Folder ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Forge will create a folder for architecture docs, sprints, bugs, and features.
Default name: engineering/

Does "engineering" conflict with an existing folder in this project? [n/Y]
If yes, enter your preferred name (e.g. ai-docs, .forge-kb, docs/ai): ___
```

- If user accepts default: no write needed (`paths.engineering` defaults to `"engineering"` via schema).
- If user provides custom name: write it immediately via:
  ```sh
  node "$FORGE_ROOT/tools/manage-config.cjs" set paths.engineering "{chosen_name}"
  ```

All subsequent init phases resolve KB_PATH from config:
```sh
KB_PATH: !`node "$FORGE_ROOT/tools/manage-config.cjs" get paths.engineering 2>/dev/null || echo "engineering"`
```

Add a one-line note in the Phase 12 completion output:
> "To rename the KB folder later: (a) rename the folder, (b) run
> `node "$FORGE_ROOT/tools/manage-config.cjs" set paths.engineering <new-name>`."

---

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/agents/tomoshibi.md` | **NEW** — complete agent definition | Plugin auto-discovers `agents/` directory |
| `forge/commands/init.md` | Phase count 11→12; add Phase 12 line to pre-flight summary; extend resume mapping table (Phase 11→12) | Tomoshibi is Phase 12 |
| `forge/init/sdlc-init.md` | Pre-flight KB path question before Phase 1; Phase 11 heading updated to `11/12`; new `## Phase 12` block invoking Tomoshibi via Agent tool; replace all `engineering/` hardcoding with `{KB_PATH}`; move `.forge/init-progress.json` deletion to Phase 12 | Core init orchestration |
| `forge/init/smoke-test.md` | Add `KB_PATH` read from config at top; replace `engineering/` refs | Smoke-test checks must use configured path |
| `forge/init/generation/generate-knowledge-base.md` | Add `KB_PATH` read; replace all output path refs | KB generation must use configured path |
| `forge/init/generation/generate-orchestration.md` | Add `KB_PATH` read; replace `engineering/MASTER_INDEX.md` ref | Orchestrator references MASTER_INDEX |
| `forge/init/generation/generate-commands.md` | Replace `engineering/MASTER_INDEX.md` ref in the prohibition comment | Doc accuracy |
| `forge/commands/remove.md` | Read KB path from config; fix inventory check (`[ -d "{KB_PATH}" ]`); update Step 2 table; update Step 3 confirmation text; fix `rm -rf` commands in Step 5 | Remove must target correct KB path |
| `forge/commands/update.md` | Add Step 7 block; renumber all six existing `N/6` banners to `N/7`; update Progress Output Format note from `N/6` to `N/7`; invoke Tomoshibi via Agent tool | Post-update KB link check; consistent step count |
| `forge/meta/workflows/meta-collate.md` | Add step 4 to Finalize block: invoke Tomoshibi | Post-collation KB link check |

---

## Plugin Impact Assessment

- **Version bump required?** Yes — first agent in the plugin, new init phase, new update step, new
  collate finalization step. Target: **`0.10.0`** (new minor version marking agent introduction).
- **Migration entry required?** Yes.
  - From-key: **`"0.9.18"`** (current version — always re-read `forge/.claude-plugin/plugin.json`
    immediately before writing to avoid a stale key).
  - `regenerate: ["workflows:collator_agent"]` — meta-collate.md changes require collate workflow
    regeneration for existing projects.
  - `breaking: false` — all changes are additive; Tomoshibi is advisory/opt-in.
  - `manual: []` — no manual steps required.
- **Security scan required?** Yes — any change to `forge/` requires scan.
- **Schema change?** No — `paths.engineering` already exists in `forge/sdlc-config.schema.json`
  with `"default": "engineering"`. No store schema changes.

---

## Implementation Order

Execute in this order to avoid forward dependencies:

1. Create `forge/agents/` directory + `tomoshibi.md`
2. Modify `forge/init/sdlc-init.md` (pre-flight + Phase 12 + `engineering/` replacements)
3. Modify `forge/init/smoke-test.md` (KB_PATH + engineering refs)
4. Modify `forge/init/generation/generate-knowledge-base.md` (KB_PATH + path refs)
5. Modify `forge/init/generation/generate-orchestration.md` (KB_PATH + MASTER_INDEX ref)
6. Modify `forge/init/generation/generate-commands.md` (MASTER_INDEX ref)
7. Modify `forge/commands/init.md` (phase count + resume mapping)
8. Modify `forge/commands/update.md` (Step 7)
9. Modify `forge/commands/remove.md` (KB path from config)
10. Modify `forge/meta/workflows/meta-collate.md` (Tomoshibi in Finalize)

---

## Testing Strategy

```sh
# Syntax check — no .cjs files modified; confirm existing hooks still pass
node --check forge/hooks/check-update.js
node --check forge/hooks/triage-error.js

# Store validation — no schema changes expected
node forge/tools/validate-store.cjs --dry-run

# Manual smoke test (in forge-testbench/cartographer or equivalent):
# 1. Run forge:init — confirm pre-flight asks KB folder question before Phase 1
# 2. Accept default "engineering" — confirm no regression in existing KB output
# 3. Use custom name "ai-docs" — confirm KB folder created as ai-docs/
# 4. Confirm Phase 12 runs and detects CLAUDE.md + AGENTS.md
# 5. Approve links — verify forge-kb-links section written to both files
# 6. Run forge:init again from Phase 12 — idempotency: should say "links current, no changes"
# 7. Run forge:update — confirm Step 7 runs Tomoshibi
# 8. Run collate — confirm Tomoshibi invoked in Finalize
```

---

## Acceptance Criteria

- [ ] `forge/agents/tomoshibi.md` exists with valid YAML frontmatter `description:` field
- [ ] KB folder pre-flight question appears before Phase 1 banner in forge:init
- [ ] Custom KB path (e.g., `ai-docs`) flows through to all generated output paths
- [ ] Phase 12 runs after smoke test in forge:init and invokes Tomoshibi
- [ ] forge:init completion output includes rename-instructions note
- [ ] `forge:update` Step 7 banner emitted (`━━━ Step 7/7`); Tomoshibi invoked
- [ ] All six existing step banners in `update.md` renumbered from `N/6` to `N/7`
- [ ] `update.md` Progress Output Format note updated to `N/7`
- [ ] `init.md` resume mapping table extended with `11 → Phase 12` row
- [ ] `meta-collate.md` Finalize includes Tomoshibi step 4
- [ ] Tomoshibi correctly detects CLAUDE.md and AGENTS.md in cartographer test project
- [ ] KB section written with correct `{KB_PATH}` substitution (not hardcoded `engineering`)
- [ ] `<!-- forge-kb-links -->` / `<!-- /forge-kb-links -->` markers present after first write
- [ ] Workflow section written with only existing `.forge/workflows/` entry points
- [ ] `<!-- forge-workflow-links -->` / `<!-- /forge-workflow-links -->` markers present after first write
- [ ] Both sections managed independently (KB section can be stale without workflow section being stale)
- [ ] Idempotency: second run with unchanged KB and workflows → `〇 Links current, no changes needed`
- [ ] Only existing files linked in both sections (no dead links on minimal configurations)
- [ ] `remove.md` inventory check uses KB path from config, not hardcoded `engineering`
- [ ] `remove.md` Step 3 confirmation text uses actual KB path
- [ ] `node --check` passes on all modified JS/CJS files (none modified, but verify baseline)
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0
- [ ] `forge/migrations.json` entry: from-key `"0.9.18"` → `"0.10.0"`, `regenerate: ["workflows:collator_agent"]`, `breaking: false`
- [ ] `forge/.claude-plugin/plugin.json` version bumped to `0.10.0`

---

## Operational Impact

- **Distribution:** Users need `/forge:update` after installing 0.10.0 to regenerate their
  `collator_agent.md` workflow (adds Tomoshibi invocation in Finalize). The agent itself is
  available immediately after plugin install with no regeneration required.
- **Backwards compatibility:** Fully backwards compatible. `paths.engineering` defaults to
  `"engineering"` — existing projects are unaffected. Tomoshibi's prompt is advisory and
  per-file opt-in; declining has no side effects.

---

## Implementation Notes

### Marker detection

Open marker prefix match (tolerates minor text variations):
```
<!-- forge-kb-links
```
Close marker exact match:
```
<!-- /forge-kb-links -->
```

### KB path re-read pattern (used in every modified markdown file)

```sh
KB_PATH: !`node "$FORGE_ROOT/tools/manage-config.cjs" get paths.engineering 2>/dev/null || echo "engineering"`
```

Every file that references the KB path reads it this way. The `|| echo "engineering"` fallback
ensures graceful behaviour if config is absent (e.g., during early init phases).

### Phase numbering in sdlc-init.md

Current phase count is 11. After this task:
- Phases 1–11 remain, heading text updated to `X/12`
- Phase 12 (new) is Tomoshibi invocation
- `init-progress.json` deletion moves from Phase 11 to Phase 12 (so a Phase 12 failure is
  resumable from Phase 12, not forcing re-run of Phase 11)

### Phase 5 calibration baseline — KB path

The calibration baseline block in Phase 5 of `sdlc-init.md` contains a hardcoded
`engineering/MASTER_INDEX.md` in a node shell command (the hash computation). This must
also be replaced with `{KB_PATH}/MASTER_INDEX.md`. It is mid-block and easy to miss —
verify it is included in the `sdlc-init.md` replacement pass.

### manage-config.cjs path sanitisation

The pre-flight KB path question accepts free-text input. Before passing to
`manage-config.cjs set paths.engineering`, verify the tool correctly quotes the value
(protects against names with spaces). If it does not, add a validation note to the
pre-flight question: "Folder name must not contain spaces."

### forge:remove smoke test (custom path)

Manual smoke test must include: after `forge:init` with KB path `ai-docs`, run
`forge:remove` option 3 and verify it removes `ai-docs/`, not `engineering/`.

### Verify generated collator_agent.md Finalize structure

After adding Tomoshibi invocation to `meta-collate.md`, the generated `collator_agent.md`
must gain a correctly structured Finalize step. Verify the generated output matches the
expected Agent tool invocation pattern before closing the task.

### Tomoshibi invocation pattern (used in init, update, meta-collate)

```
Use the Agent tool:
  description: "灯 Tomoshibi — link KB to agent instruction files"
  prompt: "You are Tomoshibi, Forge's KB visibility agent. Read `$FORGE_ROOT/agents/tomoshibi.md`
           and follow it exactly."
```

The `$FORGE_ROOT` variable is available in all contexts where Tomoshibi is invoked (init, update,
collate all set it via `FORGE_ROOT: !echo "${CLAUDE_PLUGIN_ROOT}"`).
