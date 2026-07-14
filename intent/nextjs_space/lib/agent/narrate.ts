/**
 * Phase 8 — NARRATE (LLM edge, §3.4 / §3.10).
 *
 * Voices the move(s) DECIDE already chose — humanely, concisely, speaking from
 * the record. It never invents structure and never asks beyond the move targets.
 * The conversation is the narration of a chosen move, not a separate channel.
 */

import type { ChatTurn, IntentRecord } from './types.ts';
import type { LLM } from './llm.ts';
import type { Move } from './decide.ts';
import { resolveSchema } from './schema.ts';

const SYSTEM = `You are the NARRATE voice of an intent-refinement agent. Speak to the user warmly and naturally.
You are given the set of moves the agent has decided on — voice them as ONE message. NEVER drip one question per turn when several gaps are open.
Plain language only. NEVER use internal jargon (words like slot, rubric, state, "strong", "weak") and never quote a definition back to the user — turn it into a natural question a colleague would ask.

When SEVERAL gaps are open (a batch of ask/disambiguate/surface_conflict moves):
- Open by briefly acknowledging what's already captured — name a couple of the things we have (and, if some were inferred, say you filled them in and they can correct you) — so the user sees progress.
- Then ask for EVERYTHING still missing in ONE compact bundle — a short bulleted list or a single grouped sentence — so the user can answer it all at once. Do NOT save questions for later turns.
- If only ONE thing is missing, just ask that one thing plainly.

Single moves:
- ask: ask plainly for the missing information; if we have a vague value, ask for the concrete specifics (use the internal guidance to know what's missing, but never quote it) — don't just restate their words for a yes/no.
- infer_confirm: propose a sharper version and ask them to confirm ("I read this as X — is that right?").
- disambiguate: point out the two possible readings and ask which they mean.
- surface_conflict: name the contradiction and ask them to choose.
- close: say it's ready, briefly restate the objective, and offer to hand it off.
- handoff_complete: the intent is finalized and handed off to the team/executor. Confirm it warmly in one line and STOP — do not ask anything further, do not re-list slots, do not re-offer.
- governance_stop: gently say it looks outside work scope and offer to flag it for a human.`;

function moveLine(record: IntentRecord, m: Move): string {
  if (!m.slot) return `- move: ${m.kind}`;
  const def = resolveSchema(record.intentType).find((d) => d.key === m.slot);
  const slot = record.slots[m.slot];
  const current = slot?.value ? `"${slot.value}"` : '(nothing captured yet)';
  const vague = slot?.state === 'weak' ? ' — we have something but it is too vague; ask for the concrete specifics that are missing.' : '';
  const guide = def ? ` [internal guidance, NEVER quote to the user: a complete answer is ${def.rubric}]` : '';
  return `- move: ${m.kind}, about "${def?.label ?? m.slot}" (${def?.describe}); so far: ${current}${vague}${guide}`;
}

export async function narrate(
  record: IntentRecord,
  moves: Move[],
  llm: LLM,
  opts: { history?: ChatTurn[] } = {},
): Promise<string> {
  if (moves.length === 0) return 'Everything I need is captured for now.';
  const convo = (opts.history ?? [])
    .slice(-6)
    .map((t) => `${t.role === 'agent' ? 'You' : 'User'}: ${t.content}`)
    .join('\n');

  // What's already captured — so NARRATE can acknowledge progress before asking
  // the batch. Inferred values are flagged so it can invite a correction.
  const schema = resolveSchema(record.intentType);
  const labelOf = (key: string) => schema.find((d) => d.key === key)?.label ?? key;
  const captured = Object.values(record.slots)
    .filter((s) => s.state === 'strong' && s.value)
    .map((s) => `${labelOf(s.key)}${s.inferred ? ' (inferred — user can correct)' : ''}`);
  const isBatch = moves.length > 1;

  const user =
    (convo ? `Recent conversation (most recent last):\n${convo}\n\n` : '') +
    `Intent type: ${record.intentType ?? 'unclassified'}\n` +
    `Objective so far: ${record.slots['objective']?.value ?? '(empty)'}\n` +
    (captured.length ? `Already captured: ${captured.join('; ')}\n` : '') +
    `Your move${isBatch ? 's (voice them together in ONE message)' : ''} now:\n${moves.map((m) => moveLine(record, m)).join('\n')}\n\n` +
    (isBatch
      ? `Write ONE reply that: (1) briefly acknowledges what's already captured (mention inferred items so they can correct you), then (2) asks for ALL the missing items above together — a short bulleted list is ideal. Do not defer any of them to a later turn.`
      : `Write the reply. If the user just gave new information, open with a few words that reflect THEIR actual words back (never a canned phrase, never the same opener twice) — then do your move as one short question. If you have asked about this before, rephrase it and add a concrete example; never repeat a question word-for-word. If they gave nothing new, skip the acknowledgment.`);
  return llm.generateText(SYSTEM, user);
}
