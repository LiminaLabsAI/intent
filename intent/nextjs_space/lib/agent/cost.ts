/**
 * Phase 11 — pre-execution cost advisory (§5.2). PURE.
 *
 * Estimates what the DOWNSTREAM executor would spend running the task — not our
 * refinement, not a bill. `cost = input_tokens × price_in + output_tokens × price_out`,
 * per-tier catalog. Shown as a RANGE + a recommended persona + refine-to-save.
 * Deterministic; the only "guess" is output size (from scope + complexity).
 */

import type { Complexity, CostEstimate, IntentRecord } from './types.ts';

interface Tier { name: string; priceIn: number; priceOut: number } // USD per 1M tokens
const CATALOG: Record<string, Tier> = {
  cheap: { name: 'cheap', priceIn: 0.1, priceOut: 0.3 },
  mid: { name: 'mid', priceIn: 1.0, priceOut: 3.0 },
  frontier: { name: 'frontier', priceIn: 3.0, priceOut: 15.0 },
};

interface Persona { name: string; tier: string; temperature: number; retrieval: boolean }
export const PERSONAS: Record<string, Persona> = {
  fast: { name: 'fast', tier: 'cheap', temperature: 0.2, retrieval: false },
  balanced: { name: 'balanced', tier: 'mid', temperature: 0.4, retrieval: false },
  thorough: { name: 'thorough', tier: 'frontier', temperature: 0.5, retrieval: true },
};

/** Approx tokens of the working memory the executor reads (~chars/4). */
export function countInputTokens(record: IntentRecord): number {
  let chars = record.rawInput.length;
  for (const s of Object.values(record.slots)) chars += (s.value ?? '').length + s.key.length;
  return Math.ceil(chars / 4);
}

/** Estimate the executor's output size from complexity + scope breadth. */
export function estimateOutputTokens(record: IntentRecord): number {
  const base: Record<Complexity, number> = { trivial: 1200, moderate: 5000, complex: 18000 };
  const c: Complexity = record.complexity ?? 'moderate';
  const scopeLen = (record.slots['scope']?.value ?? '').length;
  return Math.round(base[c] + Math.min(scopeLen * 8, 6000));
}

/** The right-sized persona for this intent (Flow suggests; the executor runs). */
export function recommendPersona(record: IntentRecord): string {
  const c: Complexity = record.complexity ?? 'moderate';
  const r = record.risk ?? 'medium';
  if (c === 'complex' || r === 'high') return 'thorough';
  if (c === 'trivial' && r === 'low') return 'fast';
  return 'balanced';
}

function costUsd(inTok: number, outTok: number, tier: Tier): number {
  return (inTok * tier.priceIn + outTok * tier.priceOut) / 1e6;
}
function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** A cost BAND for a persona (± output uncertainty) + refine-to-save vs frontier. */
export function estimateCost(record: IntentRecord, personaName: string = recommendPersona(record)): CostEstimate {
  const persona = PERSONAS[personaName] ?? PERSONAS.balanced;
  const tier = CATALOG[persona.tier];
  const inTok = countInputTokens(record);
  const outTok = estimateOutputTokens(record);
  const mid = costUsd(inTok, outTok, tier);
  const frontierMid = costUsd(inTok, outTok, CATALOG.frontier);
  const refineToSave = Math.max(0, frontierMid - mid);
  return {
    low: round(mid * 0.6),
    high: round(mid * 1.6),
    currency: 'USD',
    persona: persona.name,
    assumptions: [
      `output ~${outTok.toLocaleString()} tok, estimated from scope + complexity (${record.complexity ?? 'moderate'})`,
      `${tier.name} tier: $${tier.priceIn}/$${tier.priceOut} per 1M in/out`,
      'a directional range, not a bill',
    ],
    refineToSave: refineToSave > 0.0005 ? round(refineToSave) : undefined,
  };
}
