# Tomoshibi — Forge Concierge

🏮 **Tomoshibi** (灯, "lamplight") is Forge's concierge agent. It answers questions about your project, manages configuration, explains workflows, and refreshes knowledge base links.

---

## Invocation

```bash
/forge:ask
/forge:ask what's the active sprint status?
/forge:ask how does sprint planning work?
/forge:ask change project prefix to HELLO
```

---

## Capabilities

Tomoshibi classifies your question into one of seven intents:

| Intent | Trigger phrases | What it does |
|--------|----------------|--------------|
| **Project status** | "active sprint", "open bugs", "in-progress tasks" | Queries the store, presents a summary table |
| **Config query** | "what's my mode?", "show config" | Reads `.forge/config.json`, shows values |
| **Config change** | "change project name to X", "set prefix to Y" | Changes `project.name` or `project.prefix` with confirmation; shows regeneration impact |
| **Version check** | "what version?", "any updates?" | Reads `plugin.json` version; redirects update queries to `/forge:update` |
| **Workflow explanation** | "how does sprint planning work?", "explain the implement workflow" | Reads the relevant workflow or command file, produces a 3–5 sentence summary |
| **Modification guidance** | "how do I change the review workflow?", "where do I edit the persona?" | Explains the two-layer model — advises what to edit, never writes files |
| **KB refresh** | "update my KB links", "refresh KB links" | Invokes the `forge:refresh-kb-links` skill |

If your question doesn't match any intent, Tomoshibi asks one clarifying question. It never guesses.

---

## Guardrails

Tomoshibi is read-only by design. It can only:

- **Read** from the store (via `store-cli list` and `store-cli read`)
- **Read** config, workflows, personas, skills, and commands
- **Write** `project.name` and `project.prefix` in config (with `[Y/n]` confirmation)

It **cannot**:

- Write to the store (`write`, `update-status`, `delete`, `emit`, `purge-events`)
- Invoke destructive commands (`/forge:remove`, `/forge:init`, `/forge:migrate`)
- Edit workflows, personas, skills, or commands (redirects to `/forge:regenerate` instead)
- Edit the knowledge base (redirects to `/forge:calibrate` or sprint commands)

---

## Config changes

When you change `project.prefix`, Tomoshibi shows the regeneration impact before confirming:

| Field | Impact |
|-------|--------|
| `project.prefix` | △ Requires regeneration — command folder renames from `.claude/commands/{old}/` to `.claude/commands/{new}/`, and generated workflow references become stale. Run `/forge:regenerate commands workflows` after confirming. |
| `project.name` | 〇 No regeneration needed. |

---

## Output style

Tomoshibi prefixes every substantive answer with 🏮. It uses Japanese marks for status indicators:

- 〇 = pass / present / confirmed
- △ = warning / partial / needs attention
- × = failure / missing / error

---

## Using Tomoshibi for workflow customization

Tomoshibi can explain any workflow or command in plain language. This is useful before editing:

1. Ask Tomoshibi to explain the workflow you want to change
2. It reads the relevant file and summarizes it in 3–5 sentences
3. It explains the two-layer model: plugin layer (meta-definitions, read-only) vs. project layer (generated files, editable)
4. It advises what to edit and what to regenerate after

See [Customising workflows](customising-workflows.md) for the full customization guide.

---

## Refresh KB links

When invoked for KB link refresh, Tomoshibi calls the `forge:refresh-kb-links` skill. This updates internal links in agent instruction files to match the current project structure. Run it after:

- Renaming or moving KB documents
- Adding new architecture docs
- Running `/forge:regenerate` that changes file paths

---

## Related commands

| Command | Purpose |
|---------|---------|
| [`/forge:config`](commands/forge/config.md) | Direct config inspection and mode management |
| [`/forge:health`](commands/forge/health.md) | Detect stale docs, orphaned entities, and skill gaps |
| [`/forge:regenerate`](commands/forge/regenerate.md) | Refresh generated artifacts |