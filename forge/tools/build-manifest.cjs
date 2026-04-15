#!/usr/bin/env node
'use strict';

// Forge tool: build-manifest
// Derives structure-manifest.json from forge/meta/ mapping tables.
// Usage: node build-manifest.cjs [--forge-root <path>] [--output <path>]
//   --forge-root  Path to the forge/ plugin directory (default: process.cwd())
//   --output      Output path for structure-manifest.json
//                 (default: <forge-root>/schemas/structure-manifest.json)
//
// Emits reverse-drift warnings for meta-*.md files not referenced by any map.
// Emits source-missing warnings for map entries whose source file is absent.
// Exits 0 always (warnings are non-fatal).

try {
  const fs = require('fs');
  const path = require('path');

  // ── Parse arguments ──────────────────────────────────────────────────────────

  const argv = process.argv.slice(2);
  let forgeRoot = process.cwd();
  let outputPath = null;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--forge-root' && argv[i + 1]) {
      forgeRoot = path.resolve(argv[++i]);
    } else if (argv[i] === '--output' && argv[i + 1]) {
      outputPath = path.resolve(argv[++i]);
    }
  }

  if (!outputPath) {
    outputPath = path.join(forgeRoot, 'schemas', 'structure-manifest.json');
  }

  // ── Read plugin version ───────────────────────────────────────────────────────

  let pluginVersion = 'unknown';
  try {
    const pluginJsonPath = path.join(forgeRoot, '.claude-plugin', 'plugin.json');
    if (fs.existsSync(pluginJsonPath)) {
      pluginVersion = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8')).version || 'unknown';
    }
  } catch {}

  // ── Static mapping tables ─────────────────────────────────────────────────────

  // 1. Personas — meta-{name}.md → .forge/personas/{name}.md
  //    Exclusions: meta-orchestrator.md, meta-product-manager.md, meta-supervisor.md
  //    (no generated persona output for these)
  const PERSONA_MAP = [
    ['meta-architect.md',    'architect.md'],
    ['meta-bug-fixer.md',    'bug-fixer.md'],
    ['meta-collator.md',     'collator.md'],
    ['meta-engineer.md',     'engineer.md'],
    ['meta-qa-engineer.md',  'qa-engineer.md'],
    ['meta-supervisor.md',   'supervisor.md'],
  ];

  // 2. Skills — derived from PERSONA_MAP output names
  const SKILL_NAMES = PERSONA_MAP.map(([, out]) => out.replace('.md', '-skills.md'));

  // 3. Workflows — explicit source → output mapping (irregular names)
  const WORKFLOW_MAP = [
    ['meta-approve.md',                  'architect_approve.md'],
    ['meta-collate.md',                  'collator_agent.md'],
    ['meta-commit.md',                   'commit_task.md'],
    ['meta-fix-bug.md',                  'fix_bug.md'],
    ['meta-implement.md',                'implement_plan.md'],
    ['meta-orchestrate.md',              'orchestrate_task.md'],
    ['meta-plan-task.md',                'plan_task.md'],
    ['meta-retrospective.md',            'sprint_retrospective.md'],
    ['meta-review-implementation.md',    'review_code.md'],
    ['meta-review-plan.md',              'review_plan.md'],
    ['meta-review-sprint-completion.md', 'architect_review_sprint_completion.md'],
    ['meta-sprint-intake.md',            'architect_sprint_intake.md'],
    ['meta-sprint-plan.md',              'architect_sprint_plan.md'],
    ['meta-update-implementation.md',    'update_implementation.md'],
    ['meta-update-plan.md',              'update_plan.md'],
    ['meta-validate.md',                 'validate_task.md'],
    [null,                               'quiz_agent.md'],   // orchestration-generated
    [null,                               'run_sprint.md'],   // orchestration-generated
  ];

  // 4. Templates — explicit mapping
  //    CUSTOM_COMMAND_TEMPLATE.md is a one-shot init artifact (no meta source).
  //    Source is null — same pattern as orchestration-generated workflows.
  const TEMPLATE_MAP = [
    ['meta-code-review.md',         'CODE_REVIEW_TEMPLATE.md'],
    ['meta-plan.md',                'PLAN_TEMPLATE.md'],
    ['meta-plan-review.md',         'PLAN_REVIEW_TEMPLATE.md'],
    ['meta-progress.md',            'PROGRESS_TEMPLATE.md'],
    ['meta-retrospective.md',       'RETROSPECTIVE_TEMPLATE.md'],
    ['meta-sprint-manifest.md',     'SPRINT_MANIFEST_TEMPLATE.md'],
    ['meta-sprint-requirements.md', 'SPRINT_REQUIREMENTS_TEMPLATE.md'],
    ['meta-task-prompt.md',         'TASK_PROMPT_TEMPLATE.md'],
    [null,                          'CUSTOM_COMMAND_TEMPLATE.md'],  // one-shot init artifact
  ];

  // 5. Commands — from generate-commands.md explicit list
  const COMMAND_NAMES = [
    'sprint-intake.md', 'plan.md', 'review-plan.md', 'implement.md',
    'review-code.md', 'fix-bug.md', 'sprint-plan.md', 'run-task.md',
    'run-sprint.md', 'collate.md', 'retrospective.md', 'approve.md', 'commit.md',
  ];

  // ── Schema files — discover from forge/schemas/ ───────────────────────────────

  const schemasDir = path.join(forgeRoot, 'schemas');
  let schemaFiles = [];
  try {
    schemaFiles = fs.readdirSync(schemasDir)
      .filter(f => f.endsWith('.schema.json'))
      .sort();
  } catch (e) {
    process.stderr.write(`△ Could not read schemas dir: ${e.message}\n`);
  }

  // ── Reverse-drift detection ───────────────────────────────────────────────────

  function checkReverseDrift(metaDir, map, label) {
    const referencedSources = new Set(map.filter(([src]) => src !== null).map(([src]) => src));
    let files = [];
    try {
      files = fs.readdirSync(metaDir).filter(f => f.startsWith('meta-') && f.endsWith('.md'));
    } catch {}
    for (const f of files) {
      if (!referencedSources.has(f)) {
        process.stdout.write(`△ Reverse-drift warning: ${path.relative(process.cwd(), path.join(metaDir, f))} found in meta/ but is not referenced by ${label}. Add it to the mapping table or confirm it intentionally has no generated output.\n`);
      }
    }
  }

  checkReverseDrift(path.join(forgeRoot, 'meta', 'personas'), PERSONA_MAP, 'PERSONA_MAP');
  checkReverseDrift(path.join(forgeRoot, 'meta', 'workflows'), WORKFLOW_MAP, 'WORKFLOW_MAP');
  checkReverseDrift(path.join(forgeRoot, 'meta', 'templates'), TEMPLATE_MAP, 'TEMPLATE_MAP');

  // ── Source verification ───────────────────────────────────────────────────────

  function verifySources(metaDir, map, label) {
    for (const [src] of map) {
      if (!src) continue;
      const srcPath = path.join(metaDir, src);
      if (!fs.existsSync(srcPath)) {
        process.stdout.write(`△ Source missing: ${label} entry "${src}" — file not found at ${path.relative(process.cwd(), srcPath)}\n`);
      }
    }
  }

  verifySources(path.join(forgeRoot, 'meta', 'personas'), PERSONA_MAP, 'PERSONA_MAP');
  verifySources(path.join(forgeRoot, 'meta', 'workflows'), WORKFLOW_MAP, 'WORKFLOW_MAP');
  verifySources(path.join(forgeRoot, 'meta', 'templates'), TEMPLATE_MAP, 'TEMPLATE_MAP');

  // ── Build manifest ────────────────────────────────────────────────────────────

  const manifest = {
    version: pluginVersion,
    generatedAt: new Date().toISOString(),
    generatedByTool: 'build-manifest.cjs',
    namespaces: {
      personas: {
        logicalKey: 'personas',
        dir: '.forge/personas',
        files: PERSONA_MAP.map(([, out]) => out).sort(),
      },
      skills: {
        logicalKey: 'skills',
        dir: '.forge/skills',
        files: SKILL_NAMES.slice().sort(),
      },
      workflows: {
        logicalKey: 'workflows',
        dir: '.forge/workflows',
        files: WORKFLOW_MAP.map(([, out]) => out).sort(),
      },
      templates: {
        logicalKey: 'templates',
        dir: '.forge/templates',
        files: TEMPLATE_MAP.map(([, out]) => out).sort(),
      },
      commands: {
        logicalKey: 'commands',
        dir: '.claude/commands',
        files: COMMAND_NAMES.slice().sort(),
      },
      schemas: {
        logicalKey: 'schemas',
        dir: '.forge/schemas',
        files: schemaFiles,
      },
    },
  };

  // ── Write output ──────────────────────────────────────────────────────────────

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const tmp = outputPath + '.tmp.' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, outputPath);

  // ── Summary ───────────────────────────────────────────────────────────────────

  const total = Object.values(manifest.namespaces).reduce((s, ns) => s + ns.files.length, 0);
  process.stdout.write(`〇 structure-manifest.json written to ${path.relative(process.cwd(), outputPath)}\n`);
  process.stdout.write(`── version: ${pluginVersion}  total files: ${total}\n`);
  for (const [key, ns] of Object.entries(manifest.namespaces)) {
    process.stdout.write(`   ${key}: ${ns.files.length}\n`);
  }

  process.exit(0);

} catch (err) {
  process.stderr.write(`× build-manifest fatal: ${err.message}\n${err.stack}\n`);
  process.exit(1);
}
