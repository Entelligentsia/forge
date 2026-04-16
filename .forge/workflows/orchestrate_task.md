# 🌊 Workflow: Orchestrate Task (Forge)

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
| 1 | plan | `/plan {TASK_ID}` | `plan` | `.forge/workflows/plan_task.md` | — |
| 2 | review-plan | `/review-plan {TASK_ID}` | `review-plan` | `.forge/workflows/review_plan.md` | 3 |
| 3 | implement | `/implement {TASK_ID}` | `implement` | `.forge/workflows/implement_plan.md` | — |
| 4 | review-code | `/review-code {TASK_ID}` | `review-code` | `.forge/workflows/review_code.md` | 3 |
| 5 | validate | `/validate {TASK_ID}` | `validate` | `.forge/workflows/validate_task.md` | 3 |
| 6 | approve | `/approve {TASK_ID}` | `approve` | `.forge/workflows/architect_approve.md` | — |
| 7 | commit | `/commit {TASK_ID}` | `commit` | `.forge/workflows/commit_task.md` | — |

Revision routing: on `Revision Required`, `review-plan` → `plan`, `review-code` → `implement`, `validate` → `implement`.

## Gate Checks (Forge-specific)

Before advancing past `implement`:
- `node --check <modified .js/.cjs files>` — must exit 0
- `node forge/tools/validate-store.cjs --dry-run` — must exit 0 if any `forge/schemas/*.schema.json` changed
- If `forge/` was modified, `docs/security/scan-v{VERSION}.md` must exist (checked by `review-code` phase)

## Model Resolution

Subagents inherit the parent session's model by default. On **tiered** clusters,
the orchestrator passes `model=tier` based on the role-to-tier mapping.

### Cluster Detection

At session start, detect the execution cluster:

```
opus_model   = env("ANTHROPIC_DEFAULT_OPUS_MODEL", "")
sonnet_model = env("ANTHROPIC_DEFAULT_SONNET_MODEL", "")
haiku_model  = env("ANTHROPIC_DEFAULT_HAIKU_MODEL", "")

if opus_model and opus_model == sonnet_model == haiku_model:
    cluster = "single"       # all tiers same model — omit model param
elif opus_model:
    cluster = "tiered"       # tiers differ — pass tier name
else:
    cluster = "unknown"      # inherit parent
```

### Role-to-Tier Mapping (tiered clusters only)

| Role | Tier |
|------|------|
| `review-plan` | `opus` |
| `review-code` | `opus` |
| `validate` | `opus` |
| `approve` | `opus` |
| `plan` | `sonnet` |
| `implement` | `sonnet` |
| `commit` | `haiku` |
| `writeback` | `haiku` |

Per-phase `model` field in `config.pipelines` overrides cluster dispatch (highest priority).

## Context Isolation

**Each phase MUST run as a subagent via the Agent tool — NEVER inline.**

Each subagent starts with a fresh context window, reads everything from disk,
writes results to disk, and returns. The orchestrator reads verdicts from disk
artifacts only — never from conversation context.

## Token Self-Reporting (Sidecar Pattern)

Each phase subagent MUST before returning:
1. Run `/cost` to retrieve token usage.
2. Parse: `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`.
3. Write the usage sidecar via `/forge:store emit {sprintId} '{sidecar-json}' --sidecar`.

The leading `_` marks the sidecar as ephemeral — `validate-store.cjs` skips it.
If `/cost` is unavailable, skip silently.

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
# Displayed by the orchestrator ONLY — subagents do NOT display banners.
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

# --- Role-to-noun mapping for persona/skill file lookups (NOT for display) ---
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

# --- Detect execution cluster ---
opus_model   = env("ANTHROPIC_DEFAULT_OPUS_MODEL", "")
sonnet_model = env("ANTHROPIC_DEFAULT_SONNET_MODEL", "")
haiku_model  = env("ANTHROPIC_DEFAULT_HAIKU_MODEL", "")
if opus_model and opus_model == sonnet_model == haiku_model:
  cluster = "single"
  resolved_model = opus_model
elif opus_model:
  cluster = "tiered"
  resolved_model = None
else:
  cluster = "unknown"
  resolved_model = env("CLAUDE_CODE_SUBAGENT_MODEL", "unknown")

ROLE_TIER = {
  "review-plan": "opus", "review-code": "opus",
  "validate": "opus",    "approve": "opus",
  "plan": "sonnet",      "implement": "sonnet",
  "commit": "haiku",     "writeback": "haiku",
}

# --- Resolve absolute paths for subagent injection ---
sprint_root_path = f"engineering/sprints/{sprint_dir}"
task_root_path   = f"engineering/sprints/{sprint_dir}/{task_dir}"
store_root_path  = ".forge/store"

# --- Clear progress log for this sprint ---
progress_log_path = f".forge/store/events/{sprint_id}/progress.log"
run_bash(f'FORGE_ROOT=$(node -e "console.log(require(\'./.forge/config.json\').paths.forgeRoot)") && node "$FORGE_ROOT/tools/store-cli.cjs" progress-clear {sprint_id}')

phases = resolve_pipeline(task)          # from config.pipelines or default
iteration_counts = {}                    # keyed by phase command name
i = 0

while i < len(phases):
  phase = phases[i]

  # --- Resolve model for display and dispatch ---
  if phase.model:                        # per-phase override from config
    dispatch_model = phase.model
    resolved = env(f"ANTHROPIC_DEFAULT_{phase.model.upper()}_MODEL", "")
    display_model = f"{phase.model} → {resolved}" if resolved else phase.model
  elif cluster == "single":
    display_model = resolved_model
    dispatch_model = None                # inherit parent model
  elif cluster == "tiered":
    tier = ROLE_TIER.get(phase.role, "sonnet")
    resolved = env(f"ANTHROPIC_DEFAULT_{tier.upper()}_MODEL", tier)
    display_model = f"{tier} → {resolved}" if resolved != tier else tier
    dispatch_model = tier
  else:
    display_model = env("CLAUDE_CODE_SUBAGENT_MODEL", "inherited")
    dispatch_model = None

  # --- Precompute eventId and sidecar path ---
  start_ts = current_iso_timestamp()     # e.g. "20260415T141523000Z"
  event_id = f"{start_ts}_{task_id}_{phase.role}_{phase.action}"
  sidecar_path = f".forge/store/events/{sprint_id}/_{event_id}_usage.json"

  # --- Compute agent name for progress IPC ---
  persona_noun = ROLE_TO_NOUN.get(phase.role, phase.role)
  iteration = iteration_counts.get(phase.command, 0) + 1
  agent_name = f"{task_id}:{persona_noun}:{phase.role}:{iteration}"

  # --- Announce phase: badge banner + task context ---
  emoji, persona_name, tagline = PERSONA_MAP.get(phase.role, ("🌊", "Orchestrator", "I move tasks through their lifecycle."))
  banner_name = BANNER_MAP.get(phase.role, "forge")
  run_bash(f'FORGE_ROOT=$(node -e "console.log(require(\'./.forge/config.json\').paths.forgeRoot)") && node "$FORGE_ROOT/tools/banners.cjs" --badge {banner_name}')
  print(f"  → {task_id}  [{display_model}]\n")

  emit_event(task, phase, eventId=event_id, iteration=iteration, action="start")

  # --- Symmetric Injection Assembly: Persona -> Skill -> Workflow ---
  persona_content = read_file(f".forge/personas/{persona_noun}.md")
  skill_content   = read_file(f".forge/skills/{persona_noun}-skills.md")

  # --- Start progress Monitor before spawning subagent ---
  start_monitor(
    command=f"tail -n +1 -F {progress_log_path} 2>/dev/null || true",
    description=f"Progress: {agent_name}",
    persistent=False
  )

  # --- Spawn fresh-context subagent (progress reporting instead of banner-first) ---
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
      f"{persona_content}\n\n"
      f"{skill_content}\n\n"
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

  # --- Stop progress Monitor ---
  stop_monitor(progress_log_path)

  # --- Sidecar merge via store-cli (graceful — exit 1 if missing is non-fatal) ---
  FORGE_ROOT = resolve_forge_root()
  run: node "$FORGE_ROOT/tools/store-cli.cjs" merge-sidecar {sprint_id} {event_id}
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

  # --- Review phase: read verdict from the disk artifact ---
  verdict = read_verdict(task, phase)    # see Verdict Detection

  if verdict == "Approved":
    print(f"  ✓ {task_id}  {phase.role}  — Approved\n")
    i += 1
    # Compact context: all state is on disk; preserve loop bookkeeping in the summary
    print(f"[checkpoint] task={task_id} sprint={sprint_id} phase_index={i} iterations={iteration_counts}")
    /compact

  elif verdict == "Revision Required":
    iteration_counts[phase.command] = iteration_counts.get(phase.command, 0) + 1
    print(f"  ↻ {task_id}  {phase.role}  — Revision Required (iteration {iteration_counts[phase.command]})\n")
    if iteration_counts[phase.command] >= phase.maxIterations:   # default 3
      escalate_to_human(task, phase, reason="max iterations reached")
      break
    target = phase.on_revision or nearest_preceding_non_review(phases, i)
    i = index_of(phases, target)
    # Compact context: all state is on disk; preserve loop bookkeeping in the summary
    print(f"[checkpoint] task={task_id} sprint={sprint_id} phase_index={i} iterations={iteration_counts}")
    /compact

  else:
    print(f"  ⚠ {task_id}  {phase.role}  — escalated to human\n")
    escalate_to_human(task, phase, reason=f"unrecognised verdict: {verdict}")
    break
```

## Verdict Detection

After each review phase, read the verdict from the written artifact — **never
infer from conversation context**.

| Phase role | Artifact | Verdict Line |
|---|---|---|
| `review-plan` | `engineering/sprints/{SPRINT_DIR}/{TASK_DIR}/PLAN_REVIEW.md` | Line matching `**Verdict:**` |
| `review-code` | `engineering/sprints/{SPRINT_DIR}/{TASK_DIR}/CODE_REVIEW.md` | Line matching `**Verdict:**` |
| `validate` | `engineering/sprints/{SPRINT_DIR}/{TASK_DIR}/VALIDATION_REPORT.md` | Line matching `**Verdict:**` |

Expected values (trimmed after `**Verdict:**`):

```
**Verdict:** Approved
**Verdict:** Revision Required
```

Any other value — or a missing artifact — is unrecognised: escalate.

## Escalation Procedure

1. Update task status via `/forge:store update-status task {taskId} status escalated`
2. Emit a final event with `verdict: "escalated"` and `notes` explaining the reason.
3. Output:
   ```
   ⚠ Task {TASK_ID} escalated: {reason}
   Review artifact: {artifact_path}
   Resume with: /{phase.command} {TASK_ID} after addressing the issues.
   ```
4. Stop processing this task. Continue to the next task in the sprint.

## Iron Laws

**YOU MUST NOT advance a phase until its gate checks pass.** Skipping because
"it's probably fine" or "it's a small change" is not allowed. No exceptions.

**YOU MUST NOT advance a review phase until the verdict artifact exists and
reads `Approved`.** Always read from disk. Never assume approval because the
review phase ran without error.

**Review ordering is hardcoded:** spec compliance (`review-plan`) ALWAYS runs
before code quality (`review-code`). Never reverse this.

**Revision loop exhaustion is an escalation trigger.** Do NOT approve to unblock.

**Phase banners are orchestrator-owned.** Do NOT include banner-first instructions
in subagent prompts. The orchestrator displays the badge before spawning and the
exit signal after return.

**No emoji in machine-readable fields.** Emoji belong only in stdout
announcements and human-facing Markdown. JSON fields use plain values only.

## Error Recovery

| Situation | Action |
|---|---|
| `node --check` fails | Pass error to revision workflow (`update_implementation.md`), retry once |
| `validate-store` fails | Same — treat as implement failure |
| Verdict `Revision Required` | Enter revision loop (up to `maxIterations`) |
| Timeout / empty subagent response | Retry once with simplified prompt |
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
| `action` | Slash command invoked (e.g. `/implement`) |
| `phase` | Phase name |
| `iteration` | 1-based iteration count for this phase |
| `startTimestamp` | ISO 8601 recorded **before** spawning the subagent |
| `endTimestamp` | ISO 8601 recorded **after** the subagent returns |
| `durationMinutes` | Decimal minutes between start and end |
| `model` | Full model identifier (e.g. `claude-sonnet-4-6`) — not a short alias |

**Optional fields** (merged from sidecar when present):
`verdict`, `notes`, `inputTokens`, `outputTokens`, `cacheReadTokens`,
`cacheWriteTokens`, `estimatedCostUSD`.

Use only the field names above — no aliases (`agent`, `status`, `timestamp`,
`details`). When in doubt, read `.forge/schemas/event.schema.json`.
