---
requirements:
  reasoning: Medium
  context: Medium
  speed: Medium
---

# 🍂 Workflow: Fix Bug (Forge Bug-Fix Orchestrator)

## Persona

Read `.forge/personas/bug-fixer.md` as the **first action** before any tool use or triage.
Print the opening identity line from that file to stdout immediately after reading it.

**Context:**
- Bugs are reported via `/forge:report-bug` and filed as GitHub issues at `Entelligentsia/forge`
- Store bugs locally at `.forge/store/bugs/FORGE-BUG-{N}.json`
- Root causes tend to be: `configuration`, `business-rule`, `regression`, `integration`, `validation`, `data-integrity`

---

## Triage (Inline Pre-Phase)

Before spawning any subagent, the orchestrator triages the bug **inline**
(triage only reads and classifies — it produces no implementation artifacts
that would contaminate downstream subagent context):

1. **Locate or create the bug record (MANDATORY — before anything else):**
   a. Determine the bug ID: if `$ARGUMENTS` is an existing `FORGE-BUG-NNN` ID, use it.
      Otherwise derive the next available ID by listing `.forge/store/bugs/`.
   b. If `.forge/store/bugs/{BUG_ID}.json` does NOT exist:
      - Derive a short slug from the bug title (kebab-case, ≤ 5 words)
      - Create the engineering folder:
          ```
          mkdir -p engineering/bugs/{BUG_ID}-{slug}
          ```
      - Write the bug record via store-cli — NEVER write the file directly:
          ```
          node "$FORGE_ROOT/tools/store-cli.cjs" write bug '{
            "bugId":       "{BUG_ID}",
            "title":       "<from input>",
            "description": "<from input>",
            "severity":    "<assessed: critical|major|minor>",
            "status":      "reported",
            "path":        "engineering/bugs/{BUG_ID}-{slug}",
            "reportedAt":  "<current ISO timestamp>"
          }'
          ```
      - If `$ARGUMENTS` contains a GitHub issue URL, include it as `"githubIssue"` in the JSON above — it is a valid schema field.
   c. Read the now-guaranteed record:
          ```
          node "$FORGE_ROOT/tools/store-cli.cjs" read bug {BUG_ID} --json
          ```

2. Read `engineering/bugs/{BUG_DIR}/ANALYSIS.md` if it exists
3. Read the linked GitHub issue (if any — check `Entelligentsia/forge`)
4. Identify the exact file and line where the bug manifests
5. Assess severity: `critical` (blocks init or core workflow) / `major` (incorrect output) / `minor` (cosmetic)
6. Classify root-cause category:
   - `configuration` — path or env var issue
   - `business-rule` — incorrect algorithm or missing case
   - `regression` — previously working behaviour broken by a recent change (check `git log`)
   - `integration` — unexpected Claude Code plugin API behaviour
   - `validation` — missing input check in a tool or hook
   - `data-integrity` — schema issue causing `validate-store` failure
7. Check for similar bugs in `.forge/store/bugs/` (record for later writeback)
8. Update `.forge/store/bugs/{BUG_ID}.json`: set `status` → `"in-progress"`

---

## Bug-Fix Pipeline

```
triage (inline) → plan-fix → review-plan [loop ≤ 3] → implement → review-code [loop ≤ 3] → approve → commit
```

Each phase after triage runs as a **subagent** (Agent tool call) with a
fresh context window. The orchestrator itself stays minimal — it only holds
the phase loop and emits events.

| Phase | Workflow File | Role |
|---|---|---|
| plan-fix | `.forge/workflows/plan_task.md` | `plan` |
| review-plan | `.forge/workflows/review_plan.md` | `review-plan` |
| implement | `.forge/workflows/implement_plan.md` | `implement` |
| review-code | `.forge/workflows/review_code.md` | `review-code` |
| approve | `.forge/workflows/architect_approve.md` | `approve` |
| commit | `.forge/workflows/commit_task.md` | `commit` |

---

## Model Resolution

**Every `spawn_subagent` call MUST include a `model` parameter.**

Resolve using this priority:

1. **`phase.model`** from `config.pipelines` if defined.
2. **Role-based default:**

| Role | Default Model |
|---|---|
| `plan` | `sonnet` |
| `implement` | `sonnet` |
| `review-plan` | `opus` |
| `review-code` | `opus` |
| `approve` | `opus` |
| `commit` | `haiku` |

---

## Execution Algorithm

The orchestrator MUST follow this procedure exactly. Do not deviate.

```
# --- Persona symbol lookup (emoji, name, tagline) ---
# All bug-fix phases map to the same Bug Fixer persona.
PERSONA_MAP = {
  "plan-fix":    ("🍂", "Bug Fixer", "I find what has decayed and restore it."),
  "review-plan": ("🍂", "Bug Fixer", "I find what has decayed and restore it."),
  "implement":   ("🍂", "Bug Fixer", "I find what has decayed and restore it."),
  "review-code": ("🍂", "Bug Fixer", "I find what has decayed and restore it."),
  "approve":     ("🍂", "Bug Fixer", "I find what has decayed and restore it."),
  "commit":      ("🍂", "Bug Fixer", "I find what has decayed and restore it."),
}
# Default fallback: ("🍂", "Bug Fixer", "I find what has decayed and restore it.")

# --- Resolve paths ---
bug_root_path = f"engineering/bugs/{bug_dir}"
store_root_path = ".forge/store"

triage_bug_inline(bug_id)            # locate-or-create, read, classify, set status = "in-progress"
update_bug_store(bug_id, status="in-progress")

phases = [plan-fix, review-plan, implement, review-code, approve, commit]
iteration_counts = {}                # keyed by phase name
i = 0

while i < len(phases):
  phase = phases[i]
  phase_model = phase.model or ROLE_MODEL_DEFAULTS[phase.role]

  start_ts = current_iso_timestamp()
  event_id = f"{start_ts}_{bug_id}_{phase.role}_{phase.action}"
  sidecar_path = f".forge/store/events/bugs/_{event_id}_usage.json"

  # --- Resolve persona symbol, name, tagline ---
  emoji, persona_name, tagline = PERSONA_MAP.get(phase.role, ("🍂", "Bug Fixer", "I find what has decayed and restore it."))

  # --- Announce phase to stdout ---
  print(f"\n{emoji} **Forge {persona_name}** — {bug_id} · {tagline} [{phase_model}]\n")

  emit_event(bug_id, phase,
             eventId=event_id,
             iteration=iteration_counts.get(phase.name, 0) + 1,
             action="start")

  # --- Symmetric Injection: noun "bug-fixer" is constant for all bug phases ---
  persona_content = read_file(".forge/personas/bug-fixer.md")
  skill_content   = read_file(".forge/skills/bug-fixer-skills.md")

  # --- Spawn fresh-context subagent with "print this exact line first" instruction ---
  spawn_subagent(
    prompt=(
      f"Your first output — before any tool use or file reads — print this exact line:\n\n"
      f"{emoji} **Forge {persona_name}** — {bug_id} · {tagline} [{phase_model}]\n\n"
      f"---\n\n"
      f"{persona_content}\n\n"
      f"{skill_content}\n\n"
      f"### Current Working Context\n"
      f"- Bug Root:    {bug_root_path}\n"
      f"- Store Root:  {store_root_path}\n"
      f"- Events Root: .forge/store/events/bugs/\n\n"
      f"Read `{phase.workflow}` and follow it. Bug ID: {bug_id}. "
      f"Also read `engineering/MASTER_INDEX.md` for project state. "
      f"Before returning: run /cost, parse token usage, and write sidecar "
      f"`.forge/store/events/bugs/_{event_id}_usage.json` with fields: "
      f"inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, estimatedCostUSD."
    ),
    description=f"{emoji} {persona_name} — {phase.name} for {bug_id}",
    model=phase_model                # ← MANDATORY
  )

  # --- Sidecar merge (graceful — missing sidecar is not an error) ---
  token_fields = {}
  if file_exists(sidecar_path):
    token_fields = read_json(sidecar_path)
    delete_file(sidecar_path)
  emit_event(bug_id, phase, action="complete", extra_fields=token_fields)

  # --- Non-review phases always advance ---
  if phase.role not in ("review-plan", "review-code"):
    i += 1
    continue

  # --- Review phase: detect verdict ---
  verdict = read_verdict(bug_id, phase)

  if verdict == "Approved":
    i += 1

  elif verdict == "Revision Required":
    iteration_counts[phase.name] = iteration_counts.get(phase.name, 0) + 1
    if iteration_counts[phase.name] >= phase.maxIterations:   # default 3
      escalate_to_human(bug_id, phase, reason="max iterations reached")
      break
    target = phase.on_revision or nearest_preceding_non_review(phases, i)
    i = index_of(phases, target)

  else:
    escalate_to_human(bug_id, phase, reason=f"unrecognised verdict: {verdict}")
    break
```

---

## Verdict Detection

After each review phase, read the verdict from the written artifact —
never infer from conversation context.

| Phase role | Artifact | Field |
|---|---|---|
| `review-plan` | `engineering/bugs/{BUG_DIR}/PLAN_REVIEW.md` | Line matching `**Verdict:**` |
| `review-code` | `engineering/bugs/{BUG_DIR}/CODE_REVIEW.md` | Line matching `**Verdict:**` |

Expected values (trimmed after `**Verdict:**`):

```
**Verdict:** Approved
**Verdict:** Revision Required
```

Any other value — or a missing artifact — is unrecognised: escalate.

---

## Escalation Procedure

1. Update `.forge/store/bugs/{BUG_ID}.json`: set `status` → `"triaged"` (revert so it is not lost).
2. Emit a final event with `verdict: "escalated"` and `notes` explaining the reason.
3. Output:
   ```
   ⚠ Bug {BUG_ID} escalated: {reason}
   Review artifact: {artifact_path}
   Resume with: /fix-bug {BUG_ID} after addressing the issues.
   ```
4. Stop.

---

## Status Codes

**YOU MUST use plain machine-readable values — no emoji in store or event fields.**

Bug store `status` MUST be one of the `bug.schema.json` enum values:

| Lifecycle point | Value |
|---|---|
| Orchestrator starts (after triage) | `"in-progress"` |
| Commit phase complete | `"fixed"` |
| Escalated | `"triaged"` |

Event `verdict` MUST be one of:

| Outcome | Value |
|---|---|
| Review passed | `"Approved"` |
| Needs rework | `"Revision Required"` |
| Escalated | `"escalated"` |

Do NOT write `"🔴 Plan Revision Required"`, `"✅ Committed"`, or any
emoji-decorated string into JSON fields.

---

## Event Emission

Emit structured events to `.forge/store/events/bugs/` following
`.forge/schemas/event.schema.json`.

Required fields per event:

| Field | Value |
|---|---|
| `eventId` | `{ISO_TIMESTAMP}_{BUG_ID}_{role}_{action}` |
| `taskId` | Bug ID (bug ID is used in the taskId field) |
| `sprintId` | `"bugs"` (virtual sprint for bug events) |
| `role` | Phase role (`plan`, `review-plan`, `implement`, `review-code`, `approve`, `commit`) |
| `action` | Slash command invoked |
| `phase` | Phase name |
| `iteration` | 1-based iteration count for this phase |
| `startTimestamp` | ISO 8601 before spawning the subagent |
| `endTimestamp` | ISO 8601 after the subagent returns |
| `durationMinutes` | Decimal minutes elapsed |
| `model` | Full model identifier (e.g. `claude-sonnet-4-6`) |

Use only these field names — no aliases.

---

## Knowledge Writeback (Final Phase)

After the commit phase, the orchestrator performs writeback inline:

1. Add a `engineering/stack-checklist.md` item if this bug class should be caught in future reviews.
2. Tag similar bugs in `.forge/store/bugs/` with `similarBugs`.
3. Update `rootCauseCategory` in the bug store JSON if refined during implementation.
4. Set `resolvedAt` to the current ISO timestamp.
5. If the fix touched `forge/`, verify `docs/security/scan-v{VERSION}.md` exists
   (the `review-code` phase should have enforced this — this is a final audit).

---

## Iron Laws

**YOU MUST NOT advance a review phase until the verdict artifact exists and reads `Approved`.**
Skipping because "it's a small fix" is not allowed. No exceptions.

**Always read the verdict from the artifact.** Never assume approval because the review phase ran without error.

**Revision loop exhaustion is an escalation trigger.** Do NOT approve to unblock.

**No emoji in machine-readable fields.** Emoji belong only in human-facing output (PROGRESS.md, announcements).

**Model parameter is mandatory.** Every `spawn_subagent` call MUST include `model=phase_model`.

**Forge-specific:** any fix that modifies files inside `forge/` requires a
version bump, migration entry, and security scan. The `plan-fix` and
`review-code` phases enforce this — the orchestrator does not skip these
requirements just because the bug is "small".

---

## Rationalization Table (Forge-specific)

| Agent says | Reality |
|---|---|
| "It's a one-line fix, no version bump needed" | Material change to `forge/` = version bump. Read CLAUDE.md. |
| "Security scan isn't needed — we're just fixing a bug" | Any `forge/` modification requires a scan. No exceptions. |
| "The review phase already ran, we can assume Approved" | Read the verdict line from the artifact. Always. |
| "Max iterations reached — let's just approve to unblock" | Escalate. Never approve to unblock. |
| "PROGRESS.md says tests passed" | Run `node --check` and `validate-store --dry-run` yourself. |
| "The bug store file didn't exist so I created it directly" | Use `store-cli write bug` — never write JSON store files directly. |
