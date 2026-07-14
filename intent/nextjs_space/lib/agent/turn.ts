/**
 * Phase 8 — the turn orchestrator (§3.10).
 *
 * The deterministic pipeline: load → PERCEIVE (LLM → events) → apply → DECIDE
 * (pure) → NARRATE (LLM) → return. The record is the shared state; control flow
 * and move-selection are code, the LLM only perceives and phrases.
 */

import type { ChatTurn, Risk } from './types.ts';
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
  opts: { risk?: Risk; at?: string; by?: string; history?: ChatTurn[] } = {},
): Promise<TurnResult> {
  // opts.risk is an EXPLICIT override only. Normally we drive readiness by the
  // record's own assessed risk (Perceive sets it) — hardcoding 'medium' here
  // silently defeated right-sizing (a high-risk intent got a medium required-set).
  const riskOverride = opts.risk;
  const at = opts.at ?? new Date().toISOString();
  const by = opts.by ?? 'user';
  const history = opts.history ?? [];

  // ensure the record exists (born at message one)
  let record = await store.load(id);
  if (!record) {
    record = await store.append(id, { kind: 'created', at, by, rawInput: message });
  }

  // PERCEIVE (LLM) → events → apply
  const events = await perceive(record, message, llm, { at, history });
  for (const e of events) record = await store.append(id, e);

  // DECIDE (pure) → NARRATE (LLM) — both driven by the record's assessed risk.
  const risk = riskOverride ?? record.risk ?? 'medium';
  const moves = decide(record, risk);
  const reply = await narrate(record, moves, llm, { history });

  const view = await materializeRecord(store, id, riskOverride);
  return { view: view!, moves, reply };
}

/**
 * The user picked a mode in the picker (§5.2 choice UX). Record it, then let the
 * agent proceed — under that persona's rigor — WITHOUT a Perceive step (there's
 * no new intent text to fold, only a choice).
 */
export async function runPersonaSelection(
  store: IntentEventStore,
  id: string,
  persona: string,
  llm: LLM,
  opts: { at?: string; by?: string; history?: ChatTurn[] } = {},
): Promise<TurnResult> {
  const at = opts.at ?? new Date().toISOString();
  const by = opts.by ?? 'user';
  const history = opts.history ?? [];
  let record = await store.load(id);
  if (!record) throw new Error(`no record for ${id}`);
  record = await store.append(id, { kind: 'persona_selected', at, by, persona });
  const moves = decide(record); // rigor now derives from the chosen persona
  const reply = await narrate(record, moves, llm, { history });
  const view = await materializeRecord(store, id);
  return { view: view!, moves, reply };
}
