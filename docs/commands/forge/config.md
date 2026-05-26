# /forge:config

Inspect or change Forge project configuration.

## What it does

Reads and writes `.forge/config.json`. Manages project settings — name, prefix, and installed skills.

## Invocation

```
/forge:config              # Print full config summary
```

## No arguments — summary

Prints the full config summary: project version, project name and prefix, all paths, and installed skills. Read-only — never writes to disk.

## Related

- [`/forge:health`](health.md) — full health diagnostic
- [`/forge:rebuild`](rebuild.md) — rebuild generated artifacts
