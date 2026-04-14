# Engineer Commit Skills — Forge

## Staging Discipline

Never use `git add -A` or `git add .`. Stage explicitly by file path:

```bash
# Plugin changes
git add forge/<specific files>

# Task artifacts
git add engineering/sprints/{SPRINT_DIR}/{TASK_DIR}/

# Knowledge base (if updated)
git add engineering/architecture/<files>
git add engineering/stack-checklist.md

# Store updates
git add .forge/store/tasks/{TASK_ID}.json
git add .forge/store/events/{SPRINT_ID}/

# Version + migration (if material)
git add forge/.claude-plugin/plugin.json
git add forge/migrations.json

# Security scan (if forge/ modified)
git add docs/security/scan-v{VERSION}.md
git add README.md
```

## Commit Message Format

```bash
git commit -m "$(cat <<'EOF'
{type}: {summary} [{TASK_ID}]

{Extended description — what changed and why}

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

## Hook Failure Protocol

If a pre-commit hook fails:
1. Read the error output carefully
2. Fix the underlying issue (do NOT use `--no-verify`)
3. Re-stage affected files
4. Create a NEW commit — do NOT `--amend`

## Post-Commit Verification

After the commit succeeds:
- `git log --oneline -1` — verify the commit message is correct
- `git status` — verify working tree is clean
- Update task status to `committed` in `.forge/store/tasks/{TASK_ID}.json`
