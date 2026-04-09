# Workflow: Commit Task (Forge Engineer)

## Persona

🌱 **Forge Engineer** — I close out completed work with a clean, honest commit.

---

I am running the Commit Task workflow for **{TASK_ID}**.

## Step 1 — Verify Prerequisites

**YOU MUST NOT commit without all of these. No exceptions.**

- `ARCHITECT_APPROVAL.md` exists at `engineering/sprints/{SPRINT_DIR}/{TASK_DIR}/` and shows `**Status:** Approved`
- `node --check` passes on all modified JS/CJS files (re-run as a final check)
- `node forge/tools/validate-store.cjs --dry-run` passes (final check)
- If `forge/` was modified: `docs/security/scan-v{VERSION}.md` exists and the README Security Scan History row is present

## Step 2 — Stage Changes

Stage explicitly — do not use `git add -A` or `git add .` (risks committing
secrets or unintended files).

```bash
# Code changes
git add forge/<specific files>

# Task artifacts
git add engineering/sprints/{SPRINT_DIR}/{TASK_DIR}/

# Knowledge base updates (if any)
git add engineering/architecture/<specific files>
git add engineering/stack-checklist.md

# Store updates
git add .forge/store/tasks/{TASK_ID}.json
git add .forge/store/events/{SPRINT_ID}/

# Version + migration (if material change)
git add forge/.claude-plugin/plugin.json
git add forge/migrations.json

# Security scan + README update (if forge/ modified)
git add docs/security/scan-v{VERSION}.md
git add README.md
```

## Step 3 — Commit

Use a HEREDOC to preserve formatting:

```bash
git commit -m "$(cat <<'EOF'
{type}: {summary} [{TASK_ID}]

{Extended description — what changed and why, referencing GH issue if any}

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

**Commit type conventions:**

| Prefix | Use for |
|---|---|
| `feat:` | New command, hook, tool, schema, or meta-workflow |
| `fix:` | Bug fix |
| `docs:` | Documentation-only changes (no version bump) |
| `chore:` | Version bump + migration + scan commit |
| `security:` | Security scan report commit (may be standalone) |
| `refactor:` | Internal restructuring, no behaviour change |

**DO NOT use `--no-verify`.** If a pre-commit hook fails, diagnose, fix, re-stage, and create a NEW commit (never `--amend` a failed hook).

## Step 4 — Update Task State

Update `.forge/store/tasks/{TASK_ID}.json`: set `status` to `committed`.
Write the final event to `.forge/store/events/{SPRINT_ID}/`.

Do NOT push to the remote unless the user explicitly asks for it.
