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

**Every `spawn_subagent` call MUST include a `model` parameter. No exceptions.**

Resolve the model for each phase using this priority:

1. **`phase.model`** — if the phase definition in `config.pipelines` includes a `model` field, use it (highest priority).
2. **Workflow `requirements` block** — if `.forge/workflows/{phase.workflow}` has a frontmatter `requirements` block, map using the Capability Table:
   - `reasoning: High` or `context: High` → `opus`
   - `reasoning: Medium` or `context: Medium` → `sonnet`
   - `speed: High` (with Low reasoning/context) → `haiku`
3. **Role-based default** — otherwise use the table below:

| Role | Default Model |
|------|---------------|
| `plan` | `sonnet` |
| `implement` | `sonnet` |
| `review-plan` | `opus` |
| `review-code` | `opus` |
| `validate` | `opus` |
| `approve` | `opus` |
| `commit` | `haiku` |

The orchestrator itself runs on whichever model it was invoked with (typically
`sonnet` — it is a lightweight state machine). Short model names
(`sonnet`, `opus`, `haiku`) are valid for the Agent tool's `model` parameter.

## Context Isolation

**Each phase MUST run as a subagent via the Agent tool — NEVER inline.**

Inline phase execution accumulates tens of thousands of tokens of prior work
into the orchestrator window and violates Forge's context-light design.
Each subagent:

- Starts with a fresh context window
- Receives the workflow file path, task ID, precomputed `eventId`, persona context, and skill context
- Reads everything else from disk (`task.json`, `PLAN.md`, `MASTER_INDEX.md`)
- Writes results (artifacts, task status, event sidecar) to disk
- Returns; orchestrator reads verdicts from disk artifacts, not from conversation context

## Token Self-Reporting (Sidecar Pattern)

Each phase subagent reports its own token usage via a sidecar file.

**Before returning, every subagent MUST:**

1. Run `/cost` to retrieve token usage for the session.
2. Parse five fields: `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`.
3. Write `.forge/store/events/{SPRINT_ID}/_{eventId}_usage.json`:
   ```json
   {
     "inputTokens": <integer>,
     "outputTokens": <integer>,
     "cacheReadTokens": <integer>,
     "cacheWriteTokens": <integer>,
     "estimatedCostUSD": <number>
   }
   ```

The leading `_` marks the file as ephemeral — `validate-store.cjs` skips
`_`-prefixed files. If `/cost` is unavailable, skip writing silently; the
orchestrator handles missing sidecars gracefully.

## Execution Algorithm

The orchestrator MUST follow this procedure exactly. Do not deviate or paraphrase.

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

# --- Resolve absolute paths for subagent injection ---
sprint_root_path = f"engineering/sprints/{sprint_dir}"
task_root_path   = f"engineering/sprints/{sprint_dir}/{task_dir}"
store_root_path  = ".forge/store"

phases = resolve_pipeline(task)          # from config.pipelines or default
iteration_counts = {}                    # keyed by phase command name
i = 0

while i < len(phases):
  phase = phases[i]

  # --- Resolve model (see Model Resolution) ---
  phase_model = resolve_model(phase, workflow_path)   # phase.model → requirements → role default

  # --- Precompute eventId and sidecar path ---
  start_ts = current_iso_timestamp()     # e.g. "20260415T141523000Z"
  event_id = f"{start_ts}_{task_id}_{phase.role}_{phase.action}"
  sidecar_path = f".forge/store/events/{sprint_id}/_{event_id}_usage.json"

  # --- Resolve persona symbol, name, tagline ---
  emoji, persona_name, tagline = PERSONA_MAP.get(phase.role, ("🌊", "Orchestrator", "I move tasks through their lifecycle."))

  # --- Announce phase to stdout ---
  print(f"\n{emoji} **Forge {persona_name}** — {task_id} · {tagline} [{phase_model}]\n")

  emit_event(task, phase, eventId=event_id,
             iteration=iteration_counts.get(phase.command, 0) + 1,
             action="start")

  # --- Symmetric Injection Assembly: Persona -> Skill -> Workflow ---
  persona_noun    = ROLE_TO_NOUN.get(phase.role, phase.role)
  persona_content = read_file(f".forge/personas/{persona_noun}.md")      # "" if missing
  skill_content   = read_file(f".forge/skills/{persona_noun}-skills.md") # "" if missing

  # --- Spawn fresh-context subagent (model parameter is MANDATORY) ---
  spawn_subagent(
    prompt=(
      f"Your first output — before any tool use or file reads — print this exact line:\n\n"
      f"{emoji} **Forge {persona_name}** — {task_id} · {tagline} [{phase_model}]\n\n"
      f"---\n\n"
      f"{persona_content}\n\n"
      f"{skill_content}\n\n"
      f"### Current Working Context\n"
      f"- Sprint Root: {sprint_root_path}\n"
      f"- Task Root:   {task_root_path}\n"
      f"- Store Root:  {store_root_path}\n\n"
      f"Read `{phase.workflow}` and follow it. Task ID: {task_id}. "
      f"Also read `engineering/MASTER_INDEX.md` for project state. "
      f"Before returning: run /cost, parse token usage, and write sidecar "
      f"`.forge/store/events/{sprint_id}/_{event_id}_usage.json` with fields: "
      f"inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, estimatedCostUSD."
    ),
    description=f"{emoji} {persona_name} — {phase.name} for {task_id}",
    model=phase_model                    # ← MANDATORY — never omit
  )

  # --- Sidecar merge (graceful; missing sidecar is NOT an error) ---
  token_fields = {}
  if file_exists(sidecar_path):
    token_fields = read_json(sidecar_path)
    delete_file(sidecar_path)
  emit_event(task, phase, action="complete", extra_fields=token_fields)

  # --- Non-review phases always advance ---
  if phase.role not in ("review-plan", "review-code", "validate"):
    i += 1
    continue

  # --- Review phase: read verdict from the disk artifact ---
  verdict = read_verdict(task, phase)    # see Verdict Detection

  if verdict == "Approved":
    i += 1

  elif verdict == "Revision Required":
    iteration_counts[phase.command] = iteration_counts.get(phase.command, 0) + 1
    if iteration_counts[phase.command] >= phase.maxIterations:   # default 3
      escalate_to_human(task, phase, reason="max iterations reached")
      break
    target = phase.on_revision or nearest_preceding_non_review(phases, i)
    i = index_of(phases, target)

  else:
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

The verdict line must be exactly:

```
**Verdict:** Approved
```
or
```
**Verdict:** Revision Required
```

Any other value — or a missing artifact — is unrecognised: escalate.

## Escalation Procedure

1. Update `.forge/store/tasks/{TASK_ID}.json`: set `status` to `escalated`.
2. Emit a final event with `verdict: "escalated"` and `notes` explaining the reason.
3. Output:
   ```
   △ Task {TASK_ID} — escalated to human
   ── Reason: {reason}
   ── Review: {artifact_path}
   ── Resume: /{phase.command} {TASK_ID} after addressing the issues.
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

**Model parameter is mandatory.** Every `spawn_subagent` call MUST pass `model=phase_model`.

**No emoji in machine-readable fields.** Emoji belong only in stdout
announcements and human-facing Markdown (`PROGRESS.md`). JSON fields
(`status`, `verdict`, `role`, `action`) use plain values only.

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
