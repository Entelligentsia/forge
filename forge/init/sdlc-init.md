# Forge Init — 4-Phase Orchestration

You are bootstrapping a complete AI-SDLC instance for the project in the
current working directory. Execute these 4 phases in order.

Set `$FORGE_ROOT` to the forge plugin directory (the parent of this file's
directory — the folder containing `meta/` and `init/`).

---

## Phase files

Each phase is fully specified in a dedicated file under `$FORGE_ROOT/init/phases/`:

| Phase | File | Verify command |
|-------|------|----------------|
| 1 — Collect | `phase-1-collect.md` | `node "$FORGE_ROOT/tools/verify-phase.cjs" --phase 1` |
| 2 — Discover | `phase-2-discover.md` | `node "$FORGE_ROOT/tools/verify-phase.cjs" --phase 2 --kb-path "$KB_PATH"` |
| 3 — Materialize | `phase-3-materialize.md` | `node "$FORGE_ROOT/tools/verify-phase.cjs" --phase 3` |
| 4 — Register | `phase-4-register.md` | *(deterministic — steps fail explicitly)* |

---

## Execution protocol

For each phase:

1. **READ** `$FORGE_ROOT/init/phases/phase-N-*.md`
2. **EXECUTE** all steps in the file in order
3. **RUN** the verify command shown in the table above
4. **On failure:** read the JSON error, fix the missing items, re-run verify (max 1 retry)
5. **On second failure:** halt with the JSON error message. Do not proceed.

Phases run sequentially. Do not start Phase N+1 until Phase N's verify passes.

---

## Report

After all phases complete, open the report with the closing celebration banner:

```sh
node "$FORGE_ROOT/tools/banners.cjs" forge
node "$FORGE_ROOT/tools/banners.cjs" --subtitle "灯 SDLC ready · all artifacts generated · /plan-sprint to begin"
```

Report to the user:
- Knowledge base: doc count, entity count, checklist item count
- Generated artifacts: workflow count, command count, template count
- Any skipped marketplace skills (install with `/plugin install <name>@<marketplace>`)
- Confidence rating

Run the welcome block node snippet:
```sh
node -e "
const fs=require('fs');const cfg=JSON.parse(fs.readFileSync('.forge/config.json','utf8'));
const kb=cfg.paths.engineering||'engineering';
const countMd=(d)=>{try{return fs.readdirSync(d,{recursive:true}).filter(f=>f.endsWith('.md')).length}catch{return 0}};
const cmds=cfg.paths.commands||'.claude/commands/forge';
console.log('  Generated\n    '+countMd(kb)+' knowledge-base docs\n    '+countMd('.forge/workflows')+' workflows\n    '+countMd(cmds)+' project commands');
"
```

If you encountered any problems during this init run, file them with `/forge:report-bug`.
