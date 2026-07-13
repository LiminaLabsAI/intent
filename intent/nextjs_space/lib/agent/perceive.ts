/**
 * Phase 8 — PERCEIVE (LLM edge, §3.4).
 *
 * One structured LLM call that, given the user's message + current record:
 *  1) classifies the intent type (if not set) → picks the template,
 *  2) extracts concrete slot values the message provides (fold),
 *  3) assesses each touched slot against its rubric (the LLM StrengthJudge).
 * Returns the events to append. Slots not in the schema become emergent slots.
 */

import type { IntentEvent, IntentRecord, IntentType, SlotState } from './types.ts';
import type { LLM } from './llm.ts';
import { resolveSchema } from './schema.ts';

export interface PerceptionOut {
  intentType?: IntentType | null;
  slots?: { key: string; value?: string | null; state?: SlotState; reason?: string }[];
}

function schemaList(type: IntentType | null): string {
  return resolveSchema(type).map((d) => `- ${d.key}: ${d.describe} RUBRIC: ${d.rubric}`).join('\n');
}

function recordSummary(record: IntentRecord): string {
  const lines = [`- intentType: ${record.intentType ?? 'unclassified'}`];
  for (const [k, s] of Object.entries(record.slots)) {
    lines.push(`- ${k}: ${s.value ? `"${s.value}" (${s.state})` : '(empty)'}`);
  }
  return lines.join('\n');
}

function system(type: IntentType | null): string {
  return `You are the PERCEIVE stage of an intent-refinement agent. You do not chat with the user.
Given the user's message and the current intent record you:
1) classify the intent type if not already set,
2) extract concrete values for slots the message provides,
3) assess each touched slot against its rubric.

Intent types: CHANGE (modify an existing system), CREATE (build something new), ANALYZE (investigate/understand), REPORT (produce a document/summary).
Slot states: empty | weak (present but vague) | ambiguous (>1 reasonable reading) | conflicting (contradicts another slot) | strong (meets the rubric).

Slots and rubrics:
${schemaList(type)}

Be a strict judge. Mark a slot 'strong' ONLY when its value is specific, bounded, and unambiguous. A bare restatement of the request (e.g. "migrate auth to OAuth") is 'weak', not 'strong'. When unsure, prefer 'weak' over 'strong'. Only assess slots the message actually informs.

Respond ONLY with JSON:
{"intentType":"CHANGE|CREATE|ANALYZE|REPORT" or null,"slots":[{"key":"<slot key>","value":"<extracted value>","state":"<state>","reason":"<one short reason>"}]}
Only include slots the message actually informs. Never invent values.`;
}

export async function perceive(
  record: IntentRecord,
  message: string,
  llm: LLM,
  opts: { at?: string } = {},
): Promise<IntentEvent[]> {
  const at = opts.at ?? new Date().toISOString();
  const out = await llm.generateStructured<PerceptionOut>(
    system(record.intentType),
    `Current record:\n${recordSummary(record)}\n\nUser message: "${message}"`,
  );

  const events: IntentEvent[] = [];
  if (!record.intentType && out.intentType) {
    events.push({ kind: 'classified', at, by: 'agent', intentType: out.intentType });
  }
  for (const s of out.slots ?? []) {
    if (!s || !s.key) continue;
    if (s.value != null && String(s.value).trim() !== '') {
      events.push({ kind: 'slot_valued', at, by: 'agent', key: s.key, value: String(s.value) });
    }
    if (s.state) {
      events.push({ kind: 'slot_assessed', at, by: 'agent', key: s.key, state: s.state, reason: s.reason });
    }
  }
  return events;
}
