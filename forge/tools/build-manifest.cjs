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

const fs = require('fs');
const path = require('path');

// ── Static mapping tables (kept at top — parseMetaDeps defined after) ─────────

// 1. Personas — meta-{name}.md → .forge/personas/{name}.md
//    Exclusions: meta-orchestrator.md, meta-product-manager.md
//    (no generated persona output for these)
const PERSONA_MAP = [
  ['meta-architect.md',    'architect.md'],
  ['meta-bug-fixer.md',    'bug-fixer.md'],
  ['meta-collator.md',     'collator.md'],
  ['meta-engineer.md',     'engineer.md'],
  ['meta-qa-engineer.md',  'qa-engineer.md'],
  ['meta-supervisor.md',   'supervisor.md'],
];

// 2. Skills — explicit source → output mapping
//    All output files use the -skills.md suffix for consistency.
const SKILL_MAP = [
  ['meta-architect-skills.md',   'architect-skills.md'],
  ['meta-bug-fixer-skills.md',   'bug-fixer-skills.md'],
  ['meta-collator-skills.md',    'collator-skills.md'],
  ['meta-engineer-skills.md',    'engineer-skills.md'],
  ['meta-qa-engineer-skills.md', 'qa-engineer-skills.md'],
  ['meta-supervisor-skills.md',  'supervisor-skills.md'],
  ['meta-generic-skills.md',     'generic-skills.md'],
];

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
  ['meta-quiz-agent.md',               'quiz_agent.md'],
  ['meta-migrate.md',                  'migrate_structural.md'],
  [null,                               'run_sprint.md'],   // orchestration-generated
];

// 4. Fragments — non-standalone reference files shared by multiple workflows.
//    Sources live in meta/workflows/_fragments/, outputs in base-pack/workflows/_fragments/.
//    These are copied verbatim (no placeholder substitution); the build script mirrors the dir.
const FRAGMENT_MAP = [
  ['context-injection.md',    'context-injection.md'],
  ['progress-reporting.md',   'progress-reporting.md'],
  ['event-emission-schema.md','event-emission-schema.md'],
  ['finalize.md',             'finalize.md'],
];

// 5. Templates — explicit mapping
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

// ── parseMetaDeps ─────────────────────────────────────────────────────────────
//
// Walks meta/workflows/ files (filtered by workflowMap entries with non-null
// sources), extracts the `deps:` YAML block from each file's frontmatter, and
// resolves logical names to .forge/ filesystem paths.
//
// Logical name resolution rules:
//   personas: {role}       → .forge/personas/{role}.md
//   skills:   {role}       → .forge/skills/{role}-skills.md
//   templates: {STEM}      → .forge/templates/{STEM}.md
//   sub_workflows: {id}    → .forge/workflows/{id}.md
//   kb_docs: {path}        → {KB_PATH}/{path}  (placeholder kept for runtime)
//   config_fields:         pass-through
//
// Returns { [workflowId]: { personas, skills, templates, sub_workflows, kb_docs, config_fields } }
// Entries with no deps: block are omitted.

function _parseFrontmatterDeps(content) {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return null;

  const lines = fmMatch[1].split('\n');
  let inDeps = false;
  const result = {};

  for (const line of lines) {
    if (/^deps:\s*$/.test(line)) {
      inDeps = true;
      continue;
    }
    if (inDeps) {
      const subKey = line.match(/^  (\w+):\s*(.*)/);
      if (subKey) {
        const [, key, rawValue] = subKey;
        result[key] = _parseYamlList(rawValue.trim());
        continue;
      }
      if (line.length > 0 && line[0] !== ' ') {
        inDeps = false;
      }
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

function _parseYamlList(value) {
  const inline = value.match(/^\[(.*)\]$/);
  if (inline) {
    const inner = inline[1].trim();
    if (!inner) return [];
    return inner.split(',').map(s => s.trim()).filter(Boolean);
  }
  if (!value) return [];
  return [value];
}

function parseMetaDeps(metaDir, workflowMap) {
  const map = workflowMap || WORKFLOW_MAP;
  const edges = {};

  for (const [srcFile, outFile] of map) {
    if (!srcFile) continue;
    const metaPath = path.join(metaDir, srcFile);
    if (!fs.existsSync(metaPath)) continue;

    const content = fs.readFileSync(metaPath, 'utf8');
    const rawDeps = _parseFrontmatterDeps(content);
    if (!rawDeps) continue;

    const workflowId = outFile.replace(/\.md$/, '');

    edges[workflowId] = {
      personas:      (rawDeps.personas      || []).map(r => `.forge/personas/${r}.md`),
      skills:        (rawDeps.skills        || []).map(r => `.forge/skills/${r}-skills.md`),
      templates:     (rawDeps.templates     || []).map(s => `.forge/templates/${s}.md`),
      sub_workflows: (rawDeps.sub_workflows || []).map(id => `.forge/workflows/${id}.md`),
      kb_docs:       (rawDeps.kb_docs       || []).map(p => `{KB_PATH}/${p}`),
      config_fields: rawDeps.config_fields  || [],
    };
  }

  return edges;
}

// ── Reverse-drift detection ───────────────────────────────────────────────────

function checkReverseDrift(metaDir, map, label) {
  const referencedSources = new Set(map.filter(([src]) => src !== null).map(([src]) => src));
  let files = [];
  try {
    files = fs.readdirSync(metaDir).filter(f => f.startsWith('meta-') && f.endsWith('.md'));
  } catch {}
  const warnings = [];
  for (const f of files) {
    if (!referencedSources.has(f)) {
      warnings.push({ file: f, dir: metaDir, label });
    }
  }
  return warnings;
}

// ── Source verification ───────────────────────────────────────────────────────

function verifySources(metaDir, map, label) {
  const missing = [];
  for (const [src] of map) {
    if (!src) continue;
    const srcPath = path.join(metaDir, src);
    if (!fs.existsSync(srcPath)) {
      missing.push({ source: src, dir: metaDir, label });
    }
  }
  return missing;
}

// ── Exports ────────────────────────────────────────────────────────────────────

module.exports = {
  PERSONA_MAP,
  SKILL_MAP,
  WORKFLOW_MAP,
  FRAGMENT_MAP,
  TEMPLATE_MAP,
  COMMAND_NAMES,
  checkReverseDrift,
  verifySources,
  parseMetaDeps,
};

// ── CLI ────────────────────────────────────────────────────────────────────────

if (require.main === module) {
try {
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

  // ── Reverse-drift detection ───────────────────────────────────────────────────

  const driftWarnings = [
    ...checkReverseDrift(path.join(forgeRoot, 'meta', 'personas'), PERSONA_MAP, 'PERSONA_MAP'),
    ...checkReverseDrift(path.join(forgeRoot, 'meta', 'skills'), SKILL_MAP, 'SKILL_MAP'),
    ...checkReverseDrift(path.join(forgeRoot, 'meta', 'workflows'), WORKFLOW_MAP, 'WORKFLOW_MAP'),
    ...checkReverseDrift(path.join(forgeRoot, 'meta', 'templates'), TEMPLATE_MAP, 'TEMPLATE_MAP'),
    ...checkReverseDrift(path.join(forgeRoot, 'meta', 'workflows', '_fragments'), FRAGMENT_MAP, 'FRAGMENT_MAP'),
  ];
  for (const w of driftWarnings) {
    process.stdout.write(`△ Reverse-drift warning: ${path.relative(process.cwd(), path.join(w.dir, w.file))} found in meta/ but is not referenced by ${w.label}. Add it to the mapping table or confirm it intentionally has no generated output.\n`);
  }

  // ── Source verification ───────────────────────────────────────────────────────

  const sourceMissing = [
    ...verifySources(path.join(forgeRoot, 'meta', 'personas'), PERSONA_MAP, 'PERSONA_MAP'),
    ...verifySources(path.join(forgeRoot, 'meta', 'skills'), SKILL_MAP, 'SKILL_MAP'),
    ...verifySources(path.join(forgeRoot, 'meta', 'workflows'), WORKFLOW_MAP, 'WORKFLOW_MAP'),
    ...verifySources(path.join(forgeRoot, 'meta', 'templates'), TEMPLATE_MAP, 'TEMPLATE_MAP'),
    ...verifySources(path.join(forgeRoot, 'meta', 'workflows', '_fragments'), FRAGMENT_MAP, 'FRAGMENT_MAP'),
  ];
  for (const m of sourceMissing) {
    process.stdout.write(`△ Source missing: ${m.label} entry "${m.source}" — file not found at ${path.relative(process.cwd(), path.join(m.dir, m.source))}\n`);
  }

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

  // ── Parse dep edges from meta-workflow frontmatter ────────────────────────────

  const depEdges = parseMetaDeps(path.join(forgeRoot, 'meta', 'workflows'), WORKFLOW_MAP);

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
        files: SKILL_MAP.map(([, out]) => out).sort(),
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
        prefixed: true,
        files: COMMAND_NAMES.slice().sort(),
      },
      fragments: {
        logicalKey: 'fragments',
        dir: '.forge/workflows/_fragments',
        files: FRAGMENT_MAP.map(([, out]) => out).sort(),
      },
      schemas: {
        logicalKey: 'schemas',
        dir: '.forge/schemas',
        files: schemaFiles,
      },
    },
    edges: {
      workflows: depEdges,
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
} // end if (require.main === module)