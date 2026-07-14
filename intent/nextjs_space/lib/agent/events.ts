/**
 * Phase 7 — Event sourcing (§2 / §3.4).
 *
 * The append-only event log is the source of truth. `apply` folds one event into
 * a NEW record (immutable); `replay` materializes the current-state record from a
 * log. Pure and deterministic — same events always yield the same record.
 *
 * Records only carry slots that have been touched; untouched schema slots are
 * treated as 'empty' by the strength aggregation (see strength.ts). Emergent
 * slots enter via `slot_added`.
 */

import type { IntentEvent, IntentRecord } from './types.ts';

/** A fresh, empty record in the DRAFT state (version 0, no events applied). */
export function emptyRecord(id: string): IntentRecord {
  return { id, version: 0, rawInput: '', intentType: null, risk: 'medium', complexity: null, state: 'DRAFT', slots: {} };
}

/** Apply a single event, returning a NEW record. Never mutates its input. */
export function apply(record: IntentRecord, event: IntentEvent): IntentRecord {
  const next: IntentRecord = {
    ...record,
    version: record.version + 1,
    slots: { ...record.slots },
  };
  switch (event.kind) {
    case 'created':
      next.rawInput = event.rawInput;
      next.state = 'DRAFT';
      break;
    case 'classified':
      next.intentType = event.intentType;
      break;
    case 'slot_added':
      if (!next.slots[event.def.key]) {
        next.slots[event.def.key] = { key: event.def.key, value: null, state: 'empty' };
      }
      break;
    case 'slot_valued': {
      const prev = next.slots[event.key] ?? { key: event.key, value: null, state: 'empty' as const };
      next.slots[event.key] = { ...prev, value: event.value };
      break;
    }
    case 'slot_assessed': {
      const prev = next.slots[event.key] ?? { key: event.key, value: null, state: 'empty' as const };
      next.slots[event.key] = {
        ...prev,
        state: event.state,
        reason: event.reason,
        evidence: event.evidence,
      };
      break;
    }
    case 'transitioned':
      next.state = event.to;
      break;
    case 'sized':
      next.risk = event.risk;
      next.complexity = event.complexity;
      break;
  }
  return next;
}

/** Replay an event log into a materialized record (deterministic). */
export function replay(id: string, events: IntentEvent[]): IntentRecord {
  return events.reduce(apply, emptyRecord(id));
}
