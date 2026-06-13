---
name: init
description: "[SUNSET] The Forge marketplace plugin is retired — /forge:init now migrates you to the CLI-first install."
---

# /forge:init — Forge has moved to the CLI

**The Forge marketplace plugin is being sunset.** This `/forge:init` command no
longer runs the plugin workflow — its job now is to migrate you to the CLI-first
distribution, where install, update and rebuild are owned by the `4ge` binary.

## What changes

- **`4ge`** (npm `@entelligentsia/forgecli`) is the Forge command-line interface. It owns
  install / update / rebuild and runs the full SDLC pipeline.
- The **marketplace plugin channel is retired** as a parallel distribution
  mechanism — it is now a one-way migration ramp to the CLI.

## What is preserved

Migrating does **not** touch your project data. These are left byte-for-byte
intact:

- `.forge/config.json` — your project configuration
- `.forge/store/**` — every sprint, task, bug, feature and event record
- your knowledge-base folder (e.g. `engineering/`)

`4ge init claude .` is idempotent over an already-initialized project: it
preserves the config, store and KB and re-materializes only the generated
plugin artifacts.

## Step 1 — preflight (check your tooling first)

Before offering to install anything, confirm `node` and `npm` are present:

```sh
command -v node || echo "MISSING: node"
command -v npm  || echo "MISSING: npm"
```

If either is missing, **stop** — do not attempt the install. Fall through to the
print-only fallback below and tell the user to install Node.js (which bundles
npm) first.

## Step 2 — the migration offer (consent-gated, never run automatically)

If `node` and `npm` are both present, **ask the user for explicit consent** to
install the CLI and migrate. Present this exact command and wait for the user to
explicitly agree / confirm before running anything:

```sh
npm i -g @entelligentsia/forgecli && 4ge init claude .
```

**Do not run this command unless the user has explicitly consented.** It performs
a global npm install (`npm i -g`) and then re-initializes the project. Only after
the user explicitly agrees may you run it via the Bash tool. If the user declines,
do not run it — fall through to the print-only fallback.

## Step 3 — print-only fallback (decline, or missing tooling)

If the user declines, or `node`/`npm` are missing, **print** these copy-paste
instructions and do nothing else:

```sh
# 1. Install Node.js (bundles npm) if it is missing: https://nodejs.org
# 2. Install the Forge CLI:
npm i -g @entelligentsia/forgecli
# 3. Migrate this project (idempotent — preserves .forge/config.json,
#    .forge/store/** and your KB folder):
4ge init claude .
```

> Note: the first `4ge` run re-establishes hook approvals. Review the hooks
> approval prompt as you would any first-run — this is the weakest trust moment,
> so confirm you recognise the commands before approving.
