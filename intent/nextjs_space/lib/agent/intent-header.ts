/**
 * Phase 10 — the Intent "header" (two-pipeline reconciliation).
 *
 * The legacy `Intent` row is the header (requesterId, INT-XXXXX, audit, history,
 * listing); the event-sourced `IntentEvent`/`SlotValue` log is the body. They
 * bind here: an authed turn creates an Intent row and keys the agent record to
 * its `id`; each turn mirrors the materialized objective/scope onto the header
 * so the sidebar/registry can list it. Server only.
 */

import { prisma } from '../prisma.ts';
import type { RecordView } from './materialize.ts';

async function nextIntentId(): Promise<string> {
  const n = await prisma.intent.count();
  return 'INT-' + String(n + 1).padStart(5, '0');
}

/** Create the header row for a new authed intent; returns the record id (cuid) the event log keys to. */
export async function createIntentHeader(requesterId: string, rawInput: string): Promise<string> {
  const intent = await prisma.intent.create({
    data: { rawInput, requesterId, intentId: await nextIntentId(), status: 'DRAFT' },
  });
  return intent.id;
}

/** A record id belongs to a header row if it isn't an anonymous `INT-xxxx` id. */
export function isHeaderBound(id: string): boolean {
  return !id.startsWith('INT-');
}

/** Mirror the materialized record onto its header row (best-effort) for listing. */
export async function syncIntentHeader(id: string, view: RecordView): Promise<void> {
  const slots = view.record.slots;
  const objective = slots['objective']?.value ?? undefined;
  await prisma.intent.update({
    where: { id },
    data: {
      businessObjective: objective,
      scope: slots['scope']?.value ?? undefined,
      intentType: (view.record.intentType as never) ?? undefined,
      expectedOutcome: objective,
    },
  });
}
