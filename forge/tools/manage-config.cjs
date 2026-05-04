#!/usr/bin/env node
'use strict';

// Forge tool: manage-config
// Read and write .forge/config.json safely.
// Usage: manage-config get <key.path>
//        manage-config list-pipelines
//        manage-config pipeline add <name> --description <text> --phases <json>
//        manage-config pipeline get <name>
//        manage-config pipeline remove <name>
//        manage-config resolve-forge-root
//        manage-config set <key.path> <json-value>

const fs = require('fs');
const path = require('path');
const os = require('os');
const { findProjectRoot } = require('./lib/project-root.cjs');

const _projectRoot = findProjectRoot();
const CONFIG_PATH = _projectRoot
  ? path.join(_projectRoot, '.forge', 'config.json')
  : path.join(process.cwd(), '.forge', 'config.json');

const VALID_ROLES = ['plan', 'review-plan', 'implement', 'review-code', 'validate', 'approve', 'commit'];
const VALID_NAME = /^[a-z0-9_-]+$/;

const ROLE_MODEL_DEFAULTS = {
  'plan': 'sonnet',
  'implement': 'sonnet',
  'review-plan': 'opus',
  'review-code': 'opus',
  'validate': 'opus',
  'approve': 'opus',
  'commit': 'haiku'
};

function readConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('× .forge/config.json not found. Run /forge:init first.');
    process.exit(1);
  }
  let raw;
  try { raw = fs.readFileSync(CONFIG_PATH, 'utf8'); } catch (e) {
    console.error(`× reading ${CONFIG_PATH}: ${e.message}`); process.exit(1);
  }
  try { return { config: JSON.parse(raw), raw }; } catch (e) {
    console.error(`× .forge/config.json is not valid JSON: ${e.message}`); process.exit(1);
  }
}

function detectIndent(raw) {
  const m = raw.match(/^([ \t]+)/m);
  return m ? m[1] : '  ';
}

function writeConfig(config, indent) {
  const json = JSON.stringify(config, null, indent) + '\n';
  const tmp = CONFIG_PATH + '.tmp.' + process.pid;
  try {
    fs.writeFileSync(tmp, json, 'utf8');
    fs.renameSync(tmp, CONFIG_PATH);
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch {}
    console.error(`× writing config: ${e.message}`); process.exit(1);
  }
}

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function assertSafeKeys(dotPath) {
  const keys = dotPath.split('.');
  for (const key of keys) {
    if (DANGEROUS_KEYS.has(key)) {
      throw new Error(`Unsafe key path '${key}' in '${dotPath}' — prototype traversal blocked`);
    }
  }
}

function getByPath(obj, dotPath) {
  assertSafeKeys(dotPath);
  return dotPath.split('.').reduce((cur, key) => (cur != null && typeof cur === 'object' ? cur[key] : undefined), obj);
}

function setByPath(obj, dotPath, value) {
  assertSafeKeys(dotPath);
  const keys = dotPath.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (cur[keys[i]] == null || typeof cur[keys[i]] !== 'object') cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

function validatePhases(phases) {
  if (!Array.isArray(phases) || phases.length === 0) return 'At least one phase is required';
  for (const [i, p] of phases.entries()) {
    if (!p.command || typeof p.command !== 'string') return `Phase ${i + 1}: command must be a non-empty string`;
    if (!VALID_ROLES.includes(p.role)) return `Phase ${i + 1}: role must be one of: ${VALID_ROLES.join(', ')}`;
    if (p.maxIterations !== undefined && (!Number.isInteger(p.maxIterations) || p.maxIterations < 1))
      return `Phase ${i + 1}: maxIterations must be a positive integer`;
  }
  return null;
}

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--') && i + 1 < argv.length) {
      result[argv[i].slice(2)] = argv[++i];
    }
  }
  return result;
}

module.exports = { getByPath, setByPath, assertSafeKeys, validatePhases, detectIndent, parseArgs, VALID_ROLES, VALID_NAME, ROLE_MODEL_DEFAULTS };

if (require.main === module) {
const [,, subcmd, ...args] = process.argv;

if (!subcmd) {
  console.error([
    'Usage: manage-config <subcommand> [options]',
    '',
    'Subcommands:',
    '  get <key.path>                                     Print a config value',
    '  list-pipelines                                     List all pipelines',
    '  pipeline add <name> --description <t> --phases <json>',
    '  pipeline get <name>                                Print a pipeline in full',
    '  pipeline remove <name>',
    '  pipeline backfill-models                           Backfill model fields from role defaults',
    '  resolve-forge-root                                 Resolve Forge plugin root path',
    '  set <key.path> <json-value>                        Set an arbitrary value',
  ].join('\n'));
  process.exit(2);
}

if (subcmd === 'get') {
  const keyPath = args[0];
  if (!keyPath) { console.error('Usage: manage-config get <key.path>'); process.exit(2); }
  const { config } = readConfig();
  const value = getByPath(config, keyPath);
  if (value === undefined) { console.error(`Key not found: ${keyPath}`); process.exit(1); }
  console.log(value !== null && typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value));
  process.exit(0);
}

if (subcmd === 'list-pipelines') {
  const { config } = readConfig();
  const pipelines = config.pipelines;
  if (!pipelines || Object.keys(pipelines).length === 0) {
    console.log('── No pipelines configured.');
    process.exit(0);
  }
  console.log('| Name | Description | Phases |');
  console.log('|------|-------------|--------|');
  for (const [name, pl] of Object.entries(pipelines)) {
    const desc = pl.description || '(none)';
    const count = Array.isArray(pl.phases) ? pl.phases.length : 0;
    console.log(`| ${name} | ${desc} | ${count} |`);
  }
  process.exit(0);
}

if (subcmd === 'pipeline') {
  const action = args[0];

  if (action === 'get') {
    const name = args[1];
    if (!name) { console.error('Usage: manage-config pipeline get <name>'); process.exit(2); }
    const { config } = readConfig();
    if (!config.pipelines || !config.pipelines[name]) {
      console.error(`× Pipeline '${name}' not found`); process.exit(1);
    }
    const pl = config.pipelines[name];
    if (pl.description) console.log(`── ${pl.description}\n`);
    console.log('| # | Role | Command | Workflow | Model | maxIter |');
    console.log('|---|------|---------|----------|-------|---------|');
    (pl.phases || []).forEach((p, i) => {
      const wf = p.workflow || '(built-in)';
      const model = p.model || '(default)';
      const maxIter = p.maxIterations != null ? p.maxIterations : '—';
      console.log(`| ${i + 1} | ${p.role} | \`${p.command}\` | \`${wf}\` | ${model} | ${maxIter} |`);
    });
    process.exit(0);
  }

  if (action === 'add') {
    const name = args[1];
    if (!name) { console.error('Usage: manage-config pipeline add <name> --description <text> --phases <json>'); process.exit(2); }
    if (!VALID_NAME.test(name)) { console.error(`× pipeline name must match [a-z0-9_-], got: ${name}`); process.exit(1); }

    const flags = parseArgs(args.slice(2));
    if (!flags.phases) { console.error('Error: --phases <json> is required'); process.exit(2); }

    let phases;
    try { phases = JSON.parse(flags.phases); } catch (e) {
      console.error(`× --phases is not valid JSON: ${e.message}`); process.exit(2);
    }

    const err = validatePhases(phases);
    if (err) { console.error(`× ${err}`); process.exit(1); }

    const { config, raw } = readConfig();
    if (!config.pipelines) config.pipelines = {};
    config.pipelines[name] = flags.description
      ? { description: flags.description, phases }
      : { phases };
    writeConfig(config, detectIndent(raw));
    console.log(`〇 Pipeline '${name}' saved.`);
    process.exit(0);
  }

  if (action === 'backfill-models') {
    const { config, raw } = readConfig();
    if (!config.pipelines || Object.keys(config.pipelines).length === 0) {
      console.log('── No pipelines configured — nothing to backfill.');
      process.exit(0);
    }
    let updated = 0;
    for (const [name, pl] of Object.entries(config.pipelines)) {
      if (!Array.isArray(pl.phases)) continue;
      for (const phase of pl.phases) {
        if (!phase.model && ROLE_MODEL_DEFAULTS[phase.role]) {
          phase.model = ROLE_MODEL_DEFAULTS[phase.role];
          updated++;
        }
      }
    }
    if (updated === 0) {
      console.log('〇 All pipeline phases already have model fields.');
      process.exit(0);
    }
    writeConfig(config, detectIndent(raw));
    console.log(`〇 Backfilled model fields on ${updated} phase(s) across ${Object.keys(config.pipelines).length} pipeline(s).`);
    process.exit(0);
  }

  if (action === 'remove') {
    const name = args[1];
    if (!name) { console.error('Usage: manage-config pipeline remove <name>'); process.exit(2); }
    const { config, raw } = readConfig();
    if (!config.pipelines || !config.pipelines[name]) {
      console.error(`× Pipeline '${name}' not found`); process.exit(1);
    }
    delete config.pipelines[name];
    if (Object.keys(config.pipelines).length === 0) delete config.pipelines;
    writeConfig(config, detectIndent(raw));
    console.log(`〇 Pipeline '${name}' removed.`);
    process.exit(0);
  }

  console.error(`Unknown pipeline action: ${action}`);
  process.exit(2);
}

if (subcmd === 'set') {
  const keyPath = args[0];
  const valueStr = args[1];
  if (!keyPath || valueStr === undefined) { console.error('Usage: manage-config set <key.path> <json-value>'); process.exit(2); }
  // FR-005: If config.json does not exist, create a minimal {} config before reading.
  // This allows `set` to work on fresh projects that haven't run /forge:init yet.
  if (!fs.existsSync(CONFIG_PATH)) {
    const configDir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, '{}\n', 'utf8');
  }
  let value;
  try { value = JSON.parse(valueStr); } catch { value = valueStr; }
  const { config, raw } = readConfig();
  setByPath(config, keyPath, value);
  writeConfig(config, detectIndent(raw));
  console.log(`Set ${keyPath}.`);
  process.exit(0);
}

// FR-010: resolve-forge-root — resolve the Forge plugin root path using
// three-tier priority: (1) CLAUDE_PLUGIN_ROOT env var, (2) cache/marketplace
// scan by forgeRef, (3) paths.forgeRoot fallback.
if (subcmd === 'resolve-forge-root') {
  // Priority 1: CLAUDE_PLUGIN_ROOT env var (if set and directory exists)
  const envRoot = process.env.CLAUDE_PLUGIN_ROOT;
  if (envRoot && envRoot.length > 0) {
    try {
      // Verify the directory exists and contains a valid plugin.json
      const pluginJsonPath = path.join(envRoot, '.claude-plugin', 'plugin.json');
      if (fs.existsSync(pluginJsonPath)) {
        console.log(envRoot);
        process.exit(0);
      }
      // Directory exists but no plugin.json — still use it if the directory itself exists
      if (fs.existsSync(envRoot)) {
        console.log(envRoot);
        process.exit(0);
      }
    } catch { /* fall through to next priority */ }
  }

  const { config } = readConfig();
  const forgeRef = getByPath(config, 'paths.forgeRef');
  const forgeRoot = getByPath(config, 'paths.forgeRoot');

  // Priority 2: Scan cache/marketplace directories by forgeRef
  if (forgeRef && typeof forgeRef === 'string') {
    const homeDir = os.homedir();
    const candidates = [
      path.join(homeDir, '.claude', 'plugins', 'cache', 'forge', 'forge', forgeRef),
      path.join(homeDir, '.claude', 'plugins', 'marketplaces', 'skillforge', 'forge', 'forge', forgeRef),
    ];
    for (const candidate of candidates) {
      try {
        const pluginJsonPath = path.join(candidate, '.claude-plugin', 'plugin.json');
        if (fs.existsSync(pluginJsonPath)) {
          // Validate that the plugin.json version matches forgeRef
          const manifest = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));
          if (manifest.version === forgeRef) {
            console.log(candidate);
            process.exit(0);
          }
        }
      } catch { /* try next candidate */ }
    }
  }

  // Priority 3: Fallback to paths.forgeRoot (deprecated but still read)
  if (forgeRoot && typeof forgeRoot === 'string') {
    console.log(forgeRoot);
    process.exit(0);
  }

  // No resolution possible
  console.error('× Cannot resolve Forge plugin root: no CLAUDE_PLUGIN_ROOT env var, no forgeRef cache match, and no forgeRoot in config.');
  process.exit(1);
}

console.error(`Unknown subcommand: ${subcmd}`);
process.exit(2)
} // end require.main === module;
