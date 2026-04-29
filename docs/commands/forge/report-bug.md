# /forge:report-bug

**Category:** Forge plugin command  
**Run from:** Any directory

---

## Purpose

Files a structured bug report against Forge itself — not against your project. Gathers context automatically (plugin version, project stack, OS), interviews you for the details that matter, drafts the report in the Forge bug format, and opens a GitHub issue with one confirmation.

Use this when Forge behaves unexpectedly, generates incorrect output, or a command fails in a way that looks like a Forge issue rather than a project-specific one.

---

## Invocation

```bash
/forge:report-bug
```

---

## What it collects automatically

| Field | Source |
|---|---|
| Forge version | `$FORGE_ROOT/.claude-plugin/plugin.json` |
| Project stack | `.forge/config.json` (if present) |
| OS and platform | System environment |
| Claude Code version | Environment |

---

## Interview

The command asks:
1. Which command or workflow triggered the issue?
2. What did you expect to happen?
3. What actually happened? (paste error output if available)
4. Is this reproducible? If so, what are the steps?

---

## Produces

A GitHub issue filed at `Entelligentsia/forge` using the standard Forge bug template. Shows you the draft before filing and asks for confirmation.

---

## Note

Bug reports feed directly into the Forge meta-definition — patterns reported by users become improved specs, stronger guard-rails, and sharper smoke tests in future versions.
