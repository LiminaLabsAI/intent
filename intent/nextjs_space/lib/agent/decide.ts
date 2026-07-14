/**
 * Phase 8 — the DECIDE policy (§3.5). PURE, DETERMINISTIC.
 *
 * Given the perceived record state, pick the single highest-value move (1/turn
 * for MVP — deliberately "not a barrage"). The LLM never runs here; it only
 * *phrases* the chosen move (Narrate). Priority order:
 *   governance-stop → conflict → close(when ready) → highest-risk gap.
 *
 * This is the "deterministic rails" half: behavior provably follows the policy;
 * the agent's freedom (how to phrase, how deep) lives in Narrate.
 */

import type { IntentRecord, Risk, SlotState } from './types.ts';
import { assessReadiness } from './strength.ts';

export type MoveKind =
  | 'governance_stop'
  | 'ask'
  | 'infer_confirm'
  | 'disambiguate'
  | 'surface_conflict'
  | 'split'
  | 'close';

export interface Move {
  kind: MoveKind;
  slot?: string;
  rationale: string;
}

/** Stub enterprise-scope guard. Phase 11 replaces this with the policy engine. */
const BLOCKED = [/\bgrocery\b/i, /\bpersonal\b/i, /\bweekend plans?\b/i, /\bdinner\b/i];
export function governanceStop(record: IntentRecord): Move | null {
  if (BLOCKED.some((re) => re.test(record.rawInput))) {
    return {
      kind: 'governance_stop',
      rationale: 'intent appears outside enterprise scope — offer the human-review valve',
    };
  }
  return null;
}

/** Deterministic gap ranking: objective first, then the rest of the spine, then template slots. */
const SLOT_PRIORITY = [
  'objective', 'scope', 'entities', 'acceptance_criteria', 'context', 'out_of_scope',
  'rollback', 'migration_path', 'blast_radius', 'cutover_window', 'dependencies',
  'audience', 'data_sources', 'period_cadence', 'metrics', 'format', 'distribution',
];
function priority(key: string): number {
  const i = SLOT_PRIORITY.indexOf(key);
  return i === -1 ? SLOT_PRIORITY.length : i;
}

function moveForState(state: SlotState): MoveKind {
  switch (state) {
    case 'empty': return 'ask';
    // 'weak' → ask for specifics, NOT infer_confirm: a vague value can't be
    // fixed by nodding at a restatement (that loops); we must elicit detail.
    case 'weak': return 'ask';
    case 'ambiguous': return 'disambiguate';
    case 'conflicting': return 'surface_conflict';
    case 'strong': return 'ask'; // unreachable for a gap
  }
}

export function decide(record: IntentRecord, risk: Risk = 'medium'): Move[] {
  const gov = governanceStop(record);
  if (gov) return [gov];

  const report = assessReadiness(record, risk);

  if (report.conflicts.length > 0) {
    const key = report.conflicts.slice().sort((a, b) => priority(a) - priority(b))[0];
    return [{ kind: 'surface_conflict', slot: key, rationale: `'${key}' contradicts another slot; resolve before proceeding` }];
  }

  if (report.readiness === 'ready') {
    return [{ kind: 'close', rationale: 'all required slots are strong — ready to hand off' }];
  }

  // Breadth before depth: engage EMPTY slots first (every turn covers new
  // ground = visible progress), then come back to deepen weak/ambiguous ones.
  // Without this, DECIDE re-selects the same high-priority slot every turn until
  // it is strong — which reads as "iterating the same question".
  const stateRank = (s: SlotState): number => (s === 'empty' ? 0 : 1);
  const gaps = report.gaps
    .slice()
    .sort((a, b) => stateRank(a.state) - stateRank(b.state) || priority(a.key) - priority(b.key));
  if (gaps.length === 0) return [];
  const top = gaps[0];
  return [{ kind: moveForState(top.state), slot: top.key, rationale: `next gap: '${top.key}' is ${top.state}` }];
}
