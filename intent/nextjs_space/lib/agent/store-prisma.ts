/**
 * Phase 7/9 — Prisma-backed event store (persistence adapter).
 *
 * Implements the same IntentEventStore interface as InMemoryEventStore, over the
 * IntentEvent table. The pure core never changes — only the store swaps.
 *
 * Wrapped in withRetry to survive Neon serverless cold starts: the direct
 * endpoint auto-suspends after inactivity and the first query fails (~1-3s)
 * while the DB wakes. We retry transient connection errors instead of erroring.
 */

import type { IntentEvent, IntentRecord } from './types.ts';
import type { IntentEventStore } from './store.ts';
import { guardAppend } from './store.ts';
import { replay } from './events.ts';
import { prisma } from '../prisma.ts';

function rowsToEvents(rows: { payload: unknown }[]): IntentEvent[] {
  return rows.map((r) => r.payload as IntentEvent);
}

/** Retry transient connection failures — notably Neon serverless cold starts. */
async function withRetry<T>(fn: () => Promise<T>, tries = 5, delayMs = 1000): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      const transient = /can't reach database|P1001|P1017|ECONNREFUSED|ETIMEDOUT|timed out|connection/i.test(msg);
      if (!transient || i === tries - 1) throw e;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

export class PrismaEventStore implements IntentEventStore {
  async append(id: string, event: IntentEvent): Promise<IntentRecord> {
    return withRetry(() =>
      prisma.$transaction(async (tx) => {
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
      }),
    );
  }

  async load(id: string): Promise<IntentRecord | null> {
    const rows = await withRetry(() =>
      prisma.intentEvent.findMany({ where: { intentId: id }, orderBy: { seq: 'asc' } }),
    );
    if (rows.length === 0) return null;
    return replay(id, rowsToEvents(rows));
  }

  async events(id: string): Promise<IntentEvent[]> {
    const rows = await withRetry(() =>
      prisma.intentEvent.findMany({ where: { intentId: id }, orderBy: { seq: 'asc' } }),
    );
    return rowsToEvents(rows);
  }
}

/**
 * Store factory: Prisma when a database is configured, in-memory otherwise.
 */
export async function defaultStore(): Promise<IntentEventStore> {
  if (process.env.DATABASE_URL) return new PrismaEventStore();
  const { InMemoryEventStore } = await import('./store.ts');
  return new InMemoryEventStore();
}
