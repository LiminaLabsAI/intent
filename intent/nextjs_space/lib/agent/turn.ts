/**
 * Phase 8 — the turn orchestrator (§3.10).
 *
 * The deterministic pipeline: load → PERCEIVE (LLM → events) → apply → DECIDE
 * (pure) → NARRATE (LLM) → return. The record is the shared state; control flow
 * and move-selection are code, the LLM only perceives and phrases.
 */

import type { Risk } from './types.ts';
import type { IntentEventStore } from './store.ts';
import type { LLM } from './llm.ts';
import type { Move } from './decide.ts';
import type { RecordView } from './materialize.ts';
import { perceive } from './perceive.ts';
import { decide } from './decide.ts';
import { narrate } from './narrate.ts';
import { materializeRecord } from './materialize.ts';

export interface TurnResult {
  view: RecordView;
  moves: Move[];
  reply: string;
}

export async function runTurn(
  store: IntentEventStore,
  id: string,
  message: string,
  llm: LLM,
  opts: { risk?: Risk; at?: string; by?: string } = {},
): Promise<TurnResult> {
  const risk = opts.risk ?? 'medium';
  const at = opts.at ?? new Date().toISOString();
  const by = opts.by ?? 'user';

  // ensure the record exists (born at message one)
  let record = await store.load(id);
  if (!record) {
    record = await store.append(id, { kind: 'created', at, by, rawInput: message });
  }

  // PERCEIVE (LLM) → events → apply
  const events = await perceive(record, message, llm, { at });
  for (const e of events) record = await store.append(id, e);

  // DECIDE (pure) → NARRATE (LLM)
  const moves = decide(record, risk);
  const reply = await narrate(record, moves, llm);

  const view = await materializeRecord(store, id, risk);
  return { view: view!, moves, reply };
}
