/**
 * Phase 8 — PERCEIVE (LLM edge, §3.4).
 *
 * One structured LLM call that, given the user's message + current record:
 *  1) classifies the intent type (if not set) → picks the template,
 *  2) extracts concrete slot values the message provides (fold),
 *  3) assesses each touched slot against its rubric (the LLM StrengthJudge).
 * Returns the events to append. Slots not in the schema become emergent slots.
 */

import type { ChatTurn, Complexity, IntentEvent, IntentRecord, IntentType, Risk, SlotState } from './types.ts';
import type { LLM } from './llm.ts';
import { resolveSchema } from './schema.ts';

export interface PerceptionOut {
  intentType?: IntentType | null;
  risk?: Risk;
  complexity?: Complexity;
  slots?: { key: string; value?: string | null; state?: SlotState; reason?: string; inferred?: boolean }[];
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
  return `You are the PERCEIVE stage of an intent-refinement agent. You do not chat. You turn an intent + context into a structured spec — you do NOT plan or verify the built result.
From the user's message and the current record you:
1) classify the intent type,
2) assess RISK (low|medium|high) and COMPLEXITY (trivial|moderate|complex). A todo CRUD app is low/trivial; a production auth migration is high/complex.
3) INFER the obvious slot values the intent implies, even if unstated. A "todo CRUD web app" obviously has scope "a web app with create/read/update/delete of todos", entities "todos", acceptance "the user can create, read, update, and delete todos". Only omit a slot if it genuinely cannot be inferred.
4) judge each slot's state — adequate FOR THIS INTENT'S RISK, not maximal. A low-risk trivial intent's slot is 'strong' with a clear one-liner; a high-risk change needs a concrete, verifiable value. Do not demand more precision than the risk warrants.

Intent types: CHANGE (modify existing) · CREATE (build new) · ANALYZE (investigate) · REPORT (produce a document).
Slot states: empty | weak (too vague for this risk) | ambiguous (>1 reading) | conflicting (contradicts another slot) | strong (adequate for this risk).

Slots and rubrics:
${schemaList(type)}

You WRITE the acceptance-criteria slot yourself (what the delivered result must do) — never ask the user to describe how it would be tested.

Respond ONLY with JSON:
{"intentType":"CHANGE|CREATE|ANALYZE|REPORT","risk":"low|medium|high","complexity":"trivial|moderate|complex","slots":[{"key":"<key>","value":"<value>","state":"<state>","reason":"<short>"}]}`;
}

const STOP = new Set(['the', 'a', 'an', 'to', 'of', 'and', 'or', 'for', 'with', 'in', 'on', 'is', 'are', 'be', 'can', 'will', 'this', 'that', 'we', 'our', 'need', 'want', 'app', 'system', 'new']);
function contentWords(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 2 && !STOP.has(w));
}
/**
 * DETERMINISTIC provenance (the vision's core principle): a value is "inferred"
 * when the agent supplied it, not the user. We don't trust the model's self-report
 * (small models omit it) — we derive it: if fewer than half the value's content
 * words appear in everything the user has actually said, the agent inferred it.
 */
function isInferred(value: string, userText: string): boolean {
  const vw = contentWords(value);
  if (vw.length === 0) return false;
  const said = new Set(contentWords(userText));
  const overlap = vw.filter((w) => said.has(w)).length / vw.length;
  // Badge only clear agent inventions: a value whose content is mostly NEW
  // (few of its words trace to anything the user said). A lightly-reworded
  // restatement of the user's own ask stays "stated", not "inferred".
  return overlap < 0.25;
}

export async function perceive(
  record: IntentRecord,
  message: string,
  llm: LLM,
  opts: { at?: string; history?: ChatTurn[] } = {},
): Promise<IntentEvent[]> {
  const at = opts.at ?? new Date().toISOString();
  const convo = (opts.history ?? [])
    .slice(-6)
    .map((t) => `${t.role === 'agent' ? 'Agent' : 'User'}: ${t.content}`)
    .join('\n');
  // Everything the user has actually stated — the basis for provenance.
  const userSaid = [record.rawInput, ...(opts.history ?? []).filter((t) => t.role === 'user').map((t) => t.content), message].join(' ');
  const out = await llm.generateStructured<PerceptionOut>(
    system(record.intentType),
    `Current record:\n${recordSummary(record)}\n\n` +
      (convo ? `Recent conversation:\n${convo}\n\n` : '') +
      `User's latest message: "${message}"\n\n` +
      `The latest message is usually the answer to the agent's last question — read it in that light and fold it into the right slot even if it is short or informal.`,
  );

  const events: IntentEvent[] = [];
  if (!record.intentType && out.intentType) {
    events.push({ kind: 'classified', at, by: 'agent', intentType: out.intentType });
  }
  if (out.risk && out.complexity &&
      (record.complexity === null || out.risk !== record.risk || out.complexity !== record.complexity)) {
    events.push({ kind: 'sized', at, by: 'agent', risk: out.risk, complexity: out.complexity });
  }
  for (const s of out.slots ?? []) {
    if (!s || !s.key) continue;
    if (s.value != null && String(s.value).trim() !== '') {
      const value = String(s.value);
      // Provenance is DETERMINISTIC, not the LLM's self-report (small models flag
      // nothing or everything). Derived purely from whether the value's words
      // trace to what the user actually said — a deterministic rail (§ core principle).
      const inferred = isInferred(value, userSaid);
      events.push({ kind: 'slot_valued', at, by: 'agent', key: s.key, value, inferred });
    }
    if (s.state) {
      events.push({ kind: 'slot_assessed', at, by: 'agent', key: s.key, state: s.state, reason: s.reason });
    }
  }
  return events;
}
