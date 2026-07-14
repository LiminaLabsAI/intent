/**
 * Phase 7 — Materialization (Group 3).
 *
 * Ties the pieces together into the single "record view" that the record-read
 * API returns and that the Phase 8 driver's Perceive step reads: the current
 * record + its readiness assessment + the resolved schema (so a UI knows every
 * slot that *should* exist, not just the ones touched so far).
 *
 * Depends only on the `IntentEventStore` interface — works identically over the
 * in-memory store (tests/dev) or the Prisma adapter (production).
 */

import type { Risk } from './types.ts';
import type { IntentRecord } from './types.ts';
import type { IntentEventStore } from './store.ts';
import type { ReadinessReport } from './strength.ts';
import { assessReadiness } from './strength.ts';
import { resolveSchema, requirednessOf } from './schema.ts';

export interface SlotSummary {
  key: string;
  label: string;
  layer: string;
  requiredness: string;
  describe: string;
}

export interface RecordView {
  record: IntentRecord;
  readiness: ReadinessReport;
  /** Every slot the schema expects for this intent-type, at the given risk. */
  schema: SlotSummary[];
}

export async function materializeRecord(
  store: IntentEventStore,
  id: string,
  riskOverride?: Risk,
): Promise<RecordView | null> {
  const record = await store.load(id);
  if (!record) return null;
  const risk: Risk = riskOverride ?? record.risk ?? 'medium';
  const readiness = assessReadiness(record, risk);
  const schema: SlotSummary[] = resolveSchema(record.intentType).map((d) => ({
    key: d.key,
    label: d.label,
    layer: d.layer,
    requiredness: requirednessOf(d, risk),
    describe: d.describe,
  }));
  return { record, readiness, schema };
}
