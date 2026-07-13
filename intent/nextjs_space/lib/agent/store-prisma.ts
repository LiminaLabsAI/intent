/**
 * Phase 7 — Prisma-backed event store (persistence adapter). DB-GATED.
 *
 * Implements the same IntentEventStore interface as InMemoryEventStore, over the
 * IntentEvent table. The pure core never changes — only the store swaps. Requires
 * DATABASE_URL + a migrated Postgres database. The deterministic logic (replay,
 * guards) lives in events.ts / store.ts and is covered by their tests; this file
 * is the thin I/O shell, verified end-to-end once a database is available.
 */

import type { IntentEvent, IntentRecord } from './types.ts';
import type { IntentEventStore } from './store.ts';
import { guardAppend } from './store.ts';
import { replay } from './events.ts';
import { prisma } from '../prisma.ts';

function rowsToEvents(rows: { payload: unknown }[]): IntentEvent[] {
  return rows.map((r) => r.payload as IntentEvent);
}

export class PrismaEventStore implements IntentEventStore {
  async append(id: string, event: IntentEvent): Promise<IntentRecord> {
    return prisma.$transaction(async (tx) => {
      const rows = await tx.intentEvent.findMany({
        where: { intentId: id },
        orderBy: { seq: 'asc' },
      });
      const events = rowsToEvents(rows);
      guardAppend(replay(id, events), event); // enforce lifecycle invariants
      await tx.intentEvent.create({
        data: {
          intentId: id,
          seq: rows.length,
          kind: event.kind,
          payload: event as unknown as object,
          actor: event.by,
        },
      });
      return replay(id, [...events, event]);
    });
  }

  async load(id: string): Promise<IntentRecord | null> {
    const rows = await prisma.intentEvent.findMany({
      where: { intentId: id },
      orderBy: { seq: 'asc' },
    });
    if (rows.length === 0) return null;
    return replay(id, rowsToEvents(rows));
  }

  async events(id: string): Promise<IntentEvent[]> {
    const rows = await prisma.intentEvent.findMany({
      where: { intentId: id },
      orderBy: { seq: 'asc' },
    });
    return rowsToEvents(rows);
  }
}

/**
 * Store factory: Prisma when a database is configured, in-memory otherwise
 * (dev / test). Lets the record-read API and the Phase 8 driver depend on the
 * interface, not the backend.
 */
export async function defaultStore(): Promise<IntentEventStore> {
  if (process.env.DATABASE_URL) return new PrismaEventStore();
  const { InMemoryEventStore } = await import('./store.ts');
  return new InMemoryEventStore();
}
