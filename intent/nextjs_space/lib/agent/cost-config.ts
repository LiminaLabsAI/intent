/**
 * ADR-0001 — the CONFIG layer for the cost estimator.
 *
 * Every volatile, model/provider-dependent variable lives here as DATA, never
 * hardcoded in the math. This file is the versioned DEFAULT catalog: it seeds
 * the DB (source of truth) and is the in-code fallback when the DB is empty.
 * The pure cost function receives these values as arguments — it never reads
 * them itself (that keeps it deterministic + testable). See `cost.ts`.
 */

import type { Complexity, Risk } from './types.ts';

/** A model + its provider-dependent cost variables. Editable per provider re-price. */
export interface CostModel {
  id: string;                 // 'deepseek-v4-flash'
  name: string;
  provider: string;           // 'deepinfra'
  priceIn: number;            // USD per 1M input tokens
  priceOut: number;           // USD per 1M output tokens
  contextWindow: number;      // tokens — overflow trigger
  maxOutput: number;          // tokens — caps the output estimate
  tokenizerId: string;        // which tokenizer the measurement layer uses
  cacheDiscount: number;      // 0..1 fraction off cached input
  reasoningMultiplier: number;// baseline output factor for reasoning models (1 = none)
  updatedAt: string;          // ISO — staleness of the price
  sourceNote: string;         // where the numbers came from (honesty about staleness)
}

export type PromptStyle = 'terse' | 'standard' | 'verbose';
export type RetrievalStrategy = 'none' | 'rag';
export type ReasoningDepth = 'low' | 'medium' | 'high';

/** A persona = a pre-set bundle bound to a model. Backgrounded from users (ADR-0001). */
export interface Persona {
  id: string;
  name: string;               // slug: 'quick' | 'balanced' | 'deep'
  label: string;              // display: 'Quick' | 'Balanced' | 'Deep-dive'
  modelRef: string;           // → CostModel.id
  temperature: number;        // RECOMMENDATION only — never enters the cost math
  reasoningDepth: ReasoningDepth; // scales output (× reasoning multiplier)
  promptStyle: PromptStyle;   // output multiplier + system overhead
  retrieval: RetrievalStrategy;   // adds retrieved input tokens
  budgetCeiling: number | null;   // USD cap for the budget auto-pick
  visibleToUser: boolean;
}

/** A reference class (artifact-kind × complexity) → an output-token prior band. */
export interface EstimationPrior {
  refClass: string;           // `${kind}:${complexity}`
  outLow: number;             // output tokens, low
  outHigh: number;            // output tokens, high
  sampleSize: number;         // 0 = seeded prior; grows as calibration feeds it
  updatedAt: string;
}

/** What the downstream executor produces — derived from intent type. */
export type DeliverableKind = 'code' | 'analysis' | 'report' | 'document';

const SEED_AT = '2026-07-14T00:00:00.000Z';

/**
 * DEFAULT catalog. One model (the current DeepSeek deployment) backing three
 * personas that differ only by SETTINGS (temperature · reasoning depth · style)
 * — exactly the "one model, many configurations" case. Prices are seed
 * placeholders flagged for verification; they are DATA and meant to be edited.
 */
export const DEFAULT_MODELS: CostModel[] = [
  {
    id: 'deepseek-v4-flash',
    name: 'DeepSeek V4 Flash',
    provider: 'deepinfra',
    priceIn: 0.1,
    priceOut: 0.2,
    contextWindow: 1000000,
    maxOutput: 8192,
    tokenizerId: 'approx',
    cacheDiscount: 0.8, // cached input $0.02 vs $0.10 → 80% off
    reasoningMultiplier: 1,
    updatedAt: SEED_AT,
    sourceNote: 'DeepInfra deepseek-ai/DeepSeek-V4-Flash — $0.10 in / $0.20 out per 1M, cached $0.02, 1M ctx (verified 2026-07-15)',
  },
];

export const DEFAULT_PERSONAS: Persona[] = [
  { id: 'quick', name: 'quick', label: 'Quick', modelRef: 'deepseek-v4-flash', temperature: 0.2, reasoningDepth: 'low', promptStyle: 'terse', retrieval: 'none', budgetCeiling: null, visibleToUser: false },
  { id: 'balanced', name: 'balanced', label: 'Balanced', modelRef: 'deepseek-v4-flash', temperature: 0.4, reasoningDepth: 'medium', promptStyle: 'standard', retrieval: 'none', budgetCeiling: null, visibleToUser: false },
  { id: 'deep', name: 'deep', label: 'Deep-dive', modelRef: 'deepseek-v4-flash', temperature: 0.6, reasoningDepth: 'high', promptStyle: 'verbose', retrieval: 'none', budgetCeiling: null, visibleToUser: false },
];

/** Reference-class priors, keyed `${DeliverableKind}:${Complexity}`. sampleSize 0 = prior, not yet calibrated. */
function prior(refClass: string, outLow: number, outHigh: number): EstimationPrior {
  return { refClass, outLow, outHigh, sampleSize: 0, updatedAt: SEED_AT };
}
export const DEFAULT_PRIORS: EstimationPrior[] = [
  prior('code:trivial', 800, 2500),
  prior('code:moderate', 3000, 9000),
  prior('code:complex', 10000, 30000),
  prior('analysis:trivial', 600, 1800),
  prior('analysis:moderate', 2500, 7000),
  prior('analysis:complex', 8000, 22000),
  prior('report:trivial', 900, 2600),
  prior('report:moderate', 3000, 9000),
  prior('report:complex', 10000, 26000),
  prior('document:trivial', 900, 2600),
  prior('document:moderate', 3000, 9000),
  prior('document:complex', 10000, 26000),
];

/** Fallback band when a refClass has no prior — deliberately wide (honest about ignorance). */
export const FALLBACK_PRIOR: EstimationPrior = { refClass: 'fallback', outLow: 1000, outHigh: 12000, sampleSize: 0, updatedAt: SEED_AT };

/** Persona-setting → output multipliers. Modeling heuristics (calibratable), not market prices. */
export const REASONING_FACTOR: Record<ReasoningDepth, number> = { low: 1.0, medium: 1.4, high: 2.2 };
export const STYLE_FACTOR: Record<PromptStyle, number> = { terse: 0.8, standard: 1.0, verbose: 1.35 };
/** Extra input tokens a retrieval strategy injects (retrieved context). */
export const RETRIEVAL_INPUT_TOKENS: Record<RetrievalStrategy, number> = { none: 0, rag: 4000 };

/** The default bundle — used as the in-code fallback when the DB has no config. */
export function defaultCatalog(): { models: CostModel[]; personas: Persona[]; priors: EstimationPrior[] } {
  return { models: DEFAULT_MODELS, personas: DEFAULT_PERSONAS, priors: DEFAULT_PRIORS };
}

/**
 * A chosen persona sets the REFINEMENT RIGOR (how hard the readiness bar is),
 * mapped onto the risk-weighted requiredness matrix: fast = light, thorough =
 * full. This is what lets the user's mode choice drive how deeply the agent
 * refines — overriding the auto-assessed risk once they pick.
 */
export function personaToRigor(persona: string | null): Risk | null {
  switch (persona) {
    case 'quick': return 'low';
    case 'balanced': return 'medium';
    case 'deep': return 'high';
    default: return null;
  }
}

/** Map an intent type to the executor's deliverable kind (for the reference class). */
export function deliverableKind(intentType: string | null): DeliverableKind {
  switch (intentType) {
    case 'ANALYZE': return 'analysis';
    case 'REPORT': return 'report';
    case 'CREATE':
    case 'CHANGE':
    default: return 'code';
  }
}

export function refClassOf(intentType: string | null, complexity: Complexity): string {
  return `${deliverableKind(intentType)}:${complexity}`;
}
