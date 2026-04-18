#!/usr/bin/env node
'use strict';

// Forge tool: gen-integrity
// Release-time hash manifest generator for plugin files.
// Usage: node gen-integrity.cjs --forge-root <path> [--version <ver>] [--out <path>]

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function computeHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function globDir(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith(ext))
    .map(f => path.join(dir, f));
}

function buildFileList(forgeRoot) {
  const files = {};
  const warnings = [];

  const commandFiles = globDir(path.join(forgeRoot, 'commands'), '.md');
  const agentFiles   = globDir(path.join(forgeRoot, 'agents'),   '.md');
  const hookFiles    = globDir(path.join(forgeRoot, 'hooks'),    '.js');
  const verifierPath = path.join(forgeRoot, 'tools', 'verify-integrity.cjs');

  const allFiles = [
    ...commandFiles.map(f => ['commands/' + path.basename(f), f]),
    ...agentFiles.map(f   => ['agents/'   + path.basename(f), f]),
    ...hookFiles.map(f    => ['hooks/'    + path.basename(f), f]),
    ['tools/verify-integrity.cjs', verifierPath],
  ];

  for (const [rel, abs] of allFiles) {
    if (!fs.existsSync(abs)) {
      warnings.push(`WARN: ${rel} not found — skipping`);
      continue;
    }
    files[rel] = computeHash(abs);
  }

  if (warnings.length) {
    for (const w of warnings) process.stderr.write(w + '\n');
  }

  return files;
}

function generateManifest(forgeRoot, outPath, version) {
  const files = buildFileList(forgeRoot);
  const today = new Date().toISOString().slice(0, 10);

  const manifest = {
    version,
    generated: today,
    note: 'Tamper-evident only. Authoritative source: /forge:update from remote.',
    files,
  };

  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

module.exports = { computeHash, buildFileList, generateManifest };

if (require.main === module) {
  const args = process.argv.slice(2);
  const forgeRootIdx = args.indexOf('--forge-root');
  const versionIdx   = args.indexOf('--version');
  const outIdx       = args.indexOf('--out');

  if (forgeRootIdx === -1) {
    console.error('Usage: gen-integrity.cjs --forge-root <path> [--version <ver>] [--out <path>]');
    process.exit(1);
  }

  const forgeRoot = path.resolve(args[forgeRootIdx + 1]);
  const version   = versionIdx !== -1 ? args[versionIdx + 1] : (() => {
    try {
      const pj = JSON.parse(fs.readFileSync(path.join(forgeRoot, '.claude-plugin', 'plugin.json'), 'utf8'));
      return pj.version;
    } catch { return 'unknown'; }
  })();
  const outPath = outIdx !== -1 ? path.resolve(args[outIdx + 1]) : path.join(forgeRoot, 'integrity.json');

  const manifest = generateManifest(forgeRoot, outPath, version);
  console.log(`〇 Integrity manifest written → ${outPath}`);
  console.log(`  version: ${manifest.version}   files: ${Object.keys(manifest.files).length}`);
}
