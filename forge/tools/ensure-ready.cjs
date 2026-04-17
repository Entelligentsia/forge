#!/usr/bin/env node
'use strict';

// Forge tool: ensure-ready
// Answers "is workflow X's transitive dependency closure materialised?"
//
// Usage:
//   ensure-ready.cjs --workflow <id>    → exit 0 if closure pristine, 1 if not
//                                         stdout: JSON missing-list
//   ensure-ready.cjs --closure <id>     → print full transitive closure as JSON
//   ensure-ready.cjs --target <path>    → same as --workflow keyed by filename
//
// Exit codes (--workflow / --target):
//   0  All closure artifacts are present and not stubs
//   1  One or more artifacts are missing or are fast-mode stubs
//
// Reuses:
//   checkNamespaces  from check-structure.cjs  (presence)
//   hashContent, MANIFEST_PATH  from generation-manifest.cjs (pristine check)
//   edges  from forge/schemas/structure-manifest.json

const fs   = require('fs');
const path = require('path');

const FAST_STUB_SENTINEL = '<!-- FORGE FAST-MODE STUB';
const DEFAULT_KB_PATH    = 'engineering';

// ── resolveKbPath ──────────────────────────────────────────────────────────────

function resolveKbPath(config) {
  if (!config) return DEFAULT_KB_PATH;
  const p = config && config.paths && config.paths.engineering;
  return (p && p.length > 0) ? p : DEFAULT_KB_PATH;
}

// ── resolvePath ───────────────────────────────────────────────────────────────

function resolvePath(templatePath, kbPath) {
  return templatePath.replace('{KB_PATH}', kbPath);
}

// ── computeClosure ─────────────────────────────────────────────────────────────
//
// BFS from workflowId, 2 levels deep:
//   Level 1: target workflow's direct deps (personas, skills, templates, kb_docs, sub_workflows)
//   Level 2: each sub_workflow's own deps (personas, skills, templates, kb_docs)
//            but NOT its sub_workflows (stops at stub level)
//
// Returns:
//   { personas, skills, templates, workflows, kb_docs, config_fields }
//   All arrays, deduplicated, sorted.

function computeClosure(manifest, workflowId) {
  const empty = { personas: [], skills: [], templates: [], workflows: [], kb_docs: [], config_fields: [] };

  const edges = manifest && manifest.edges && manifest.edges.workflows;
  if (!edges) return empty;

  const workflowEdges = edges[workflowId];
  if (!workflowEdges) return empty;

  const personas      = new Set();
  const skills        = new Set();
  const templates     = new Set();
  const workflows     = new Set();
  const kb_docs       = new Set();
  const config_fields = new Set();

  // Add the target workflow itself
  workflows.add(`.forge/workflows/${workflowId}.md`);

  // Level-1 direct deps
  for (const p of workflowEdges.personas      || []) personas.add(p);
  for (const s of workflowEdges.skills        || []) skills.add(s);
  for (const t of workflowEdges.templates     || []) templates.add(t);
  for (const k of workflowEdges.kb_docs       || []) kb_docs.add(k);
  for (const f of workflowEdges.config_fields || []) config_fields.add(f);

  // Level-2: sub-workflow deps (personas/skills/templates/kb_docs, not sub-sub-workflows)
  for (const swPath of workflowEdges.sub_workflows || []) {
    workflows.add(swPath);
    const swId     = path.basename(swPath, '.md');
    const swEdges  = edges[swId];
    if (swEdges) {
      for (const p of swEdges.personas      || []) personas.add(p);
      for (const s of swEdges.skills        || []) skills.add(s);
      for (const t of swEdges.templates     || []) templates.add(t);
      for (const k of swEdges.kb_docs       || []) kb_docs.add(k);
      for (const f of swEdges.config_fields || []) config_fields.add(f);
    }
  }

  return {
    personas:      [...personas].sort(),
    skills:        [...skills].sort(),
    templates:     [...templates].sort(),
    workflows:     [...workflows].sort(),
    kb_docs:       [...kb_docs].sort(),
    config_fields: [...config_fields].sort(),
  };
}

// ── exports (for testing) ─────────────────────────────────────────────────────

module.exports = { computeClosure, resolveKbPath, resolvePath };

// ── CLI guard ─────────────────────────────────────────────────────────────────

if (require.main === module) {
try {

  const argv = process.argv.slice(2);
  let mode = null;   // 'workflow' | 'closure' | 'target'
  let target = null;

  for (let i = 0; i < argv.length; i++) {
    if ((argv[i] === '--workflow' || argv[i] === '--closure' || argv[i] === '--target') && argv[i + 1]) {
      mode   = argv[i].replace('--', '');
      target = argv[++i];
    }
  }

  if (!mode || !target) {
    process.stderr.write([
      'Usage: ensure-ready.cjs --workflow <id>   Exit 0=ready 1=needs-gen; stdout=JSON missing-list',
      '       ensure-ready.cjs --closure <id>    Print full transitive closure as JSON',
      '       ensure-ready.cjs --target <path>   Same as --workflow keyed by filename',
    ].join('\n') + '\n');
    process.exit(2);
  }

  // ── Resolve workflowId ───────────────────────────────────────────────────────

  let workflowId = target;
  if (mode === 'target') {
    workflowId = path.basename(target, '.md');
  }

  // ── Load structure-manifest ──────────────────────────────────────────────────

  const projectRoot = process.cwd();

  // Try project-local first, then .forge/config.json's forgeRoot
  let manifestPath = path.join(projectRoot, '.forge', 'schemas', 'structure-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    // Try to find it via config.paths.forgeRoot
    try {
      const cfg = JSON.parse(fs.readFileSync(path.join(projectRoot, '.forge', 'config.json'), 'utf8'));
      if (cfg && cfg.paths && cfg.paths.forgeRoot) {
        const alt = path.join(cfg.paths.forgeRoot, 'schemas', 'structure-manifest.json');
        if (fs.existsSync(alt)) manifestPath = alt;
      }
    } catch {}
  }

  let manifest = {};
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (e) {
      process.stderr.write(`△ Could not parse structure-manifest.json: ${e.message}\n`);
    }
  }

  // ── Load config ───────────────────────────────────────────────────────────────

  let config = null;
  try {
    config = JSON.parse(fs.readFileSync(path.join(projectRoot, '.forge', 'config.json'), 'utf8'));
  } catch {}

  const kbPath = resolveKbPath(config);

  // ── Compute closure ──────────────────────────────────────────────────────────

  const closure = computeClosure(manifest, workflowId);

  if (mode === 'closure') {
    process.stdout.write(JSON.stringify(closure, null, 2) + '\n');
    process.exit(0);
  }

  // ── Check readiness ──────────────────────────────────────────────────────────

  const missing  = [];
  const stubbed  = [];
  const modified = [];

  // All artifact paths in the closure (excluding kb_docs and config_fields)
  const allArtifacts = [
    ...closure.personas,
    ...closure.skills,
    ...closure.templates,
    ...closure.workflows,
  ];

  // Also include kb_docs with placeholder resolved
  for (const kbDoc of closure.kb_docs) {
    allArtifacts.push(resolvePath(kbDoc, kbPath));
  }

  for (const artifactPath of allArtifacts) {
    const absPath = path.resolve(projectRoot, artifactPath);
    if (!fs.existsSync(absPath)) {
      missing.push(artifactPath);
      continue;
    }
    const content = fs.readFileSync(absPath, 'utf8');
    if (content.startsWith(FAST_STUB_SENTINEL)) {
      stubbed.push(artifactPath);
    }
  }

  const needsGen = missing.length > 0 || stubbed.length > 0;

  const result = {
    workflowId,
    ready: !needsGen,
    missing,
    stubbed,
    modified,
    closure,
  };

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(needsGen ? 1 : 0);

} catch (err) {
  process.stderr.write(`× ensure-ready fatal: ${err.message}\n${err.stack}\n`);
  process.exit(1);
}
} // end if (require.main === module)
