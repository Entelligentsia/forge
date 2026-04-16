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

let store;
function _getStore() { return store || (store = require('./store')); }

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
// Heuristic tables (documented — these are estimates, not measurements)
// ---------------------------------------------------------------------------

function lookupByModel(table, defaultValue, model) {
  if (!model) return defaultValue;
  const matches = Object.keys(table).filter(k => model.toLowerCase().includes(k.toLowerCase()));
  if (matches.length === 0) return defaultValue;
  // Longest match wins
  matches.sort((a, b) => b.length - a.length);
  return table[matches[0]];
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

function processEvent(event, dryRun) {
  if (!event) {
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
    console.log(`  [dry-run] would update event: ${event.eventId}`);
    console.log(`    inputTokens=${estimates.inputTokens}, outputTokens=${estimates.outputTokens}, estimatedCostUSD=${estimates.estimatedCostUSD}`);
    return 'updated';
  }

  try {
    _getStore().writeEvent(event.sprintId, updated);
  } catch (e) {
    console.error(`  [error] Failed to write ${event.eventId}: ${e.message}`);
    return 'error';
  }

  console.log(`  updated: ${event.eventId} (inputTokens=${estimates.inputTokens}, outputTokens=${estimates.outputTokens}, estimatedCostUSD=${estimates.estimatedCostUSD})`);
  return 'updated';
}

// ---------------------------------------------------------------------------
// Exports for testing
// ---------------------------------------------------------------------------

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    lookupByModel,
    estimateTokens,
    TOKENS_PER_MINUTE,
    PRICE_PER_1M,
    PHASE_SPLIT,
    DEFAULT_TOKENS_PER_MINUTE,
    DEFAULT_PRICE_PER_1M,
    DEFAULT_PHASE_SPLIT,
  };
}

// ---------------------------------------------------------------------------
// Main (CLI mode only)
// ---------------------------------------------------------------------------

if (require.main === module) {
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

  let eventsToProcess = [];

  if (eventIdx !== -1) {
    // Single-event mode
    const eventArg = args[eventIdx + 1];
    if (!eventArg) {
      console.error('Error: --event requires a file path argument');
      process.exit(1);
    }

    // Use store facade to read the event
    // Since the facade requires sprintId for events, we attempt to derive it from the path
    const path = require('path');
    const resolved = path.isAbsolute(eventArg)
      ? eventArg
      : path.resolve(process.cwd(), eventArg);

    // The event path is expected to be .forge/store/events/{sprintId}/{eventId}.json
    const parts = resolved.split(path.sep);
    const eventStoreIdx = parts.indexOf('events');
    if (eventStoreIdx === -1 || !parts[eventStoreIdx + 1]) {
      console.error(`Error: event path must be within the store events directory to use facade: ${resolved}`);
      process.exit(1);
    }
    const sprintId = parts[eventStoreIdx + 1];
    const eventId = path.basename(resolved, '.json');

    const eventData = _getStore().getEvent(eventId, sprintId);
    if (!eventData) {
      console.error(`Error: event not found via facade: ${resolved}`);
      process.exit(1);
    }
    eventsToProcess = [eventData];
  } else {
    // Sprint batch mode
    const sprintId = args[sprintIdx + 1];
    if (!sprintId) {
      console.error('Error: --sprint requires a SPRINT_ID argument');
      process.exit(1);
    }
    // listEvents returns all events in the sprint.
    // We must filter out sidecars (which start with _).
    // Note: FSImpl.listEvents currently returns JSON objects, not filenames.
    // The sidecars are read as JSON objects if they end in .json.
    // We identify sidecars by the absence of eventId or by a specific naming convention.
    // However, the Store facade's listEvents uses readdirSync and filters by .json.
    // Sidecars start with '_' in the filename.
    // To properly filter, we need to be careful.
    const allEvents = _getStore().listEvents(sprintId);
    eventsToProcess = allEvents.filter(e => e && e.eventId && !e.eventId.startsWith('_'));
  }

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const event of eventsToProcess) {
    const result = processEvent(event, DRY_RUN);
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
} // end if (require.main === module)
