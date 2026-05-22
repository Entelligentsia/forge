'use strict';
// FORGE-S24-T02 — proposal normaliser.
//
// Back-compat shim for the Phase 2 op-classification rollout: legacy
// enhancement proposals written by pre-0.45.2 enhance-phase2 runs do not
// carry an `op` field. On read, we default such records to
// `insert_skill` — the only op the previous insert-biased flow could
// produce — leaving the explicit-op fast path untouched.
//
// Pure function; consumed by Phase 2 step 5 (synthesize) before any
// downstream judge/gate logic.

function normaliseProposal(proposal) {
  if (proposal == null || typeof proposal !== 'object') {
    throw new TypeError('normaliseProposal: expected object');
  }
  if ('op' in proposal && proposal.op !== undefined && proposal.op !== null) {
    return proposal;
  }
  return { op: 'insert_skill', ...proposal };
}

module.exports = { normaliseProposal };
