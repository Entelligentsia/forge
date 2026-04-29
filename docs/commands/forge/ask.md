# /forge:ask

Ask Forge anything about your project — status, config, version, workflows, or how to customize them.

## What it does

Invokes Tomoshibi (🏮 灯), Forge's concierge agent. Tomoshibi routes your question to the right handler and returns a concise answer.

## Invocation

```
/forge:ask what's my active sprint?
/forge:ask how does sprint planning work?
/forge:ask change project name to MyProject
/forge:ask update my KB links
```

## Intent routing

Tomoshibi classifies your question and routes to the matching handler:

| Trigger phrases | Handler |
|----------------|---------|
| "active sprint", "open bugs", "in-progress tasks" | **Project status** — queries the store, presents a summary table |
| "what's my mode?", "show config", "project name" | **Config query** — reads `.forge/config.json` (read-only) |
| "change project name to X", "set prefix to Y" | **Config change** — permits `project.name` and `project.prefix` only, with confirmation |
| "what version?", "any updates?" | **Version check** — reads installed version; redirects update checks to `/forge:update` |
| "how does sprint planning work?", "explain implement" | **Workflow explanation** — reads the workflow file, produces a plain-language summary |
| "how do I change the review workflow?" | **Modification guidance** — explains the two-layer model, never writes files |
| "update my KB links", "refresh KB links" | **KB refresh** — invokes the `forge:refresh-kb-links` skill |

If the question is unclear, Tomoshibi asks one clarifying question. It never guesses.

## Guardrails

Tomoshibi is read-only on the store. It can list and read entities, but never writes, deletes, or mutates store data. It never invokes `/forge:remove`, `/forge:init`, or `/forge:migrate`. It can explain these commands but never runs them.

The only writes Tomoshibi performs are `project.name` and `project.prefix` changes in config, with explicit user confirmation.

## Related

- [`/forge:config`](config.md) — direct config inspection and mode management
- [`/forge:store-query`](store-query.md) — structured store queries
- [Tomoshibi guide](../../tomoshibi.md) — full Tomoshibi documentation