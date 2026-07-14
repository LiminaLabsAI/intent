/**
 * Phase 13 (ADR-0002 amendment) — the BUILD RUN.
 *
 * One analysis pass that writes the DELIVERABLE for the intent — 1+ OKF markdown
 * files named by the chosen outcome (plan / diagram / script / doc) — and stamps
 * the model's ACTUAL token usage → actual cost (vs the pre-build estimate). The
 * Understanding fields are already filled live during clarify; this produces the
 * files. Idempotent. Server/script only (loads the cost catalog).
 */

import type { IntentEventStore } from './store.ts';
import type { LLM } from './llm.ts';
import type { IntentEvent, IntentRecord, PlanFile } from './types.ts';
import { renderOkf } from './okf.ts';
import { loadCatalog } from './cost-catalog.ts';
import { recommendPersona } from './cost.ts';

interface BuildOut {
  files?: { name?: string; format?: string; body?: string }[];
}

function recordSummary(record: IntentRecord): string {
  const lines: string[] = [`intent: ${record.rawInput}`, `type: ${record.intentType ?? 'unclassified'}`, `desired outcome: ${record.outcome ?? 'plan'}`];
  for (const [k, s] of Object.entries(record.slots)) if (s.value) lines.push(`- ${k}: ${s.value}`);
  return lines.join('\n');
}

function system(outcome: string): string {
  return `You are the BUILD stage of an intent studio. Produce the DELIVERABLE for this intent as the outcome type "${outcome}".
Output ONLY JSON: {"files":[{"name":"<name>.md","format":"plan|diagram|script|doc","body":"<markdown>"}]}
- Name each file by the outcome: plan.md, diagram.md, script.md, doc.md. Produce ONE file, or MORE when the scenario genuinely needs it (e.g. an app plan → plan.md + data-model.md), each named accordingly.
- body is markdown. For a diagram → a \`\`\`mermaid code block. For a script → a fenced code block. For a plan/doc → clear structured sections.
- Ground everything strictly in the record below; do NOT invent requirements. This is for any domain, not only software.`;
}

const OUTCOME_TITLE: Record<string, string> = {
  plan: 'Execution plan', diagram: 'Diagram', script: 'Script', doc: 'Document',
};

/**
 * Run the build. Composes 1+ OKF files from the record + outcome, then emits a
 * `plan_built` event carrying the files + measured actual cost. Idempotent.
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

  const outcome = record.outcome ?? 'plan';
  const { data: out, usage } = await llm.generateStructuredWithUsage<BuildOut>(system(outcome), recordSummary(record));

  const files: PlanFile[] = (out.files ?? [])
    .filter((f) => f && f.name && f.body && String(f.body).trim() !== '')
    .map((f) => {
      const format = String(f.format ?? outcome);
      return {
        name: String(f.name),
        format,
        content: renderOkf({
          id: `${id}:${f.name}`,
          type: format,
          title: OUTCOME_TITLE[format] ?? 'Deliverable',
          version: '1.0.0',
          created: at,
          body: String(f.body),
        }),
      };
    });

  // Actual cost = measured usage × the selected persona's model price (ADR-0002).
  const catalog = await loadCatalog();
  const personaName = record.persona ?? recommendPersona(record.risk ?? 'medium', record.complexity ?? 'moderate', catalog.personas).name;
  const persona = catalog.personas.find((p) => p.name === personaName) ?? catalog.personas[0];
  const model = catalog.models.find((m) => m.id === persona?.modelRef) ?? catalog.models[0];
  const actualCost = model
    ? Math.round(((usage.inputTokens * model.priceIn + usage.outputTokens * model.priceOut) / 1e6) * 100000) / 100000
    : 0;

  const events: IntentEvent[] = [{ kind: 'plan_built', at, by, files, actualCost, currency: 'USD' }];
  for (const e of events) record = await store.append(id, e);
  return record;
}
