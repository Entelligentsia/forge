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
const { ensureDir } = require('./lib/fsutil.cjs');

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
  ['meta-bug-triage.md',               'triage.md'],
  ['meta-fix-bug.md',                  'fix_bug.md'],
  ['meta-implement.md',                'implement_plan.md'],
  ['meta-orchestrate.md',              'orchestrate_task.md'],
  ['meta-plan-task.md',                'plan_task.md'],
  ['meta-retro.md',                    'sprint_retrospective.md'],
  ['meta-review-implementation.md',    'review_code.md'],
  ['meta-review-plan.md',              'review_plan.md'],
  ['meta-review-sprint-completion.md', 'architect_review_sprint_completion.md'],
  ['meta-new-sprint.md',               'architect_sprint_intake.md'],
  ['meta-plan-sprint.md',              'architect_sprint_plan.md'],
  ['meta-update-implementation.md',    'update_implementation.md'],
  ['meta-update-plan.md',              'update_plan.md'],
  ['meta-validate.md',                 'validate_task.md'],
  ['meta-check-agent.md',              'quiz_agent.md'],
  ['meta-migrate.md',                  'migrate_structural.md'],
  [null,                               'run_sprint.md'],   // orchestration-generated
];

// 4. Fragments — non-standalone reference files shared by multiple workflows.
//    Sources live in meta/workflows/_fragments/, outputs in base-pack/workflows/_fragments/.
//    These are copied verbatim (no placeholder substitution); the build script mirrors the dir.
const FRAGMENT_MAP = [
  ['context-injection.md',          'context-injection.md'],
  ['progress-reporting.md',         'progress-reporting.md'],
  ['event-emission-schema.md',      'event-emission-schema.md'],
  ['finalize.md',                   'finalize.md'],
  ['store-cli-verbs.md',            'store-cli-verbs.md'],
  ['friction-emit.md',              'friction-emit.md'],
  ['store-write-verification.md',   'store-write-verification.md'],
  ['iron-laws.md',                  'iron-laws.md'],
  ['generation-instructions.md',    'generation-instructions.md'],
];

// 5. Templates — explicit mapping
//    CUSTOM_COMMAND_TEMPLATE.md is a one-shot init artifact (no meta source).
//    Source is null — same pattern as orchestration-generated workflows.
const TEMPLATE_MAP = [
  ['meta-code-review.md',         'CODE_REVIEW_TEMPLATE.md'],
  ['meta-plan.md',                'PLAN_TEMPLATE.md'],
  ['meta-plan-review.md',         'PLAN_REVIEW_TEMPLATE.md'],
  ['meta-progress.md',            'PROGRESS_TEMPLATE.md'],
  ['meta-retro.md',               'RETROSPECTIVE_TEMPLATE.md'],
  ['meta-sprint-manifest.md',     'SPRINT_MANIFEST_TEMPLATE.md'],
  ['meta-sprint-requirements.md', 'SPRINT_REQUIREMENTS_TEMPLATE.md'],
  ['meta-task-prompt.md',         'TASK_PROMPT_TEMPLATE.md'],
  [null,                          'COST_REPORT_TEMPLATE.md'],       // base-pack-sourced, no meta source
  [null,                          'PLAN_SUMMARY_TEMPLATE.json'],    // base-pack-sourced, no meta source
];

// 5. Commands — from generate-commands.md explicit list
//
// Two-track command model (N-CM-1, FORGE-S25-T11):
//   - Per-project commands (16): generated by /forge:init into .claude/commands/{PREFIX}/.
//     These are listed here and in init/generation/generate-commands.md.
//   - Plugin-level /forge:* commands (14 in forge/commands/): always available from the
//     plugin itself (ask, health, init, migrate, rebuild, calibrate, materialize,
//     update, update-tools, add-task, add-pipeline, remove, report-bug, search,
//     repair, config). They register via the plugin's own command surface, not
//     via per-project regeneration. They are NOT in COMMAND_NAMES.
//
// COMMAND_NAMES has 14 entries (v1.0: collate and enhance removed from user-facing surface — T03).
// See doc/decisions/command-model.md for the ADR.
const COMMAND_NAMES = [
  'new-sprint.md', 'plan.md', 'review-plan.md', 'implement.md',
  'review-code.md', 'fix-bug.md', 'plan-sprint.md', 'run-task.md',
  'run-sprint.md', 'retro.md', 'approve.md', 'commit.md',
  'check-agent.md', 'validate.md',
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
  // Only emit persona edges for personas that have a generated output file (i.e. are in PERSONA_MAP).
  // Non-generated personas (product-manager, orchestrator) appear in some workflow frontmatter as
  // references but have no .forge/personas/{name}.md output — emitting them would create dangling
  // edges in structure-manifest.json (S-7 contract violation).
  const generatedPersonaOutputs = new Set(PERSONA_MAP.map(([, out]) => out));
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
      personas:      (rawDeps.personas      || [])
        .filter(r => generatedPersonaOutputs.has(`${r}.md`))
        .map(r => `.forge/personas/${r}.md`),
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

// ── buildManifest — testable manifest-building function ───────────────────────
// Returns the manifest object for forgeRoot without writing any file.
// Called by both the normal write path and the --check drift-detection path.

function buildManifest(forgeRoot) {
  let pluginVersion = 'unknown';
  try {
    const pluginJsonPath = path.join(forgeRoot, '.claude-plugin', 'plugin.json');
    if (fs.existsSync(pluginJsonPath)) {
      pluginVersion = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8')).version || 'unknown';
    }
  } catch {}

  const schemasDir = path.join(forgeRoot, 'schemas');
  let schemaFiles = [];
  try {
    const walk = (dir) => {
      const out = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          for (const f of walk(full)) {
            out.push(path.join(entry.name, f));
          }
        } else if (entry.isFile() && entry.name.endsWith('.schema.json')) {
          out.push(entry.name);
        }
      }
      return out;
    };
    schemaFiles = walk(schemasDir).sort();
  } catch (e) {
    process.stderr.write(`△ Could not read schemas dir: ${e.message}\n`);
  }

  // workflows-js: JS orchestration workflows shipped verbatim from base-pack
  // (no meta source, no placeholder substitution) and materialised into
  // .claude/workflows/. Enumerated dynamically like schemaFiles.
  const workflowsJsDir = path.join(forgeRoot, 'init', 'base-pack', 'workflows-js');
  let workflowsJsFiles = [];
  try {
    workflowsJsFiles = fs.readdirSync(workflowsJsDir)
      .filter((f) => f.endsWith('.js'))
      .sort();
  } catch (e) {
    process.stderr.write(`△ Could not read base-pack/workflows-js dir: ${e.message}\n`);
  }

  const depEdges = parseMetaDeps(path.join(forgeRoot, 'meta', 'workflows'), WORKFLOW_MAP);

  return {
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
      'workflows-js': {
        logicalKey: 'workflows-js',
        dir: '.claude/workflows',
        files: workflowsJsFiles,
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
}

// ── checkManifestDrift — compare regenerated manifest to committed file ───────
// Returns { upToDate: boolean, diff: string[] } without writing any file.
// diff is empty when upToDate is true; lists namespace keys with changed file
// lists when upToDate is false.

function checkManifestDrift(forgeRoot) {
  const manifestPath = path.join(forgeRoot, 'schemas', 'structure-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return { upToDate: false, diff: ['structure-manifest.json not found'] };
  }

  let committed;
  try {
    committed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    return { upToDate: false, diff: [`could not parse committed manifest: ${e.message}`] };
  }

  const regenerated = buildManifest(forgeRoot);

  // Compare namespace file lists (the stable, order-independent part of the manifest).
  // generatedAt and version may differ from committed — don't compare those.
  const diff = [];
  const committedNS = committed.namespaces || {};
  const regenNS = regenerated.namespaces || {};

  for (const key of Object.keys(regenNS)) {
    const regenFiles = JSON.stringify((regenNS[key].files || []).slice().sort());
    const committedFiles = JSON.stringify(((committedNS[key] || {}).files || []).slice().sort());
    if (regenFiles !== committedFiles) {
      diff.push(key);
    }
  }
  // Check for namespaces present in committed but absent in regenerated
  for (const key of Object.keys(committedNS)) {
    if (!regenNS[key]) {
      diff.push(key);
    }
  }

  return { upToDate: diff.length === 0, diff };
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
  buildManifest,
  checkManifestDrift,
};

// ── CLI ────────────────────────────────────────────────────────────────────────

if (require.main === module) {
try {
  // ── Parse arguments ──────────────────────────────────────────────────────────

  const argv = process.argv.slice(2);
  let forgeRoot = process.cwd();
  let outputPath = null;
  const checkMode = argv.includes('--check');

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

  // ── --check mode: compare regenerated manifest vs committed; exit 0/1 ────────

  if (checkMode) {
    const { upToDate, diff } = checkManifestDrift(forgeRoot);
    if (upToDate) {
      process.stdout.write('〇 structure-manifest.json is up to date\n');
    } else {
      process.stderr.write(`△ structure-manifest.json drift detected — namespaces changed: ${diff.join(', ')}\n`);
      process.stderr.write('   Run: node forge/tools/build-manifest.cjs --forge-root forge/ then commit.\n');
      process.exit(1);
    }

    // Also check enum-catalog drift in --check mode
    try {
      const { checkCatalogDrift } = require('./build-enum-catalog.cjs');
      const catalogResult = checkCatalogDrift(forgeRoot);
      if (catalogResult.upToDate) {
        process.stdout.write('〇 enum-catalog.json is up to date\n');
      } else {
        process.stderr.write(`△ enum-catalog drift detected — files changed: ${catalogResult.diff.join(', ')}\n`);
        process.stderr.write('   Run: node forge/tools/build-manifest.cjs --forge-root forge/ then commit.\n');
        process.exit(1);
      }
    } catch (catalogErr) {
      process.stderr.write(`△ enum-catalog check failed: ${catalogErr.message}\n`);
      process.exit(1);
    }

    process.exit(0);
  }

  // ── Normal (write) mode ───────────────────────────────────────────────────────

  // Reverse-drift and source verification (warnings, non-fatal)
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

  // Build and write manifest using extracted buildManifest()
  const manifest = buildManifest(forgeRoot);

  const outputDir = path.dirname(outputPath);
  ensureDir(outputDir);

  const tmp = outputPath + '.tmp.' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, outputPath);

  const total = Object.values(manifest.namespaces).reduce((s, ns) => s + ns.files.length, 0);
  process.stdout.write(`〇 structure-manifest.json written to ${path.relative(process.cwd(), outputPath)}\n`);
  process.stdout.write(`── version: ${manifest.version}  total files: ${total}\n`);
  for (const [key, ns] of Object.entries(manifest.namespaces)) {
    process.stdout.write(`   ${key}: ${ns.files.length}\n`);
  }

  // ── Integrity manifest (release guard) ────────────────────────────────────────
  try {
    const { generateManifest } = require('./gen-integrity.cjs');
    const integrityOut = path.join(forgeRoot, 'integrity.json');
    generateManifest(forgeRoot, integrityOut, manifest.version);
    process.stdout.write(`〇 integrity.json regenerated — ${manifest.version}\n`);
  } catch (integrityErr) {
    process.stderr.write(`△ integrity.json regeneration failed: ${integrityErr.message}\n`);
  }

  // ── Enum catalog (FORGE-S25-T26) ─────────────────────────────────────────────
  try {
    const { writeCatalog } = require('./build-enum-catalog.cjs');
    writeCatalog(forgeRoot);
    process.stdout.write(`〇 enum-catalog.json regenerated — ${manifest.version}\n`);
  } catch (catalogErr) {
    process.stderr.write(`△ enum-catalog.json regeneration failed: ${catalogErr.message}\n`);
  }

  process.exit(0);

} catch (err) {
  process.stderr.write(`× build-manifest fatal: ${err.message}\n${err.stack}\n`);
  process.exit(1);
}
} // end if (require.main === module)