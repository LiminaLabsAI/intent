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
import { personaToRigor } from './cost-config.ts';

export type MoveKind =
  | 'governance_stop'
  | 'select_persona'
  | 'ask_outcome'
  | 'ask'
  | 'infer_confirm'
  | 'disambiguate'
  | 'surface_conflict'
  | 'split'
  | 'verify'
  | 'offer_build'
  | 'refine'
  | 'close'
  | 'handoff_complete';

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

export function decide(record: IntentRecord, risk: Risk = record.risk ?? 'medium'): Move[] {
  // TERMINAL: once approved and handed off, the conversation is done — never
  // re-open gaps or re-offer the handoff. This short-circuits everything.
  if (record.state === 'APPROVED') {
    return [{ kind: 'handoff_complete', rationale: 'record approved and handed off to the executor' }];
  }

  const gov = governanceStop(record);
  if (gov) return [gov];

  // PERSONA GATE (§5.2 choice UX): once the intent is classified, the user picks
  // the mode BEFORE the agent refines — the choice governs the rigor below.
  if (record.intentType && !record.persona) {
    return [{ kind: 'select_persona', rationale: 'user chooses the refinement/execution mode before we go deeper' }];
  }

  // OUTCOME GATE (ADR-0002 amendment): ask early what deliverable the user wants
  // (plan / diagram / script / doc) so clarify + build aim at it.
  if (record.persona && !record.outcome) {
    return [{ kind: 'ask_outcome', rationale: 'ask what the user wants produced so the build matches' }];
  }

  // The chosen persona drives refinement rigor (overrides the auto-assessed risk).
  const rigor = personaToRigor(record.persona) ?? risk;
  const report = assessReadiness(record, rigor);

  if (report.conflicts.length > 0) {
    const key = report.conflicts.slice().sort((a, b) => priority(a) - priority(b))[0];
    return [{ kind: 'surface_conflict', slot: key, rationale: `'${key}' contradicts another slot; resolve before proceeding` }];
  }

  if (report.readiness === 'ready') {
    // At 🟢: offer to BUILD the working memory (ADR-0002). Only once built does
    // the record become handoff-ready.
    if (!record.built) {
      return [{ kind: 'offer_build', rationale: 'enough context gathered — offer to build the working memory' }];
    }
    return [{ kind: 'close', rationale: 'working memory built — ready to hand off' }];
  }

  // BATCH (§3.11): present ALL open required gaps at once — the user answers in
  // bulk, not one drip per turn. Breadth (empty) before depth (weak/ambiguous)
  // so the batch reads in a sensible order. Narrate composes them into one message.
  const stateRank = (s: SlotState): number => (s === 'empty' ? 0 : 1);
  const gaps = report.gaps
    .slice()
    .sort((a, b) => stateRank(a.state) - stateRank(b.state) || priority(a.key) - priority(b.key));
  const gapMoves: Move[] = gaps.map((g) => ({ kind: moveForState(g.state), slot: g.key, rationale: `gap: '${g.key}' is ${g.state}` }));

  // VERIFY (ADR-0002): during clarify, surface the agent's own inferred slots so
  // the user can confirm/correct them — the assumption-reduction the build depends on.
  const verifyMoves: Move[] = Object.values(record.slots)
    .filter((s) => s.state === 'strong' && s.inferred)
    .sort((a, b) => priority(a.key) - priority(b.key))
    .map((s) => ({ kind: 'verify' as MoveKind, slot: s.key, rationale: `assumed '${s.key}' — confirm or correct` }));

  return [...gapMoves, ...verifyMoves];
}
