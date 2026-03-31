---
description: Use when you encounter a bug in Forge itself and want to file it as a GitHub issue in the Entelligentsia/forge repository
---

# /forge:report-bug

File a bug report against Forge itself (not your project). This command
gathers context automatically, lets you describe what went wrong, shows
a draft, and files the issue to `Entelligentsia/forge` via `gh`.

## Step 1 — Check prerequisites

Verify `gh` is available and authenticated:

```
gh_check: !`gh auth status 2>&1 | head -3`
```

If `gh` is not installed or not authenticated, stop and tell the user:

```
gh is not installed or not authenticated.
  Install:      https://cli.github.com
  Authenticate: gh auth login
```

## Step 2 — Gather automatic context

Collect the following in parallel:

```
forge_version:  !`cat "${CLAUDE_PLUGIN_ROOT}/forge/.claude-plugin/plugin.json" 2>/dev/null | grep '"version"' | head -1 | sed 's/.*: *"\(.*\)".*/\1/'`
node_version:   !`node --version 2>/dev/null || echo "N/A"`
os_info:        !`uname -srm 2>/dev/null || echo "N/A"`
forge_config:   !`cat ".forge/config.json" 2>/dev/null | head -30 || echo "No .forge/config.json found"`
```

Extract from `forge_config` (if present): `language`, `framework`, and a
1-line project description. If the config is absent, note that Forge was not
yet initialised in this project.

## Step 3 — Interview the user

Ask the following questions, one message (the user may answer all at once):

```
To file a Forge bug report, please answer:

1. Which command or phase triggered this?
   (e.g. /forge:init Phase 3, /forge:health, generate-tools.md, etc.)

2. What happened? (actual behaviour)

3. What did you expect to happen?

4. Steps to reproduce — paste any relevant error messages or output.

5. Severity: HIGH / MEDIUM / LOW
   HIGH   = blocks init or a core workflow entirely
   MEDIUM = incorrect output, missing functionality, confusing behaviour
   LOW    = cosmetic, wording, minor inconvenience
```

Wait for the user's response before continuing.

## Step 4 — Draft the issue

Compose the issue title and body using the information collected.

**Title format:** `<command/file>: <one-line summary> [<SEVERITY>]`
Example: `generate-tools.md: Node.js tool generation fails on ESM projects [HIGH]`

**Body template:**

```markdown
## Summary

<one sentence description from the user>

---

## Bug — <title>

**Forge command / file:** <which command or phase>

<user's description of what happened>

<paste any error output from the user, in a code block>

**Expected behaviour:** <what the user expected>

**Steps to reproduce:**
<user's reproduction steps, formatted as a numbered list>

**Suggested fix:** <leave blank or add if the user mentioned one>

---

## Environment

- Plugin version: <forge_version>
- Claude Code model: <current model — claude-sonnet-4-6 or as known>
- Project stack: <language + framework from .forge/config.json, or "Forge not initialised">
- Node.js: <node_version>
- OS: <os_info>
```

## Step 5 — Show draft and confirm

Print the full draft (title + body) to the user and ask:

```
Draft issue ready. File to Entelligentsia/forge? [Y/n]
Or type "edit" to revise before filing.
```

If the user says **edit**: ask what to change, update the draft, and show it again.

If the user says **no** or anything other than Y/y/edit: cancel and inform the user they can copy the draft above and file manually at https://github.com/Entelligentsia/forge/issues/new

## Step 6 — File the issue

Run:

```
result: !`gh issue create --repo Entelligentsia/forge --title "<TITLE>" --body "<BODY>"`
```

Pass title and body via variables or a heredoc to avoid shell escaping issues.
The `gh` output will include the new issue URL.

Report the URL to the user:

```
Bug filed: https://github.com/Entelligentsia/forge/issues/<N>
Thank you — this helps improve Forge for everyone.
```

## Arguments

$ARGUMENTS
