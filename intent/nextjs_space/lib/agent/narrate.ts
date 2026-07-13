/**
 * Phase 8 — NARRATE (LLM edge, §3.4 / §3.10).
 *
 * Voices the move(s) DECIDE already chose — humanely, concisely, speaking from
 * the record. It never invents structure and never asks beyond the move targets.
 * The conversation is the narration of a chosen move, not a separate channel.
 */

import type { IntentRecord } from './types.ts';
import type { LLM } from './llm.ts';
import type { Move } from './decide.ts';
import { resolveSchema } from './schema.ts';

const SYSTEM = `You are the NARRATE voice of an intent-refinement agent. Speak to the user in 1–2 short, warm, natural sentences.
Do EXACTLY the move you are given — nothing more. Ask about only the target.
Speak in plain language. NEVER use internal jargon (words like slot, rubric, state, "strong", "weak") and never quote a definition back to the user — turn it into a natural question a colleague would ask.
Move kinds:
- ask: ask one clear, plain question to get the missing information.
- infer_confirm: propose a sharper version and ask them to confirm ("I read this as X — is that right?").
- disambiguate: point out the two possible readings and ask which they mean.
- surface_conflict: name the contradiction between the two items and ask them to choose.
- close: say it's ready, briefly restate the objective, and offer to hand it off.
- governance_stop: gently say it looks outside work scope and offer to flag it for a human.`;

function moveLine(record: IntentRecord, m: Move): string {
  const def = m.slot ? resolveSchema(record.intentType).find((d) => d.key === m.slot) : undefined;
  const about = def ? ` — this concerns: ${def.label} (${def.describe})` : '';
  const current = m.slot ? record.slots[m.slot]?.value ?? '(nothing captured yet)' : '';
  return `- move: ${m.kind}${m.slot ? `, about "${def?.label ?? m.slot}"${about}; what we have so far: ${current}` : ''}`;
}

export async function narrate(record: IntentRecord, moves: Move[], llm: LLM): Promise<string> {
  if (moves.length === 0) return 'Everything I need is captured for now.';
  const user = `Intent type: ${record.intentType ?? 'unclassified'}
Objective: ${record.slots['objective']?.value ?? '(empty)'}
Chosen move(s):
${moves.map((m) => moveLine(record, m)).join('\n')}

Write the reply.`;
  return llm.generateText(SYSTEM, user);
}
