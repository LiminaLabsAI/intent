/**
 * ADR-0001 — the PURE cost function. Deterministic; no I/O.
 *
 * `cost = input_tokens × price_in + output_tokens × price_out` (§5.2), where:
 *   - input_tokens are MEASURED (the measurement layer) and passed in,
 *   - output_tokens are a REFERENCE-CLASS band (prior for the intent's
 *     artifact×complexity bucket) scaled by the persona's settings,
 *   - all prices/limits come from the CostModel config passed in.
 *
 * Config is an ARGUMENT — this function never reads the catalog or the DB, so
 * it stays a deterministic rail (node --test friendly). Output uncertainty is
 * surfaced as a BAND (never a false-precise point), its width driven by the
 * reference class's own variance.
 */

import type { Complexity, CostEstimate, Risk } from './types.ts';
import type { CostModel, EstimationPrior, Persona } from './cost-config.ts';
import {
  FALLBACK_PRIOR, REASONING_FACTOR, RETRIEVAL_INPUT_TOKENS, STYLE_FACTOR, refClassOf,
} from './cost-config.ts';

/** What the measurement layer produces from a record. */
export interface Measurements {
  inputTokens: number;      // measured tokens of the serialized working memory
  intentType: string | null;
  complexity: Complexity;
  risk: Risk;
}

/** Everything the pure function needs — config flows IN, never queried. */
export interface CostInputs {
  measurements: Measurements;
  model: CostModel;
  persona: Persona;
  priors: EstimationPrior[];
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function lookupPrior(priors: EstimationPrior[], refClass: string): EstimationPrior {
  return priors.find((p) => p.refClass === refClass) ?? FALLBACK_PRIOR;
}

/** Estimate one persona's downstream execution cost as a band. PURE. */
export function estimateCost(inputs: CostInputs): CostEstimate {
  const { measurements: m, model, persona, priors } = inputs;

  // INPUT — measured working memory + retrieval-injected context, less caching.
  const rawIn = m.inputTokens + RETRIEVAL_INPUT_TOKENS[persona.retrieval];
  const billableIn = rawIn * (1 - model.cacheDiscount);

  // OUTPUT — the reference-class band × persona settings. NOT capped at
  // max_output: that limits a single response, not the task's total output
  // (a large deliverable is produced over multiple calls); capping would
  // underestimate big tasks and collapse the band.
  const bucket = lookupPrior(priors, refClassOf(m.intentType, m.complexity));
  const settingMult =
    REASONING_FACTOR[persona.reasoningDepth] * STYLE_FACTOR[persona.promptStyle] * model.reasoningMultiplier;
  const outLow = bucket.outLow * settingMult;
  const outHigh = bucket.outHigh * settingMult;

  // COST band — width comes from the OUTPUT reference-class variance (the honest part).
  const costLow = (billableIn * model.priceIn + outLow * model.priceOut) / 1e6;
  const costHigh = (billableIn * model.priceIn + outHigh * model.priceOut) / 1e6;

  const staleDays = daysSince(model.updatedAt);
  return {
    low: round(costLow),
    high: round(costHigh),
    currency: 'USD',
    persona: persona.name,
    overflow: rawIn > model.contextWindow,
    assumptions: [
      `output ~${Math.round(outLow).toLocaleString()}–${Math.round(outHigh).toLocaleString()} tok, reference class ${refClassOf(m.intentType, m.complexity)}${bucket.sampleSize > 0 ? ` (calibrated, n=${bucket.sampleSize})` : ' (seeded prior — not yet calibrated)'}`,
      `${model.name} @ ${model.provider}: $${model.priceIn}/$${model.priceOut} per 1M in/out${staleDays !== null && staleDays > 30 ? ` — price last verified ${staleDays}d ago` : ''}`,
      `persona '${persona.name}': ${persona.reasoningDepth} reasoning · ${persona.promptStyle} style`,
      'a directional range, not a bill',
    ],
  };
}

/** Days since an ISO timestamp, or null if it can't be parsed / is in the future. */
function daysSince(iso: string): number | null {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  const now = Date.parse('2026-07-14T00:00:00.000Z'); // pinned; real staleness is set at the edge
  const d = Math.floor((now - then) / 86400000);
  return d >= 0 ? d : null;
}

const COMPLEXITY_ORDER: Complexity[] = ['trivial', 'moderate', 'complex'];

/** Pick the right-sized persona for the intent (budget-aware). PURE. */
export function recommendPersona(risk: Risk, complexity: Complexity, personas: Persona[]): Persona {
  const byName = (n: string) => personas.find((p) => p.name === n);
  let want: string;
  if (complexity === 'complex' || risk === 'high') want = 'thorough';
  else if (complexity === 'trivial' && risk === 'low') want = 'fast';
  else want = 'balanced';
  return byName(want) ?? personas[0];
}

/**
 * The advisory: pick a persona, estimate its band, and compute refine-to-save
 * (what tightening the intent down one complexity notch would save). PURE over
 * the catalog it's handed.
 */
export function advise(
  measurements: Measurements,
  catalog: { models: CostModel[]; personas: Persona[]; priors: EstimationPrior[] },
): CostEstimate {
  const persona = recommendPersona(measurements.risk, measurements.complexity, catalog.personas);
  const model = catalog.models.find((mo) => mo.id === persona.modelRef) ?? catalog.models[0];
  const est = estimateCost({ measurements, model, persona, priors: catalog.priors });

  // refine-to-save: cost at the current complexity minus cost one notch tighter.
  const idx = COMPLEXITY_ORDER.indexOf(measurements.complexity);
  if (idx > 0) {
    const tighter = estimateCost({
      measurements: { ...measurements, complexity: COMPLEXITY_ORDER[idx - 1] },
      model, persona, priors: catalog.priors,
    });
    const save = round((est.low + est.high) / 2 - (tighter.low + tighter.high) / 2);
    if (save > 0.0005) est.refineToSave = save;
  }
  return est;
}
