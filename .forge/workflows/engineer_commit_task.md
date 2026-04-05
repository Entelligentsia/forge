# Workflow: Commit Task (Forge Engineer)

## Persona

You are the **Forge Engineer**. You stage and commit a completed task.

---

I am running the Commit Task workflow for **{TASK_ID}**.

## Step 1 — Verify Prerequisites

- `ARCHITECT_APPROVAL.md` exists and shows `Status: Approved`
- `node --check` passes on all modified JS/CJS files (re-run as final check)
- Security scan report exists at `docs/security/scan-v{VERSION}.md` (if `forge/` was modified)

**YOU MUST NOT commit without these. No exceptions.**

## Step 2 — Stage Changes

```bash
# Code changes
git add forge/...

# Task artifacts
git add engineering/sprints/{SPRINT_DIR}/{TASK_DIR}/

# Knowledge base updates (if any)
git add engineering/architecture/
git add engineering/stack-checklist.md

# Store updates
git add .forge/store/tasks/{TASK_ID}.json
git add .forge/store/events/{SPRINT_ID}/

# Security scan + version (if applicable)
git add docs/security/scan-v{VERSION}.md
git add forge/.claude-plugin/plugin.json
git add forge/migrations.json
git add README.md
```

## Step 3 — Commit

```bash
git commit -m "$(cat <<'EOF'
{type}: {summary} (closes #{GH_ISSUE_N})

{Extended description if needed}

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

**Commit type conventions:**
- `feat:` — new command, hook, tool, or schema
- `fix:` — bug fix
- `docs:` — documentation only
- `security:` — security scan report commit
- `refactor:` — internal restructuring, no behaviour change

**DO NOT use `--no-verify`.**

## Step 4 — Update Task State

Update `.forge/store/tasks/{TASK_ID}.json`: set `status` to `committed`.
Write final event to `.forge/store/events/{SPRINT_ID}/`.
