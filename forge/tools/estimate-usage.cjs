#!/usr/bin/env node
'use strict';

// Forge tool: estimate-usage
// Back-fill token usage estimates on event records that lack self-reported token data.
// Uses durationMinutes and model heuristics to compute inputTokens, outputTokens,
// and estimatedCostUSD. Writes results back to event JSON files without overwriting
// records that already carry self-reported data.
//
// Usage:
//   estimate-usage --event <path>         Process a single event file
//   estimate-usage --sprint <SPRINT_ID>   Process all events in a sprint directory
//   estimate-usage [--dry-run]            Log what would be written without modifying files

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Heuristic tables (documented — these are estimates, not measurements)
// ---------------------------------------------------------------------------

// TOKENS_PER_MINUTE — estimated total tokens processed per minute by model.
// Model matching is substring-based; longest match wins.
// Source: empirical observation + Anthropic throughput documentation.
const TOKENS_PER_MINUTE = {
  'claude-opus-4':     3000,
  'claude-sonnet-4':   4500,
  'claude-haiku-4':    8000,
  'claude-opus-3-7':   3000,
  'claude-sonnet-3-7': 4500,
  'claude-sonnet-3-5': 5000,
  'claude-haiku-3-5':  8000,
};
const DEFAULT_TOKENS_PER_MINUTE = 4000;

// PRICE_PER_1M — USD cost per 1M tokens.
// NOTE: This uses a single price for both input and output as a simplification.
// TODO: Replace with separate input/output pricing tiers when COST_REPORT (T05)
// is implemented. Prices sourced from Anthropic pricing page (approximate).
const PRICE_PER_1M = {
  'claude-opus-4':     15.00,
  'claude-sonnet-4':    3.00,
  'claude-haiku-4':     0.80,
  'claude-opus-3-7':   15.00,
  'claude-sonnet-3-7':  3.00,
  'claude-sonnet-3-5':  3.00,
  'claude-haiku-3-5':   0.80,
};
const DEFAULT_PRICE_PER_1M = 3.00;

// PHASE_SPLIT — input/output token fraction by phase.
// Implementation phases are heavier on input (reading context);
// review/plan phases are more balanced.
const PHASE_SPLIT = {
  'plan':          { input: 0.50, output: 0.50 },
  'review':        { input: 0.50, output: 0.50 },
  'review-plan':   { input: 0.50, output: 0.50 },
  'review-code':   { input: 0.50, output: 0.50 },
  'approve':       { input: 0.50, output: 0.50 },
  'implement':     { input: 0.70, output: 0.30 },
  'commit':        { input: 0.60, output: 0.40 },
};
const DEFAULT_PHASE_SPLIT = { input: 0.60, output: 0.40 };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readConfig() {
  const p = path.join(process.cwd(), '.forge', 'config.json');
  if (!fs.existsSync(p)) {
    console.error('Error: .forge/config.json not found');
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error(`Error: .forge/config.json is not valid JSON: ${e.message}`);
    process.exit(1);
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return null;
  }
}

// Substring-based model lookup — longest match wins.
function lookupByModel(table, defaultValue, modelStr) {
  if (!modelStr) return defaultValue;
  let bestKey = null;
  let bestLen = 0;
  for (const key of Object.keys(table)) {
    if (modelStr.includes(key) && key.length > bestLen) {
      bestKey = key;
      bestLen = key.length;
    }
  }
  return bestKey !== null ? table[bestKey] : defaultValue;
}

function estimateTokens(event) {
  const duration = event.durationMinutes;
  const model = event.model || null;
  const phase = event.phase || null;

  // Guard: missing or zero duration
  if (duration === null || duration === undefined || duration === 0) {
    if (duration === 0) {
      console.warn(`  [warn] durationMinutes is 0 for event ${event.eventId} — estimation will produce 0 tokens`);
    }
    return null;
  }

  const tokensPerMin = lookupByModel(TOKENS_PER_MINUTE, DEFAULT_TOKENS_PER_MINUTE, model);
  const pricePerMillion = lookupByModel(PRICE_PER_1M, DEFAULT_PRICE_PER_1M, model);
  const split = PHASE_SPLIT[phase] || DEFAULT_PHASE_SPLIT;

  const totalTokens = Math.round(duration * tokensPerMin);
  const inputTokens = Math.round(totalTokens * split.input);
  const outputTokens = Math.round(totalTokens * split.output);
  const estimatedCostUSD = parseFloat(
    ((inputTokens + outputTokens) / 1_000_000 * pricePerMillion).toFixed(6)
  );

  return { inputTokens, outputTokens, estimatedCostUSD, tokenSource: 'estimated' };
}

function processEventFile(filePath, dryRun) {
  const event = readJson(filePath);
  if (!event) {
    console.warn(`  [warn] Could not read or parse: ${filePath}`);
    return 'error';
  }

  // Skip guard: already has self-reported or previously estimated token data
  if (event.inputTokens !== undefined) {
    return 'skipped';
  }

  // Guard: missing durationMinutes entirely
  if (event.durationMinutes === null || event.durationMinutes === undefined) {
    return 'skipped';
  }

  const estimates = estimateTokens(event);
  if (!estimates) {
    return 'skipped';
  }

  const updated = Object.assign({}, event, estimates);

  if (dryRun) {
    console.log(`  [dry-run] would write to: ${filePath}`);
    console.log(`    inputTokens=${estimates.inputTokens}, outputTokens=${estimates.outputTokens}, estimatedCostUSD=${estimates.estimatedCostUSD}`);
    return 'updated';
  }

  // Atomic write: write to .tmp then rename
  const tmpPath = filePath + '.tmp';
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(updated, null, 2) + '\n', 'utf8');
    fs.renameSync(tmpPath, filePath);
  } catch (e) {
    // Clean up tmp file if it exists
    if (fs.existsSync(tmpPath)) {
      try { fs.unlinkSync(tmpPath); } catch (_) {}
    }
    console.error(`  [error] Failed to write ${filePath}: ${e.message}`);
    return 'error';
  }

  console.log(`  updated: ${path.basename(filePath)} (inputTokens=${estimates.inputTokens}, outputTokens=${estimates.outputTokens}, estimatedCostUSD=${estimates.estimatedCostUSD})`);
  return 'updated';
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

try {
  const args = process.argv.slice(2);
  const DRY_RUN = args.includes('--dry-run');

  const eventIdx = args.indexOf('--event');
  const sprintIdx = args.indexOf('--sprint');

  if (eventIdx === -1 && sprintIdx === -1) {
    console.error('Usage: estimate-usage --event <path> | --sprint <SPRINT_ID> [--dry-run]');
    process.exit(1);
  }

  if (eventIdx !== -1 && sprintIdx !== -1) {
    console.error('Error: --event and --sprint are mutually exclusive');
    process.exit(1);
  }

  const config = readConfig();
  const storePath = (config.paths && config.paths.store) ? config.paths.store : '.forge/store';
  const storeDir = path.resolve(process.cwd(), storePath);

  let filesToProcess = [];

  if (eventIdx !== -1) {
    // Single-event mode
    const eventArg = args[eventIdx + 1];
    if (!eventArg) {
      console.error('Error: --event requires a file path argument');
      process.exit(1);
    }
    const resolved = path.isAbsolute(eventArg)
      ? eventArg
      : path.resolve(process.cwd(), eventArg);
    if (!fs.existsSync(resolved)) {
      console.error(`Error: event file not found: ${resolved}`);
      process.exit(1);
    }
    filesToProcess = [resolved];
  } else {
    // Sprint batch mode
    const sprintId = args[sprintIdx + 1];
    if (!sprintId) {
      console.error('Error: --sprint requires a SPRINT_ID argument');
      process.exit(1);
    }
    const sprintEventsDir = path.join(storeDir, 'events', sprintId);
    if (!fs.existsSync(sprintEventsDir)) {
      console.error(`Error: sprint events directory not found: ${sprintEventsDir}`);
      process.exit(1);
    }
    filesToProcess = fs.readdirSync(sprintEventsDir)
      .filter(f => f.endsWith('.json') && !f.includes('_sidecar'))
      .map(f => path.join(sprintEventsDir, f));
  }

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const filePath of filesToProcess) {
    const result = processEventFile(filePath, DRY_RUN);
    if (result === 'updated') updated++;
    else if (result === 'skipped') skipped++;
    else errors++;
  }

  console.log(`\n${updated} events updated, ${skipped} skipped (already populated)${errors > 0 ? `, ${errors} errors` : ''}`);
  process.exit(0);

} catch (err) {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
}
