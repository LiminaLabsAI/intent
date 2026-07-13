/**
 * Phase 7 — The event store (persistence boundary).
 *
 * `IntentEventStore` is the interface the rails depend on; `InMemoryEventStore`
 * is the deterministic, DB-free implementation used by tests and by the pure
 * core. A Prisma-backed adapter (IntentEvent table) implements the same
 * interface once a database is available — the core never changes.
 *
 * Append is where invariants are enforced: a `transitioned` event is validated
 * against the lifecycle state machine before it is persisted.
 */

import type { IntentEvent, IntentRecord } from './types.ts';
import { replay } from './events.ts';
import { assertTransition } from './lifecycle.ts';

export interface IntentEventStore {
  /** Append an event (validating invariants) and return the new materialized record. */
  append(id: string, event: IntentEvent): Promise<IntentRecord>;
  /** Load the current materialized record, or null if the intent does not exist. */
  load(id: string): Promise<IntentRecord | null>;
  /** The raw event log (a copy) for audit / lineage. */
  events(id: string): Promise<IntentEvent[]>;
}

/** Enforce append-time invariants shared by every store implementation. */
export function guardAppend(current: IntentRecord, event: IntentEvent): void {
  if (event.kind === 'transitioned') {
    assertTransition(current.state, event.to);
  }
}

export class InMemoryEventStore implements IntentEventStore {
  private log = new Map<string, IntentEvent[]>();

  async append(id: string, event: IntentEvent): Promise<IntentRecord> {
    const events = this.log.get(id) ?? [];
    guardAppend(replay(id, events), event);
    const nextEvents = [...events, event];
    this.log.set(id, nextEvents);
    return replay(id, nextEvents);
  }

  async load(id: string): Promise<IntentRecord | null> {
    const events = this.log.get(id);
    return events ? replay(id, events) : null;
  }

  async events(id: string): Promise<IntentEvent[]> {
    return [...(this.log.get(id) ?? [])];
  }
}
