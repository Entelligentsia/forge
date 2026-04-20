# Workflow: Orchestrate Task (Forge)

## Purpose

Drive a single Forge task through the full pipeline: plan → review-plan →
implement → review-code → validate → approve → commit. The orchestrator is a
minimal state machine — every phase runs as an Agent tool subagent with a
fresh context window.

---

## Pipeline Resolution

1. Read `.forge/store/tasks/{TASK_ID}.json`.
2. If `task.pipeline` is set, look up `config.pipelines[task.pipeline]` in `.forge/config.json`.
3. If found, use those phases. Otherwise use the **Default Pipeline** below.

## Default Pipeline

```
plan → review-plan [max 3] → implement → review-code [max 3] → validate [max 3] → approve → commit
```

| # | Phase | Command | Role | Workflow File | Max Iter |
|---|-------|---------|------|---------------|----------|
| 1 | plan | `/forge:plan {TASK_ID}` | `plan` | `.forge/workflows/plan_task.md` | — |
| 2 | review-plan | `/forge:review-plan {TASK_ID}` | `review-plan` | `.forge/workflows/review_plan.md` | 3 |
| 3 | implement | `/forge:implement {TASK_ID}` | `implement` | `.forge/workflows/implement_plan.md` | — |
| 4 | review-code | `/forge:review-code {TASK_ID}` | `review-code` | `.forge/workflows/review_code.md` | 3 |
| 5 | validate | `/forge:validate {TASK_ID}` | `validate` | `.forge/workflows/validate_task.md` | 3 |
| 6 | approve | `/forge:approve {TASK_ID}` | `approve` | `.forge/workflows/architect_approve.md` | — |
| 7 | commit | `/forge:commit {TASK_ID}` | `commit` | `.forge/workflows/commit_task.md` | — |

Revision routing: on `Revision Required`, `review-plan` → `plan`, `review-code` → `implement`, `validate` → `implement`.

Custom pipeline phases that define `"model"` in config override the role default.

## Model Resolution

Subagents inherit the parent session's model by default. **Omit the `model`
parameter on Agent tool spawns** — Claude Code resolves the correct model
from its environment.

### Cluster Detection

At session start, detect the execution cluster from environment variables
provided by Claude Code:

| Variable | Purpose |
|----------|---------|
| `CLAUDE_CODE_SUBAGENT_MODEL` | The actual model subagents run on |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | What "opus" resolves to |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | What "sonnet" resolves to |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | What "haiku" resolves to |

```
if ANTHROPIC_DEFAULT_OPUS_MODEL == ANTHROPIC_DEFAULT_SONNET_MODEL == ANTHROPIC_DEFAULT_HAIKU_MODEL:
    cluster = "single"  # all tiers resolve to same model
else:
    cluster = "tiered"  # tiers resolve to different models
```

On **single** clusters (e.g. non-Anthropic runtimes), omit `model` — all
phases inherit the parent model. On **tiered** clusters, the orchestrator
passes `model=opus|sonnet|haiku` based on the role-to-tier mapping below,
and Claude Code resolves the tier name to the actual runtime model.

### Role-to-Tier Mapping

Used only on tiered clusters to select the appropriate model tier:

| Role | Tier | Rationale |
|------|------|-----------|
| `review-plan` | opus | Deep reasoning for spec compliance |
| `review-code` | opus | Deep reasoning for code quality |
| `validate` | opus | Adversarial review needs highest precision |
| `approve` | opus | Architectural sign-off needs broad context |
| `plan` | sonnet | Balanced implementation planning |
| `implement` | sonnet | Balanced coding and iteration |
| `commit` | haiku | Fast, reliable state machine transition |
| `writeback` | haiku | Fast, reliable collation and file writes |

### Dispatch Behavior

| Cluster type | Agent tool `model` param | Phase announcement |
|-------------|------------------------|-------------------|
| Single | Omitted (inherit parent) | `[glm-5.1:cloud]` |
| Tiered | Tier name from mapping | `[opus → claude-opus-4-6]` |
| Per-phase override | Override value from config | `[sonnet → claude-sonnet-4-6]` |
| Unknown | Canonical model from ROLE_TIER defaults | `[sonnet → claude-sonnet-4-6]` |

On **unknown** clusters (no `ANTHROPIC_DEFAULT_*_MODEL` vars set), the orchestrator
falls back to ROLE_TIER with these canonical defaults:

| Tier | Canonical default |
|------|-------------------|
| `opus` | `claude-opus-4-5` |
| `sonnet` | `claude-sonnet-4-6` |
| `haiku` | `claude-haiku-4-5` |

The resolved canonical model is passed as `dispatch_model` so subagents run on a
known model rather than inheriting the orchestrator's own model.

### Per-Phase Override

If a pipeline phase definition in `config.pipelines` includes a `model`
field, it takes precedence over the cluster-based dispatch. This is the
highest priority — it allows users to pin specific phases to specific models
regardless of the detected cluster type.

The orchestrator itself runs on whichever model it was invoked with — it is
a lightweight state machine and does not need a heavy model.

## Context Isolation

**Each phase MUST run as a subagent (Agent tool call), NOT inline.**

Invoking phases inline accumulates context from every prior phase and task into
the orchestrator's window. This violates Forge's design principle of keeping
context light and nimble. By the time a sprint reaches its third or fourth task,
an inline orchestrator is carrying tens of thousands of tokens of prior work that
is irrelevant to the current phase.

The fix: use the Agent tool to spawn a subagent per phase. Each subagent:
- Starts with a fresh context window
- Receives only what it needs: the workflow file path and the task ID
- Reads all other context from disk (task JSON, PLAN.md, MASTER_INDEX.md, etc.)
- Writes results to disk (artifacts, task status updates)
- Returns to the orchestrator, which then reads the verdict from disk

The orchestrator itself stays minimal — it only holds the phase loop and event log.

## Token Self-Reporting

Each phase subagent is responsible for reporting its own token usage via a sidecar file.

**Before returning, every subagent MUST:**

1. Run `/cost` to retrieve token usage for the session.
2. Parse the output for the five fields:
   `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`.
3. Write the usage sidecar via `/forge:store emit {sprintId} '{sidecar-json}' --sidecar` with the exact format:
   ```json
   {
     "inputTokens": <integer>,
     "outputTokens": <integer>,
     "cacheReadTokens": <integer>,
     "cacheWriteTokens": <integer>,
     "estimatedCostUSD": <number>
   }
   ```

The `eventId` is computed by the orchestrator before spawning and passed in the subagent prompt —
it follows the format `{ISO_TIMESTAMP}_{TASK_ID}_{role}_{action}` (e.g.
`20260415T141523000Z_FORGE-S02-T03_engineer_implement`).

The leading underscore on the sidecar filename marks it as ephemeral — `validate-store.cjs` skips
files prefixed with `_`, so the sidecar will never be treated as a real event record. If `/cost` is
unavailable or token data cannot be parsed, skip writing the sidecar silently — the orchestrator
handles missing sidecars gracefully (see Execution Algorithm below).

## Role-to-Noun Mapping

The orchestrator resolves persona and skill file lookups using **noun-based**
filenames, not role-literal filenames. A role like `plan` maps to the noun
`engineer`, so the persona file is `engineer.md`, not `plan.md`.

```
ROLE_TO_NOUN = {
  "plan":        "engineer",
  "implement":   "engineer",
  "update-plan": "engineer",
  "update-impl": "engineer",
  "commit":      "engineer",
  "review-plan": "supervisor",
  "review-code": "supervisor",
  "validate":    "qa-engineer",
  "approve":     "architect",
  "writeback":   "collator",
}
```

| Role | Noun | Persona File | Skill File |
|------|------|-------------|------------|
| `plan` | `engineer` | `.forge/personas/engineer.md` | `.forge/skills/engineer-skills.md` |
| `implement` | `engineer` | `.forge/personas/engineer.md` | `.forge/skills/engineer-skills.md` |
| `review-plan` | `supervisor` | `.forge/personas/supervisor.md` | `.forge/skills/supervisor-skills.md` |
| `review-code` | `supervisor` | `.forge/personas/supervisor.md` | `.forge/skills/supervisor-skills.md` |
| `validate` | `qa-engineer` | `.forge/personas/qa-engineer.md` | `.forge/skills/qa-engineer-skills.md` |
| `approve` | `architect` | `.forge/personas/architect.md` | `.forge/skills/architect-skills.md` |
| `commit` | `engineer` | `.forge/personas/engineer.md` | `.forge/skills/engineer-skills.md` |
| `writeback` | `collator` | `.forge/personas/collator.md` | `.forge/skills/collator-skills.md` |

Generated lookups use `{persona_noun}.md` and `{persona_noun}-skills.md`,
never `{phase.role}.md` or `{phase.role}-skills.md`.

## Persona Injection Modes

Subagent prompts include a **role block** that tells the agent who it is
and what capabilities it has. Two modes are supported, selected by the
`FORGE_PROMPT_MODE` environment variable:

| Mode | Behaviour | Default |
|------|-----------|---------|
| `reference` | Compact summary from `.forge/cache/persona-pack.json`, plus a file_ref pointer to the full persona/skill definitions. | Yes |
| `inline` | Legacy: inject the full verbatim persona and skill file contents. Kept for one version as a rollback path. | |

The pack is built by `/forge:regenerate` and `/forge:materialize` via
`forge/tools/build-persona-pack.cjs`. It compiles YAML frontmatter from
persona and skill meta files into `.forge/cache/persona-pack.json`.

### Helper: `compose_role_block(persona_noun)`

```
def compose_role_block(persona_noun):
    mode = os.environ.get("FORGE_PROMPT_MODE", "reference")

    if mode == "inline":
        # Legacy behaviour — full persona + skill prose inline.
        persona_content = read_file(f".forge/personas/{persona_noun}.md")
        skill_content   = read_file(f".forge/skills/{persona_noun}-skills.md")
        return f"{persona_content}\n\n{skill_content}"

    # Reference mode (default) — compact summary from the pack.
    pack = read_json(".forge/cache/persona-pack.json")
    persona = pack["personas"].get(persona_noun)
    skill   = pack["skills"].get(f"{persona_noun}-skills")

    if not persona:
        raise OrchestratorError(
            f"persona '{persona_noun}' not in persona-pack. "
            "Run /forge:regenerate to rebuild the pack."
        )

    lines = [
        f"You are acting as the {persona['role']}.",
        "",
        f"Persona: {persona['id']} — {persona['summary']}",
        "",
        "Your responsibilities:",
    ]
    for r in persona.get("responsibilities", []):
        lines.append(f"- {r}")
    if persona.get("outputs"):
        lines.append("")
        lines.append(f"Your outputs: {', '.join(persona['outputs'])}")

    if skill:
        lines.append("")
        lines.append("Skill capabilities you have available:")
        for c in skill.get("capabilities", []):
            lines.append(f"- {c}")

    lines.append("")
    lines.append(
        f"Full persona definition: {persona['file_ref']}. "
        + (f"Full skill definition: {skill['file_ref']}. " if skill else "")
        + "Read these only if the task requires deeper behavioural context "
        + "than the summary above provides."
    )
    return "\n".join(lines)
```

**Rollback:** set `FORGE_PROMPT_MODE=inline`. No persisted state to revert.
The `inline` branch will be removed one version after `reference` ships.

## Execution Algorithm

The orchestrator MUST follow this procedure exactly. Do not deviate.

```
# --- Persona symbol lookup (emoji, name, tagline) ---
PERSONA_MAP = {
  "plan":        ("🌱", "Engineer",    "I plan what will be built before any code is written."),
  "implement":   ("🌱", "Engineer",    "I build what was planned. I do not move forward until the code is clean."),
  "update-plan": ("🌱", "Engineer",    "I address what the Supervisor found. No more, no less."),
  "update-impl": ("🌱", "Engineer",    "I address what the Supervisor found. No more, no less."),
  "commit":      ("🌱", "Engineer",    "I close out completed work with a clean, honest commit."),
  "review-plan": ("🌿", "Supervisor",  "I review before things move forward. I read the actual task prompt, not just the plan."),
  "review-code": ("🌿", "Supervisor",  "I review before things move forward. I read the actual code, not the report."),
  "validate":    ("🍵", "QA Engineer", "I validate against what was promised. The code compiling is not enough."),
  "approve":     ("🗻", "Architect",   "I hold the shape of the whole. I give final sign-off before commit."),
  "writeback":   ("🍃", "Collator",    "I gather what exists and arrange it into views."),
}

# --- Banner identity map (banner name per phase role) ---
# Displayed by the orchestrator ONLY (badge before spawn, exit signal after return).
# Subagents do NOT display banners — the orchestrator owns phase announcements.
BANNER_MAP = {
  "plan":        "forge",
  "implement":   "forge",
  "update-plan": "forge",
  "update-impl": "forge",
  "commit":      "forge",
  "review-plan": "oracle",
  "review-code": "oracle",
  "validate":    "lumen",
  "approve":     "north",
  "writeback":   "drift",
}

for each task in dependency_sorted(tasks):
  phases = resolve_pipeline(task)           # from config.pipelines or default
  iteration_counts = {}                     # keyed by phase command name
  i = 0

  # --- Detect execution cluster from env vars (see Model Resolution) ---
  opus_model   = env("ANTHROPIC_DEFAULT_OPUS_MODEL", "")
  sonnet_model = env("ANTHROPIC_DEFAULT_SONNET_MODEL", "")
  haiku_model  = env("ANTHROPIC_DEFAULT_HAIKU_MODEL", "")
  if opus_model and opus_model == sonnet_model == haiku_model:
    cluster = "single"
    resolved_model = opus_model   # all tiers same model
  elif opus_model:
    cluster = "tiered"
    resolved_model = None         # each tier resolves differently
  else:
    cluster = "unknown"
    resolved_model = env("CLAUDE_CODE_SUBAGENT_MODEL", "unknown")

  # --- Role-to-tier mapping for tiered cluster dispatch ---
  ROLE_TIER = {
    "review-plan": "opus",
    "review-code": "opus",
    "validate":    "opus",
    "approve":     "opus",
    "plan":        "sonnet",
    "implement":   "sonnet",
    "commit":      "haiku",
    "writeback":   "haiku",
  }

  # --- Clear progress log for this sprint ---
  progress_log_path = f".forge/store/events/{sprint_id}/progress.log"
  run_bash(f'FORGE_ROOT=$(node -e "console.log(require(\'./.forge/config.json\').paths.forgeRoot)") && node "$FORGE_ROOT/tools/store-cli.cjs" progress-clear {sprint_id}')

  while i < len(phases):
    phase = phases[i]

    # --- Resolve model for display and dispatch (see Model Resolution) ---
    if phase.model:                                   # per-phase override from config
      display_model = phase.model
      dispatch_model = phase.model                   # pass override to Agent tool
      if env(f"ANTHROPIC_DEFAULT_{phase.model.upper()}_MODEL"):
        resolved = env(f"ANTHROPIC_DEFAULT_{phase.model.upper()}_MODEL")
        display_model = f"{phase.model} → {resolved}"
    elif cluster == "single" and resolved_model:
      display_model = resolved_model
      dispatch_model = None                           # inherit parent model
    elif cluster == "tiered":
      tier = ROLE_TIER.get(phase.role, "sonnet")
      resolved = env(f"ANTHROPIC_DEFAULT_{tier.upper()}_MODEL", tier)
      display_model = f"{tier} → {resolved}" if resolved != tier else tier
      dispatch_model = tier                           # pass tier name, Claude Code resolves
    else:
      # Unknown cluster: no ANTHROPIC_DEFAULT_*_MODEL vars set.
      # Fall back to ROLE_TIER with canonical model defaults so subagents
      # run on a predictable model instead of inheriting the orchestrator's own.
      ROLE_TIER_DEFAULTS = {
        "opus":   "claude-opus-4-5",
        "sonnet": "claude-sonnet-4-6",
        "haiku":  "claude-haiku-4-5",
      }
      tier = ROLE_TIER.get(phase.role, "sonnet")
      canonical = ROLE_TIER_DEFAULTS[tier]
      display_model = f"{tier} → {canonical}"
      dispatch_model = canonical                      # pass full model id to Agent tool

    # --- Compute eventId before spawning so the subagent can name its sidecar ---
    start_ts = current_iso_timestamp()       # e.g. "20260415T141523000Z"
    event_id = f"{start_ts}_{task_id}_{phase.role}_{phase.action}"
    sidecar_path = f".forge/store/events/{sprint_id}/_{event_id}_usage.json"  # used by merge-sidecar

    # --- Compute agent name for progress IPC ---
    persona_noun = ROLE_TO_NOUN.get(phase.role, phase.role)
    iteration = iteration_counts.get(phase.command, 0) + 1
    agent_name = f"{task_id}:{persona_noun}:{phase.role}:{iteration}"

    # --- Announce phase with identity banner (badge) + task context ---
    emoji, persona_name, tagline = PERSONA_MAP.get(phase.role, ("🌊", "Orchestrator", "I move tasks through their lifecycle."))
    banner_name = BANNER_MAP.get(phase.role, "forge")
    run_bash(f'FORGE_ROOT=$(node -e "console.log(require(\'./.forge/config.json\').paths.forgeRoot)") && node "$FORGE_ROOT/tools/banners.cjs" --badge {banner_name}')
    print(f"  → {task_id}  [{display_model}]\n")

    # --- Start progress Monitor before spawning subagent ---
    # The Monitor streams lines from the progress log as the subagent works.
    # New lines arrive as notifications while the Agent tool blocks on the subagent.
    start_monitor(
      command=f"tail -n +1 -F {progress_log_path} 2>/dev/null || true",
      description=f"Progress: {agent_name}",
      persistent=False
    )

    # --- Pre-flight gate check (see Phase Gates below) ---
    # Resolve FORGE_ROOT once so the CLI shim can locate the gate parser.
    FORGE_ROOT = resolve_forge_root()
    preflight_result = run_bash(
      f'node "$FORGE_ROOT/tools/preflight-gate.cjs" --phase {phase.role} --task {task_id}'
    )
    if preflight_result.exit_code == 1:
      # Gate failed: halt the orchestrator loop for THIS task. Do not retry,
      # do not spawn. Missing prerequisites are listed on stderr.
      print(f"  ✗ {task_id}  {phase.role}  — gate failed\n{preflight_result.stderr}")
      append_progress(progress_log_path, f"Gate failed for {phase.role}: {preflight_result.stderr}")
      emit_event(task, phase, action="gate_failed", notes=preflight_result.stderr)
      escalate_to_human(task, phase, reason=f"gate_failed: {preflight_result.stderr}")
      break                                   # stop processing this task
    elif preflight_result.exit_code == 2:
      # Misconfiguration (unknown phase, malformed gates block). Fail loud.
      print(f"  ⚠ {task_id}  {phase.role}  — gate misconfigured\n{preflight_result.stderr}")
      escalate_to_human(task, phase, reason=f"gate_misconfigured: {preflight_result.stderr}")
      break

    # --- Invoke phase as subagent (fresh context per phase) ---
    emit_event(task, phase, eventId=event_id, iteration=iteration, action="start")

    # Symmetric Injection Assembly: Persona -> Skill -> Workflow
    # Mode is governed by FORGE_PROMPT_MODE (default: "reference").
    # See "Persona injection modes" above for the full helper definition.
    role_block = compose_role_block(persona_noun)

    # --- Compose prior-phase summary block (fast path for downstream context) ---
    # Read task.summaries from disk (re-read after each phase so summaries accumulate)
    task_record_fresh = read_json(f".forge/store/tasks/{task_id}.json")
    summaries = (task_record_fresh or {}).get("summaries", {})

    SUMMARY_PHASE_LABELS = {
      "plan": "Plan", "review_plan": "Plan review",
      "implementation": "Implementation", "code_review": "Code review", "validation": "Validation"
    }
    summary_lines = []
    for phase_key, label in SUMMARY_PHASE_LABELS.items():
      s = summaries.get(phase_key)
      if s:
        summary_lines.append(f"- {label}: {s.get('objective', '(no objective)')}")
        if s.get('key_changes'):
          for c in s['key_changes'][:3]:
            summary_lines.append(f"    • {c}")
        if s.get('findings'):
          for f_ in s['findings'][:3]:
            summary_lines.append(f"    • {f_}")
        if s.get('verdict') and s['verdict'] != 'n/a':
          summary_lines.append(f"    Verdict: {s['verdict']}  Full: {s.get('artifact_ref', '(unknown)')}")
      else:
        # Phase may not have run yet — omit from summary block
        pass

    if summary_lines:
      summary_block = (
        "### Prior phase summaries (fast path — read full artifacts if you need more detail)\n\n"
        + "\n".join(summary_lines)
        + "\n\nIf any summary above is missing or insufficient, read the corresponding full artifact from disk before proceeding.\n\n"
      )
    else:
      summary_block = ""

    # --- Compose architecture context block from context pack ---
    context_pack_path = ".forge/cache/context-pack.md"
    context_pack_json_path = ".forge/cache/context-pack.json"
    if file_exists(context_pack_path):
      context_pack_md = read_file(context_pack_path)
      try:
        context_pack_json = read_json(context_pack_json_path)
        full_doc_paths = "\n".join(f"- {s['path']}" for s in context_pack_json.get("sources", []))
      except:
        full_doc_paths = "engineering/architecture/ (see context-pack.json for full list)"
      architecture_block = (
        "### Architecture context (summary — full docs available at paths listed below)\n\n"
        + context_pack_md
        + "\n\nRead full architecture docs only if the summary above is insufficient for "
        + "your decision. Full docs:\n"
        + full_doc_paths
        + "\n\n"
      )
    else:
      architecture_block = ""

    # --- Resolve absolute paths for subagent injection ---
    sprint_root_path = f"engineering/sprints/{sprint_dir}"
    task_root_path   = f"engineering/sprints/{sprint_dir}/{task_dir}"
    store_root_path  = ".forge/store"

    spawn_kwargs = dict(
      prompt=(
        f"### Progress Reporting\n"
        f"- Agent name: {agent_name}\n"
        f"- Progress log: {progress_log_path}\n"
        f"- Banner key: {banner_name}\n\n"
        f"Append progress entries to the log as you work:\n\n"
        f"```\n"
        f"node \"$FORGE_ROOT/tools/store-cli.cjs\" progress {sprint_id} {agent_name} {banner_name} start \"Starting {phase.role} phase\"\n"
        f"node \"$FORGE_ROOT/tools/store-cli.cjs\" progress {sprint_id} {agent_name} {banner_name} progress \"Reading codebase\"\n"
        f"node \"$FORGE_ROOT/tools/store-cli.cjs\" progress {sprint_id} {agent_name} {banner_name} done \"Completed {phase.role}\"\n"
        f"```\n\n"
        f"Write a `start` entry when you begin, `progress` entries as you make headway, "
        f"a `done` entry when you finish, or an `error` entry if something fails. "
        f"The orchestrator is monitoring this log in real time.\n\n"
        f"---\n\n"
        f"{architecture_block}"
        f"{summary_block}"
        f"{role_block}\n\n"
        f"### Current Working Context\n"
        f"- Sprint Root: {sprint_root_path}\n"
        f"- Task Root:   {task_root_path}\n"
        f"- Store Root:  {store_root_path}\n\n"
        f"Read `{phase.workflow}` and follow it. Task ID: {task_id}. "
        f"Also read `engineering/MASTER_INDEX.md` for project state. "
        f"Before returning: run /cost, parse token usage, and write the usage sidecar via "
        f"`/forge:store emit {sprint_id} '{{sidecar-json}}' --sidecar` with fields: "
        f"inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, estimatedCostUSD."
      ),
      description=f"{emoji} {persona_name} — {phase.name} for {task_id}",
    )
    if dispatch_model:
      spawn_kwargs["model"] = dispatch_model
    spawn_subagent(**spawn_kwargs)
    # Subagent reads all context from disk, does its work, writes artifacts/status to disk, then exits.

    # --- Stop progress Monitor ---
    stop_monitor(progress_log_path)

    # --- Sidecar merge: merge token usage written by subagent via custodian ---
    # The subagent wrote the sidecar via /forge:store emit {sprintId} '{sidecar-json}' --sidecar
    # Merge the sidecar into the canonical event and delete the sidecar file
    FORGE_ROOT = resolve_forge_root()
    run: node "$FORGE_ROOT/tools/store-cli.cjs" merge-sidecar {sprint_id} {event_id}
    # merge-sidecar reads the sidecar, merges token fields into the canonical event, and deletes the sidecar
    # If the sidecar does not exist, merge-sidecar exits 1 — treat as non-fatal (subagent may have skipped it)
    emit_event(task, phase, action="complete")

    # --- Phase-exit signal ---
    # Non-review phases always advance with a completion signal
    if phase.role not in ("review-plan", "review-code", "validate"):
      print(f"  ✓ {task_id}  {phase.role}  — completed\n")
      i += 1
      # Compact context: all state is on disk; preserve loop bookkeeping in the summary
      print(f"[checkpoint] task={task_id} sprint={sprint_id} phase_index={i} iterations={iteration_counts}")
      /compact
      continue

    # --- Review phase: detect verdict via parse-verdict.cjs (see Verdict Detection below) ---
    # The CLI returns exit 0/1/2 for approved/revision/unknown. Never pattern-match
    # the **Verdict:** line manually — the closed vocabulary lives in the tool.
    verdict_result = run_bash(
      f'node "$FORGE_ROOT/tools/parse-verdict.cjs" {review_artifact_path(phase, task)}'
    )
    if verdict_result.exit_code == 0:
      verdict = "Approved"
    elif verdict_result.exit_code == 1:
      verdict = "Revision Required"
    else:
      # exit 2: malformed, missing verdict line, or missing artifact. Never guess.
      print(f"  ⚠ {task_id}  {phase.role}  — verdict_malformed, escalating\n")
      emit_event(task, phase, action="verdict_malformed",
                 notes=f"parse-verdict exit={verdict_result.exit_code}")
      escalate_to_human(task, phase,
        reason="verdict_malformed: review artifact missing or verdict line unparseable")
      break

    if verdict == "Approved":
      print(f"  ✓ {task_id}  {phase.role}  — Approved\n")
      i += 1                                # advance to next phase
      # Compact context: all state is on disk; preserve loop bookkeeping in the summary
      print(f"[checkpoint] task={task_id} sprint={sprint_id} phase_index={i} iterations={iteration_counts}")
      /compact

    elif verdict == "Revision Required":
      iteration_counts[phase.command] = iteration_counts.get(phase.command, 0) + 1
      print(f"  ↻ {task_id}  {phase.role}  — Revision Required (iteration {iteration_counts[phase.command]})\n")

      if iteration_counts[phase.command] >= phase.maxIterations: # default 3
        escalate_to_human(task, phase, reason="max iterations reached")
        break                               # stop processing this task

      # Route back to the revision target
      target = phase.on_revision or nearest_preceding_non_review(phases, i)
      i = index_of(phases, target)          # loop back
      # Compact context: all state is on disk; preserve loop bookkeeping in the summary
      print(f"[checkpoint] task={task_id} sprint={sprint_id} phase_index={i} iterations={iteration_counts}")
      /compact
```

## Verdict Detection

After each review phase, read the verdict from the written artifact — **never
infer from conversation context**.

| Phase role | Artifact | Verdict Line |
|---|---|---|
| `review-plan` | `engineering/sprints/{SPRINT_DIR}/{TASK_DIR}/PLAN_REVIEW.md` | Line matching `**Verdict:**` |
| `review-code` | `engineering/sprints/{SPRINT_DIR}/{TASK_DIR}/CODE_REVIEW.md` | Line matching `**Verdict:**` |
| `validate` | `engineering/sprints/{SPRINT_DIR}/{TASK_DIR}/VALIDATION_REPORT.md` | Line matching `**Verdict:**` |

**Parse the verdict via `parse-verdict.cjs`** — do NOT pattern-match the
line manually. The tool enforces a closed verdict vocabulary so typos, case
drift, and reviewer prose cannot cause silent misclassification:

```
FORGE_ROOT = resolve_forge_root()
result = run_bash(f'node "$FORGE_ROOT/tools/parse-verdict.cjs" {artifact_path}')
# exit 0 → approved   (stdout "approved")
# exit 1 → revision   (stdout "revision")
# exit 2 → unknown/malformed/missing (stdout "unknown")
```

Recognised values (case-insensitive):

- **approved** — `Approved`, `Approve`, `[Approved]`
- **revision** — `Revision Required`, `Revision`, `Needs Revision`, `Changes Requested`

Anything else — including free-form prose, missing bold markers, a missing
verdict line, or a missing artifact — yields exit 2. Do NOT treat unknown
as approved or revision; halt the loop and escalate via `verdict_malformed`.

## Escalation Procedure

When escalating to the human:

1. Update task status via `/forge:store update-status task {taskId} status escalated`
2. Emit a final event with `verdict: "escalated"` and `notes` explaining the reason
3. Output a clear message:
   ```
   ⚠ Task {TASK_ID} escalated: {reason}
   Review artifact: {artifact_path}
   Resume with: /forge:{phase.command} {TASK_ID} after addressing the issues.
   ```
4. Stop processing this task. Continue to the next task in the sprint.

## Phase Gates

Declarative pre-flight gates for each phase. The orchestrator evaluates these
via `forge/tools/preflight-gate.cjs` **before** every subagent spawn. A failing
gate halts the loop for this task — no retry, no fall-through to the subagent,
no silent recovery. Gates are data, not prose: the grammar is defined in
`forge/tools/parse-gates.cjs` and validated by its test suite.

Grammar (one directive per line):
- `artifact <path> [min=<bytes>]` — file must exist and meet size floor. Path
  templates: `{sprint}` → sprintId, `{task}` → task suffix, `{bug}` → bugId.
- `require <field> <op> <value>` — predicate must hold. Ops: `==`, `!=`,
  `in [v1, v2, ...]`. Fields are dotted paths against the store record, e.g.
  `task.status`.
- `forbid <field> <op> <value>` — predicate must NOT hold.
- `after <phase> = <approved|revision>` — predecessor phase's review artifact
  must carry the stated verdict (parsed by `parse-verdict.cjs`).

```gates phase=plan
forbid task.status == committed
forbid task.status == abandoned
```

```gates phase=implement
artifact engineering/sprints/{sprint}/{task}/PLAN.md min=200
after review-plan = approved
forbid task.status == committed
```

```gates phase=review-plan
artifact engineering/sprints/{sprint}/{task}/PLAN.md min=200
```

```gates phase=review-code
after review-plan = approved
```

```gates phase=validate
after review-code = approved
```

```gates phase=approve
after review-code = approved
```

```gates phase=commit
after approve = approved
```

## Write-Boundary Contract

You MAY write Forge-owned JSON (`task.json`, `sprint.json`, `bug.json`,
events sidecars, `COLLATION_STATE.json`, `progress.log`) directly with the
`Write` or `Edit` tools. You do NOT need to route every write through
`store-cli` — the probabilistic layer is free to bypass deterministic tools.

However, **every write to a Forge-owned path is schema-validated at the
filesystem boundary** by the `PreToolUse` hook at
`hooks/validate-write.js`. A malformed write is rejected with a message
naming the offending field and pointing at the relevant
`forge/schemas/<kind>.schema.json`. Fix the data and retry — do NOT try to
disable the hook.

`store-cli` is still the most convenient path (it handles ID allocation,
referential integrity, ghost-event semantics, and sidecar merging), but it
is one route among several. The schema invariant is preserved whichever
route you take.

**Emergency bypass.** For operator-driven repair, set
`FORGE_SKIP_WRITE_VALIDATION=1` for a single turn. The hook will let the
write through and append an audit line to the affected sprint's
`progress.log`.

## Iron Laws

**YOU MUST NOT advance a phase until its gate checks pass.** Skipping a gate
because "it's probably fine" or "it's a small change" is not allowed. No exceptions.

**Review ordering is hardcoded:** spec compliance review ALWAYS runs before
code quality review. Never reverse this. Checking quality before confirming
correctness is wasted work.

**Revision loop exhaustion is an escalation trigger.** If max_iterations is
reached without approval, escalate to the human immediately. Do NOT approve
to unblock the pipeline.

**Always read the verdict from the artifact.** Never assume approval because the
review phase ran without error. The artifact is the source of truth.

**Phase banners are orchestrator-owned.** Do NOT include banner-first instructions
in subagent prompts. The orchestrator displays the badge before spawning and the
exit signal after return.

**No emoji in machine-readable fields.** Emoji belong only in stdout
announcements and human-facing Markdown. JSON fields use plain values only.

## Error Recovery

| Situation | Action |
|---|---|
| Test/build failure | Pass error to revision workflow (`update_implementation.md`), retry once |
| `validate-store` fails | Same — treat as implement failure |
| Verdict `Revision Required` | Enter revision loop (up to `maxIterations`) |
| Timeout/empty subagent response | Retry once with simplified prompt |
| Missing security scan for `forge/` change | Review phase returns `Revision Required` |
| Git hook failure at commit | Diagnose, fix, create NEW commit (never `--amend` blindly) |
| Merge conflict | Escalate to human |

## Event Emission

Write every event to `.forge/store/events/{SPRINT_ID}/{eventId}.json`
following `.forge/schemas/event.schema.json`.

**Required fields:**

| Field | Value |
|---|---|
| `eventId` | `{ISO_TIMESTAMP}_{TASK_ID}_{role}_{action}` e.g. `20260415T141523000Z_FORGE-S02-T03_implement_plan-task` |
| `taskId` | Task ID from the task manifest |
| `sprintId` | Sprint ID from the task manifest |
| `role` | Phase role (`plan`, `review-plan`, `implement`, `review-code`, `validate`, `approve`, `commit`) |
| `action` | Slash command invoked in namespaced form (e.g. `/forge:implement`, `/forge:review-plan`) |
| `phase` | Pipeline phase name (e.g. `plan`, `review-plan`, `implement`, `review-code`, `approve`, `commit`) |
| `iteration` | 1-based iteration count for this phase |
| `startTimestamp` | ISO 8601 timestamp recorded **before** spawning the phase subagent |
| `endTimestamp` | ISO 8601 timestamp recorded **after** the subagent returns |
| `durationMinutes` | Decimal minutes elapsed between start and end (compute from the two timestamps) |
| `model` | Resolved model identifier for this phase (e.g. `claude-sonnet-4-6`, `gpt-4o`, `glm-5.1:cloud`). Read from `CLAUDE_CODE_SUBAGENT_MODEL` on single-cluster runtimes, or from `ANTHROPIC_DEFAULT_{TIER}_MODEL` on tiered clusters. Use the full identifier, not a short alias like "opus" or "sonnet". |

**Optional fields** (merged from sidecar when present):
`verdict`, `notes`, `inputTokens`, `outputTokens`, `cacheReadTokens`,
`cacheWriteTokens`, `estimatedCostUSD`.

Use only the field names above — no aliases (`agent`, `status`, `timestamp`,
`details`). When in doubt, read `.forge/schemas/event.schema.json` directly.