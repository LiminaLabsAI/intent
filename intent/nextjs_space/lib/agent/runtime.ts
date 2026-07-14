/**
 * Phase 9 — agent runtime (server).
 *
 * getStore() returns the persistence-backed store: PrismaEventStore when
 * DATABASE_URL is set (intents persist to Postgres), otherwise the in-memory
 * store. The resolved store is cached on globalThis so it survives dev HMR and
 * is shared across requests.
 */

import { defaultStore } from './store-prisma.ts';
import { HfLLM } from './llm.ts';
import type { IntentEventStore } from './store.ts';
import type { LLM } from './llm.ts';

const g = globalThis as unknown as { __agentStorePromise?: Promise<IntentEventStore> };

export function getStore(): Promise<IntentEventStore> {
  if (!g.__agentStorePromise) g.__agentStorePromise = defaultStore();
  return g.__agentStorePromise;
}

export function getLLM(): LLM {
  return new HfLLM();
}
