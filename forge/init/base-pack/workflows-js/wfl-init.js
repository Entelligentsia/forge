export const meta = {
  name: 'wfl:init',
  description: 'Code-orchestrated /forge:init LLM half — parallel discovery fan-out → config-writer (Phase 1 Collect), parallel KB-doc fan-out → index → context (Phase 2 Discover), deterministic materialize (Phase 3), content-register (Phase 4). JS holds the phase index, verify gates, retry caps, and fan-out; subagents execute the phase rulebooks. Args: { forgeRoot, kbFolder, startPhase, createClaudeMd, isoTimestamp, rawArguments }.',
  whenToUse: "Run the LLM-orchestrated half of /forge:init after `4ge init claude .` has bootstrapped the project structure. Dispatch by name: workflow('wfl:init', { forgeRoot, kbFolder, startPhase, createClaudeMd, isoTimestamp, rawArguments }).",
  phases: [
    { title: 'Collect',     detail: 'parallel() 5 discovery agents scan codebase domains; config-writer agent merges findings and writes config + init-progress.json; verify-phase gate with one retry cap' },
    { title: 'Discover',    detail: 'gate+scaffold agent verifies phase 1; parallel() 7 KB-doc agents generate architecture docs with JS-held retry-once; sequential index + context agents close the phase' },
    { title: 'Materialize', detail: 'single haiku agent runs deterministic substitute-placeholders + generation-manifest + build-overlay; Phase 3 verify failure is a hard halt (no retry — rebuild/restart)' },
    { title: 'Register',    detail: 'single haiku agent runs content-register steps; CLAUDE.md creation gated on args.createClaudeMd === true; returns pendingActions for Tomoshibi' },
    { title: 'Report',      detail: 'return structured result { ok, lastPhase, stack, skillMatches, counts, confidence, pendingActions, failure? } for the command wrapper to render' },
  ],
};

// wfl:init — code-orchestrated LLM half of /forge:init
//
// Why a script: init is a deterministic 4-phase FSM with mechanical verify
// gates (verify-phase.cjs --phase N), bounded retries (max 1), fan-out steps
// (5 discovery scans, 7 KB docs), and escalate-don't-continue semantics.
// In the prose orchestrator that loop is hand-run turn-by-turn. Here JS holds
// the phase index, the verify-gate routing, the retry counters, and the fan-out;
// subagents only execute one phase rulebook each.
//
// CLI-FIRST BOOTSTRAP ADR (doc/decisions/cli-first-bootstrap.md):
//   `4ge init claude .` runs first (deterministic, zero tokens):
//   scaffolds .forge/, vendors tools, installs .claude/commands/ + .claude/workflows/
//   including THIS FILE as wfl-init.js. By the time Claude Code opens and runs
//   /forge:init → workflow('wfl:init'), this driver is already installed.
//   Therefore: name-dispatch only (no scriptPath, no plugin-root path variable).
//
// SIDE-EFFECT OWNERSHIP — READ BEFORE EDITING:
//   This script has NO filesystem/shell access. Each per-phase subagent owns:
//   preflight-gate, the phase rulebook execution (which writes its own artifacts,
//   init-progress.json checkpoints, verify runs), token sidecar, and its own
//   canonical phase event. The JS driver holds ONLY control flow: phase index,
//   retry counters, verdict routing, fan-out, and escalation decision.
//
//   Timestamps: the Workflow sandbox prohibits timestamp minting functions
//   (Date.now is blocked, Math.random is blocked, and the zero-arg Date
//   constructor is blocked). The command wrapper (init.md) supplies
//   args.isoTimestamp for any labeling the driver must do. Subagents mint
//   their own timestamps for their own artifacts (their sandbox is different).
//
//   No plugin-path variables: all subagent tool calls use the vendored
//   .forge/tools/ path (forge-root-retirement ADR + CLI-first bootstrap).
//   The forgeRoot arg (resolved abs path to the .forge/ directory) is passed
//   to subagents that need to resolve the project root.
//
// MODEL TIERING:
//   ROLE_TIER maps role → model tier name. All generation/discovery → sonnet.
//   All deterministic gates/registration → haiku. No opus (init has no
//   review/approve gates — those live in run-task/fix-bug pipelines).

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const DISCOVERY_SCHEMA = {
  type: 'object',
  properties: {
    domain:      { type: 'string', description: 'discovery domain name (stack|routing|processes|database|testing)' },
    findings:    { type: 'object', description: 'domain-specific structured findings per discover-*.md output format' },
    confidence:  { type: 'number', description: '0–1 confidence in completeness of scan' },
    warnings:    { type: 'array',  items: { type: 'string' }, description: 'ambiguities or partial coverage notes' },
  },
  required: ['domain', 'findings', 'confidence'],
};

const KB_DOC_SCHEMA = {
  type: 'object',
  properties: {
    id:         { type: 'string',  description: 'KB doc id matching the phase-2 table row' },
    ok:         { type: 'boolean', description: 'true if doc written successfully' },
    confidence: { type: 'number',  description: '0–1 confidence in doc completeness' },
    error:      { type: 'string',  description: 'error message if ok=false' },
  },
  required: ['id', 'ok', 'confidence'],
};

const PHASE_RESULT_SCHEMA = {
  type: 'object',
  properties: {
    verifyExit:  { type: 'number',  description: 'exit code from verify-phase.cjs (0=pass, non-zero=fail)' },
    verifyError: { type: 'string',  description: 'stderr/stdout from failed verify run' },
    stack:       { type: 'string',  description: 'technology stack summary (Phase 1 output)' },
    skillMatches: {
      type: 'array',
      items: { type: 'string' },
      description: 'skill IDs matching project tech stack (from skill-recommendations.md)',
    },
    ok: { type: 'boolean', description: 'true if phase completed and verify passed' },
  },
  required: ['verifyExit', 'ok'],
};

// ─────────────────────────────────────────────────────────────────────────────
// Model tiering
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_TIER = {
  'discovery':   'sonnet',
  'config':      'sonnet',
  'kb-doc':      'sonnet',
  'index':       'sonnet',
  'context':     'sonnet',
  'gate':        'haiku',
  'materialize': 'haiku',
  'register':    'haiku',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function halt(lastPhase, reason, extra) {
  return { ok: false, lastPhase, failure: reason, ...extra };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main workflow body
//
// Runs at top level in the Workflow harness's async context — the harness
// permits exactly ONE export (the meta literal above); a second `export`
// (e.g. `export default function`) is a SyntaxError at launch. `args` is the
// global passed via workflow('wfl:init', {...}). Top-level `return` is valid.
// ─────────────────────────────────────────────────────────────────────────────

const {
    forgeRoot,
    kbFolder       = 'engineering',
    startPhase     = 1,
    createClaudeMd = null,
    isoTimestamp,
    rawArguments   = '',
  } = args || {};

  // ───────────────────────────────────────────────────────────────────────────
  // Phase 1 — Collect (startPhase <= 1)
  // ───────────────────────────────────────────────────────────────────────────
  let phase1Result;
  if (startPhase <= 1) {
    await phase('Collect', async () => {

      // Fan-out: 5 parallel discovery agents
      const discoveryResults = await parallel([
        agent(ROLE_TIER['discovery'], `
You are a codebase discovery agent. Read the file
\`init/discovery/discover-stack.md\` from the Forge init discovery prompts
and execute its instructions against the current project.
Return a StructuredOutput matching this JSON Schema:
${JSON.stringify(DISCOVERY_SCHEMA, null, 2)}
Set domain="stack". Use .forge/tools/ paths for any tool invocations.
Use only .forge/tools/ paths for all tool invocations (vendored-tools world).
`),
        agent(ROLE_TIER['discovery'], `
You are a codebase discovery agent. Read the file
\`init/discovery/discover-routing.md\` from the Forge init discovery prompts
and execute its instructions against the current project.
Return a StructuredOutput matching this JSON Schema:
${JSON.stringify(DISCOVERY_SCHEMA, null, 2)}
Set domain="routing". Use .forge/tools/ paths for any tool invocations.
Use only .forge/tools/ paths for all tool invocations (vendored-tools world).
`),
        agent(ROLE_TIER['discovery'], `
You are a codebase discovery agent. Read the file
\`init/discovery/discover-processes.md\` from the Forge init discovery prompts
and execute its instructions against the current project.
Return a StructuredOutput matching this JSON Schema:
${JSON.stringify(DISCOVERY_SCHEMA, null, 2)}
Set domain="processes". Use .forge/tools/ paths for any tool invocations.
Use only .forge/tools/ paths for all tool invocations (vendored-tools world).
`),
        agent(ROLE_TIER['discovery'], `
You are a codebase discovery agent. Read the file
\`init/discovery/discover-database.md\` from the Forge init discovery prompts
and execute its instructions against the current project.
Return a StructuredOutput matching this JSON Schema:
${JSON.stringify(DISCOVERY_SCHEMA, null, 2)}
Set domain="database". Use .forge/tools/ paths for any tool invocations.
Use only .forge/tools/ paths for all tool invocations (vendored-tools world).
`),
        agent(ROLE_TIER['discovery'], `
You are a codebase discovery agent. Read the file
\`init/discovery/discover-testing.md\` from the Forge init discovery prompts
and execute its instructions against the current project.
Return a StructuredOutput matching this JSON Schema:
${JSON.stringify(DISCOVERY_SCHEMA, null, 2)}
Set domain="testing". Use .forge/tools/ paths for any tool invocations.
Use only .forge/tools/ paths for all tool invocations (vendored-tools world).
`),
      ]);

      // Config-writer agent: merge findings, write config, verify Phase 1
      const configResult = await agent(ROLE_TIER['config'], `
You are the Forge init config-writer agent. You have received the following
discovery findings from 5 parallel discovery agents:

${JSON.stringify(discoveryResults, null, 2)}

Execute the Phase 1 Collect rulebook steps:
1. Read \`init/phases/phase-1-collect.md\` for the full step list.
2. Call \`node .forge/tools/manage-config.cjs\` to write the config. If kbFolder
   is non-default, set paths.engineering="${kbFolder}". Set mode=full.
3. Compute skill-recommendation matches from meta/skill-recommendations.md and
   the output of \`node .forge/tools/list-skills.js\`. Do NOT install — return
   { matches, alreadyInstalled } only.
4. Write init-progress.json: { lastPhase: 1, timestamp: "${isoTimestamp}" }.
5. Run: node .forge/tools/verify-phase.cjs --phase 1
6. Return a StructuredOutput matching this JSON Schema:
${JSON.stringify(PHASE_RESULT_SCHEMA, null, 2)}
with verifyExit=<exit code>, verifyError=<stderr if non-zero>, stack=<summary>,
skillMatches=[<matched skill ids>], ok=(verifyExit===0).
Use only .forge/tools/ paths for all tool invocations (vendored-tools world). Use .forge/tools/ paths.
kbFolder="${kbFolder}", isoTimestamp="${isoTimestamp}".
`);

      // Verify routing: one retry on failure
      if (configResult && configResult.verifyExit !== 0) {
        const retryResult = await agent(ROLE_TIER['config'], `
Phase 1 verify failed. Error:
${configResult.verifyError || '(no error text)'}

Read the JSON error carefully. Fix the config by re-running
\`node .forge/tools/manage-config.cjs\` with the correct values, then
re-run \`node .forge/tools/verify-phase.cjs --phase 1\`.
Return a StructuredOutput matching:
${JSON.stringify(PHASE_RESULT_SCHEMA, null, 2)}
Use only .forge/tools/ paths for all tool invocations (vendored-tools world).
`);
        if (!retryResult || retryResult.verifyExit !== 0) {
          phase1Result = halt(1, 'Phase 1 verify failed after retry', {
            verifyError: retryResult ? retryResult.verifyError : 'retry agent returned null',
          });
          return;
        }
        phase1Result = retryResult;
      } else {
        phase1Result = configResult || halt(1, 'config-writer agent returned null');
      }
    });
  } else {
    phase1Result = { ok: true, lastPhase: 1, skipped: true };
  }

  if (phase1Result && !phase1Result.ok) {
    return halt(1, phase1Result.failure || 'Phase 1 failed', {
      verifyError: phase1Result.verifyError,
      stack: phase1Result.stack,
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Phase 2 — Discover (startPhase <= 2)
  // ───────────────────────────────────────────────────────────────────────────
  let phase2Result;
  if (startPhase <= 2) {
    await phase('Discover', async () => {

      // Gate+scaffold agent: verify Phase 1 passed, mkdir scaffold
      const gateResult = await agent(ROLE_TIER['gate'], `
You are the Forge init Phase 2 gate agent. Execute these steps in order:
1. Run: node .forge/tools/verify-phase.cjs --phase 1
   If exit non-zero, return { ok: false, error: <stderr> } immediately.
2. Read \`init/phases/phase-2-discover.md\` Step 2 (scaffold mkdir commands)
   and execute them. Create the KB directory structure under ${kbFolder}/.
3. Return { ok: true }.
Use only .forge/tools/ paths for all tool invocations (vendored-tools world). Use .forge/tools/ paths.
`);

      if (!gateResult || !gateResult.ok) {
        phase2Result = halt(2, 'Phase 2 gate failed — Phase 1 verify did not pass', {
          verifyError: gateResult ? gateResult.error : 'gate agent returned null',
        });
        return;
      }

      // Fan-out: 7 parallel KB-doc agents
      // KB-doc IDs per phase-2-discover.md table
      const KB_DOC_IDS = [
        'architecture/stack',
        'architecture/processes',
        'architecture/routing',
        'architecture/database',
        'architecture/testing',
        'business-domain/domain-model',
        'business-domain/domain-concepts',
      ];

      const kbDocResults = await parallel(
        KB_DOC_IDS.map((docId) =>
          agent(ROLE_TIER['kb-doc'], `
You are a Forge KB-doc generation agent. Your doc id is: "${docId}".
1. Read \`init/phases/phase-2-discover.md\` for the full doc spec for "${docId}".
2. Read \`init/generation/generate-kb-doc.md\` for the generation rulebook.
3. Generate the doc using all available project context.
4. Write the doc to the correct path under ${kbFolder}/.
5. Return a StructuredOutput:
${JSON.stringify(KB_DOC_SCHEMA, null, 2)}
Set id="${docId}", ok=<true if written>, confidence=<0-1>, error=<if not ok>.
Use only .forge/tools/ paths for all tool invocations (vendored-tools world). Use .forge/tools/ paths.
`)
        )
      );

      // JS-held retry-once for any failed KB-doc
      const failedDocs = (kbDocResults || []).filter((r) => !r || !r.ok);
      let retryResults = [];
      if (failedDocs.length > 0) {
        retryResults = await parallel(
          failedDocs.map((failed) =>
            agent(ROLE_TIER['kb-doc'], `
KB-doc "${failed ? failed.id : 'unknown'}" failed on first attempt.
Error: ${failed && failed.error ? failed.error : '(no error)'}
Retry: read the doc spec from \`init/phases/phase-2-discover.md\` again,
fix any issues, regenerate, and return:
${JSON.stringify(KB_DOC_SCHEMA, null, 2)}
Use only .forge/tools/ paths for all tool invocations (vendored-tools world). Use .forge/tools/ paths.
`)
          )
        );
        const stillFailed = retryResults.filter((r) => !r || !r.ok);
        if (stillFailed.length > 0) {
          const ids = stillFailed.map((r) => (r && r.id) || 'unknown').join(', ');
          phase2Result = halt(2, `KB-doc generation failed after retry for: ${ids}`, {
            failedDocs: ids,
          });
          return;
        }
      }

      // Sequential index agent (after all leaf docs — real data dependency)
      const indexResult = await agent(ROLE_TIER['index'], `
You are the Forge init index agent. All 7 KB architecture docs have been generated.
Read \`init/phases/phase-2-discover.md\` Step 4 (index files).
Generate the 3 INDEX files:
  - ${kbFolder}/architecture/INDEX.md
  - ${kbFolder}/business-domain/INDEX.md
  - ${kbFolder}/INDEX.md
Return { ok: true } when done, or { ok: false, error: <message> }.
Use only .forge/tools/ paths for all tool invocations (vendored-tools world). Use .forge/tools/ paths.
`);

      if (!indexResult || !indexResult.ok) {
        phase2Result = halt(2, 'Index agent failed', { error: indexResult ? indexResult.error : 'null result' });
        return;
      }

      // Context agent: project-context.json + calibration + init-progress.json + verify
      const contextResult = await agent(ROLE_TIER['context'], `
You are the Forge init context agent. KB docs and index files are complete.
Execute \`init/phases/phase-2-discover.md\` Steps 5–6:
5. Write project-context.json (combined structured context from all discovery findings).
   Write calibration baseline.
6. Write init-progress.json: { lastPhase: 2, timestamp: "${isoTimestamp}" }.
   Run: node .forge/tools/verify-phase.cjs --phase 2
Return a StructuredOutput matching:
${JSON.stringify(PHASE_RESULT_SCHEMA, null, 2)}
with verifyExit=<exit code>, verifyError=<stderr if non-zero>, ok=(verifyExit===0).
Use only .forge/tools/ paths for all tool invocations (vendored-tools world). Use .forge/tools/ paths.
`);

      // Verify routing: one retry on failure
      if (contextResult && contextResult.verifyExit !== 0) {
        const verifyRetry = await agent(ROLE_TIER['context'], `
Phase 2 verify failed. Error:
${contextResult.verifyError || '(no error text)'}
Read the error, fix the missing or malformed outputs, re-run
\`node .forge/tools/verify-phase.cjs --phase 2\`.
Return a StructuredOutput matching:
${JSON.stringify(PHASE_RESULT_SCHEMA, null, 2)}
Use only .forge/tools/ paths for all tool invocations (vendored-tools world).
`);
        if (!verifyRetry || verifyRetry.verifyExit !== 0) {
          phase2Result = halt(2, 'Phase 2 verify failed after retry', {
            verifyError: verifyRetry ? verifyRetry.verifyError : 'retry returned null',
          });
          return;
        }
        phase2Result = verifyRetry;
      } else {
        phase2Result = contextResult || halt(2, 'context agent returned null');
      }
    });
  } else {
    phase2Result = { ok: true, lastPhase: 2, skipped: true };
  }

  if (phase2Result && !phase2Result.ok) {
    return halt(2, phase2Result.failure || 'Phase 2 failed', {
      verifyError: phase2Result.verifyError,
      failedDocs: phase2Result.failedDocs,
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Phase 3 — Materialize (startPhase <= 3)
  // ───────────────────────────────────────────────────────────────────────────
  let phase3Result;
  if (startPhase <= 3) {
    await phase('Materialize', async () => {

      // Single haiku agent — deterministic shell steps
      const materializeResult = await agent(ROLE_TIER['materialize'], `
You are the Forge init materialize agent. Execute these deterministic steps:
1. Run: node .forge/tools/build-init-context.cjs
2. Run: node .forge/tools/substitute-placeholders.cjs
3. Record generation-manifest entries for all materialized assets.
4. Run a build-overlay smoke check: node .forge/tools/build-overlay.cjs --check
5. Write init-progress.json: { lastPhase: 3, timestamp: "${isoTimestamp}" }
6. Run: node .forge/tools/verify-phase.cjs --phase 3
Return a StructuredOutput matching:
${JSON.stringify(PHASE_RESULT_SCHEMA, null, 2)}
with verifyExit=<exit code>, verifyError=<stderr if non-zero>, ok=(verifyExit===0).
Use only .forge/tools/ paths for all tool invocations (vendored-tools world). Use .forge/tools/ paths.
IMPORTANT: If verify-phase exits non-zero, report it faithfully — do NOT retry.
Phase 3 verify failure is a hard halt. The rulebook says: rebuild or restart init.
`);

      // Phase 3: hard halt on verify failure (no retry)
      if (!materializeResult || materializeResult.verifyExit !== 0) {
        const verifyError = materializeResult ? materializeResult.verifyError : 'materialize agent returned null';
        phase3Result = halt(3, [
          'Phase 3 (Materialize) verify failed. This is a hard halt — no retry.',
          'Per the phase-3-materialize.md rulebook: you must rebuild or restart /forge:init.',
          'Run: /forge:init (or `4ge init claude .` to re-scaffold, then /forge:init).',
          `Verify error: ${verifyError}`,
        ].join(' '), { verifyError, rebuild: true, restart: true });
        return;
      }

      phase3Result = materializeResult;
    });
  } else {
    phase3Result = { ok: true, lastPhase: 3, skipped: true };
  }

  if (phase3Result && !phase3Result.ok) {
    return halt(3, phase3Result.failure || 'Phase 3 failed', {
      verifyError: phase3Result.verifyError,
      rebuild: phase3Result.rebuild,
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Phase 4 — Register (startPhase <= 4)
  // ───────────────────────────────────────────────────────────────────────────
  let phase4Result;
  if (startPhase <= 4) {
    await phase('Register', async () => {

      const registerResult = await agent(ROLE_TIER['register'], `
You are the Forge init register agent. Execute the content-register steps:
1. Read \`init/phases/phase-4-register.md\` for the full step list.
2. Execute steps 1–10 and step 12 verbatim.
3. Step 13 (CLAUDE.md file creation): ${createClaudeMd === true
        ? 'createClaudeMd=true — execute this step (create the CLAUDE.md file).'
        : 'createClaudeMd is not true — SKIP step 13 (the prompt was hoisted to the wrapper).'}
4. Step 11 (Tomoshibi forge:refresh-kb-links): DO NOT execute. This is
   orchestrator-owned. Return pendingActions=["refresh-kb-links"] and the
   wrapper (init.md) will run it post-workflow.
5. Delete init-progress.json (phase 4 complete — no resume needed).
6. Return { ok: true, pendingActions: ["refresh-kb-links"] }.
Use only .forge/tools/ paths for all tool invocations (vendored-tools world). Use .forge/tools/ paths.
createClaudeMd=${JSON.stringify(createClaudeMd)}, isoTimestamp="${isoTimestamp}".
`);

      phase4Result = registerResult || halt(4, 'register agent returned null');
    });
  } else {
    phase4Result = { ok: true, lastPhase: 4, skipped: true };
  }

  if (phase4Result && !phase4Result.ok) {
    return halt(4, phase4Result.failure || 'Phase 4 failed');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Report
  // ───────────────────────────────────────────────────────────────────────────
  await phase('Report', async () => {});

  return {
    ok: true,
    lastPhase: 4,
    stack:          phase1Result && phase1Result.stack,
    skillMatches:   phase1Result && phase1Result.skillMatches,
    counts: {
      kbDocs:    7,
      workflows: 4,  // wfl-run-task, wfl-run-sprint, wfl-fix-bug, wfl-init
      commands:  3,  // run-task, run-sprint, fix-bug (init.md is the wrapper, not a base-pack command)
    },
    confidence:     phase1Result && phase1Result.confidence,
    pendingActions: (phase4Result && phase4Result.pendingActions) || ['refresh-kb-links'],
  };
