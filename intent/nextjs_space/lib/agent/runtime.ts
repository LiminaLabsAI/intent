/**
 * Phase 9 — agent runtime (server).
 *
 * A process-singleton store (globalThis-cached to survive dev HMR) so intents
 * persist across requests within the dev server. `defaultStore()` (Phase 7)
 * already swaps to the Prisma adapter when DATABASE_URL is set — this keeps the
 * in-memory store for the no-DB demo but stays swap-ready.
 */

import { InMemoryEventStore } from './store.ts';
import { HfLLM } from './llm.ts';
import type { IntentEventStore } from './store.ts';
import type { LLM } from './llm.ts';

const g = globalThis as unknown as { __agentStore?: IntentEventStore };
export const agentStore: IntentEventStore =
  g.__agentStore ?? (g.__agentStore = new InMemoryEventStore());

export function getLLM(): LLM {
  return new HfLLM();
}
