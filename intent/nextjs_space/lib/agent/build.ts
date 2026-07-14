/**
 * Phase 12 — the BUILD RUN (ADR-0002).
 *
 * One analysis pass that materializes the final working memory from the clarified
 * record and captures the model's ACTUAL token usage → actual cost (vs the
 * pre-build estimate). This is "one run": the user approves at 🟢, we compose the
 * polished, low-assumption slots, mark them strong, and stamp the measured cost.
 * Server/script only (loads the cost catalog).
 */

import type { IntentEventStore } from './store.ts';
import type { LLM } from './llm.ts';
import type { IntentEvent, IntentRecord, SlotState } from './types.ts';
import { resolveSchema } from './schema.ts';
import { loadCatalog } from './cost-catalog.ts';
import { recommendPersona } from './cost.ts';

interface BuildOut {
  slots?: { key: string; value?: string | null }[];
}

function schemaList(intentType: IntentRecord['intentType']): string {
  return resolveSchema(intentType).map((d) => `- ${d.key}: ${d.describe}`).join('\n');
}
function recordSummary(record: IntentRecord): string {
  const lines: string[] = [`intent: ${record.rawInput}`, `type: ${record.intentType ?? 'unclassified'}`];
  for (const [k, s] of Object.entries(record.slots)) if (s.value) lines.push(`- ${k}: ${s.value}`);
  return lines.join('\n');
}

function system(intentType: IntentRecord['intentType']): string {
  return `You are the BUILD stage of an intent-refinement agent. The clarification is done; compose the FINAL working memory.
Produce polished, complete, LOW-ASSUMPTION values for each slot below — fold in everything gathered during clarification, resolve any vagueness, and state assumptions explicitly rather than leaving them implicit.
Do NOT ask questions; this is the build. Output ONLY JSON:
{"slots":[{"key":"<key>","value":"<final value>"}]}

Slots:
${schemaList(intentType)}`;
}

/**
 * Run the build. Emits `slot_valued`/`slot_assessed(strong)` for each composed
 * slot, then a `built` event carrying the measured actual cost. Idempotent: a
 * record that's already built is returned unchanged.
 */
export async function runBuild(
  store: IntentEventStore,
  id: string,
  llm: LLM,
  opts: { at?: string; by?: string } = {},
): Promise<IntentRecord> {
  const at = opts.at ?? new Date().toISOString();
  const by = opts.by ?? 'agent';
  let record = await store.load(id);
  if (!record) throw new Error(`no record for ${id}`);
  if (record.built) return record;

  const { data: out, usage } = await llm.generateStructuredWithUsage<BuildOut>(
    system(record.intentType),
    `Compose the final working memory from this record:\n${recordSummary(record)}`,
  );

  const events: IntentEvent[] = [];
  const strong: SlotState = 'strong';
  for (const s of out.slots ?? []) {
    if (!s || !s.key || s.value == null || String(s.value).trim() === '') continue;
    events.push({ kind: 'slot_valued', at, by, key: s.key, value: String(s.value), inferred: false });
    events.push({ kind: 'slot_assessed', at, by, key: s.key, state: strong });
  }

  // Actual cost = measured usage × the selected persona's model price (ADR-0002).
  const catalog = await loadCatalog();
  const personaName = record.persona ?? recommendPersona(record.risk ?? 'medium', record.complexity ?? 'moderate', catalog.personas).name;
  const persona = catalog.personas.find((p) => p.name === personaName) ?? catalog.personas[0];
  const model = catalog.models.find((m) => m.id === persona?.modelRef) ?? catalog.models[0];
  const actualCost = model
    ? Math.round(((usage.inputTokens * model.priceIn + usage.outputTokens * model.priceOut) / 1e6) * 100000) / 100000
    : 0;
  events.push({ kind: 'built', at, by, actualCost, currency: 'USD' });

  for (const e of events) record = await store.append(id, e);
  return record;
}
