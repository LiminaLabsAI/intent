/**
 * ADR-0001 — the MEASUREMENT layer (dynamic, per intent).
 *
 * Turns a record into the `Measurements` the pure cost function consumes:
 * serialize the working memory → count its tokens → carry intentType/complexity/
 * risk for the reference-class lookup and persona pick. Kept separate from the
 * math so input_tokens can improve (real per-model tokenizer) without touching
 * `cost.ts`. Tokenizer is pluggable by id; today only the 'approx' impl exists
 * (real per-model tokenizers are deferred — ADR-0001).
 */

import type { IntentRecord } from './types.ts';
import type { Measurements } from './cost.ts';

/**
 * The working memory a downstream executor would read = the raw intent + every
 * filled slot. This is the same source §5.1 exports; here we only need its size.
 */
export function buildWorkingMemory(record: IntentRecord): string {
  const lines: string[] = [];
  if (record.rawInput) lines.push(record.rawInput);
  for (const [key, slot] of Object.entries(record.slots)) {
    if (slot.value) lines.push(`${key}: ${slot.value}`);
  }
  return lines.join('\n');
}

const TOKENIZERS: Record<string, (text: string) => number> = {
  // ~4 chars/token — a coarse but stable approximation across models.
  approx: (text) => Math.ceil(text.length / 4),
};

export function tokenize(text: string, tokenizerId: string): number {
  const fn = TOKENIZERS[tokenizerId] ?? TOKENIZERS.approx;
  return fn(text);
}

/** Measure a record into the pure function's inputs. `tokenizerId` defaults to 'approx'. */
export function measure(record: IntentRecord, tokenizerId = 'approx'): Measurements {
  return {
    inputTokens: tokenize(buildWorkingMemory(record), tokenizerId),
    intentType: record.intentType,
    complexity: record.complexity ?? 'moderate',
    risk: record.risk ?? 'medium',
  };
}
