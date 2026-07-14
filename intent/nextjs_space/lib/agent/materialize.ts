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

import type { CostEstimate, Risk } from './types.ts';
import type { IntentRecord } from './types.ts';
import type { IntentEventStore } from './store.ts';
import type { ReadinessReport } from './strength.ts';
import { assessReadiness } from './strength.ts';
import { resolveSchema, requirednessOf } from './schema.ts';
import { advise, personaOptions } from './cost.ts';
import type { PersonaOption } from './cost.ts';
import { measure } from './measure.ts';
import { loadCatalog } from './cost-catalog.ts';
import { personaToRigor } from './cost-config.ts';

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
  /** Pre-execution cost advisory (§5.2) — a directional band, not a bill. */
  cost: CostEstimate;
  /** The selectable modes for the in-conversation picker (§5.2 choice UX). */
  personas: PersonaOption[];
  /** The mode the user has chosen (null until they pick). */
  selectedPersona: string | null;
}

export async function materializeRecord(
  store: IntentEventStore,
  id: string,
  riskOverride?: Risk,
): Promise<RecordView | null> {
  const record = await store.load(id);
  if (!record) return null;
  const risk: Risk = riskOverride ?? record.risk ?? 'medium';
  // Once the user picks a mode, IT drives refinement rigor (overriding auto-risk).
  const rigor: Risk = personaToRigor(record.persona) ?? risk;
  const readiness = assessReadiness(record, rigor);
  const schema: SlotSummary[] = resolveSchema(record.intentType).map((d) => ({
    key: d.key,
    label: d.label,
    layer: d.layer,
    requiredness: requirednessOf(d, rigor),
    describe: d.describe,
  }));
  const catalog = await loadCatalog();
  const m = { ...measure(record), risk };
  // Cost reflects the SELECTED mode if picked, else the recommended one.
  const cost = advise(m, catalog, record.persona ?? undefined);
  const personas = personaOptions(m, catalog);
  return { record, readiness, schema, cost, personas, selectedPersona: record.persona };
}
