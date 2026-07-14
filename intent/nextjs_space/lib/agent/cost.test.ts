import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateCost, recommendPersona, advise } from './cost.ts';
import type { Measurements } from './cost.ts';
import { DEFAULT_MODELS, DEFAULT_PERSONAS, DEFAULT_PRIORS, defaultCatalog } from './cost-config.ts';
import type { CostModel, Persona } from './cost-config.ts';

const MODEL: CostModel = DEFAULT_MODELS[0];
const persona = (name: string): Persona => DEFAULT_PERSONAS.find((p) => p.name === name)!;
function meas(over: Partial<Measurements> = {}): Measurements {
  return { inputTokens: 1500, intentType: 'CREATE', complexity: 'moderate', risk: 'medium', ...over };
}

test('estimateCost returns an honest band with persona + overflow + assumptions', () => {
  const est = estimateCost({ measurements: meas(), model: MODEL, persona: persona('balanced'), priors: DEFAULT_PRIORS });
  assert.ok(est.low < est.high, 'band, not a point');
  assert.equal(est.currency, 'USD');
  assert.equal(est.persona, 'balanced');
  assert.equal(est.overflow, false);
  assert.ok(est.assumptions.some((a) => a.includes('reference class code:moderate')));
});

test('reference class scales cost: complex > trivial for the same everything', () => {
  const trivial = estimateCost({ measurements: meas({ complexity: 'trivial' }), model: MODEL, persona: persona('fast'), priors: DEFAULT_PRIORS });
  const complex = estimateCost({ measurements: meas({ complexity: 'complex' }), model: MODEL, persona: persona('fast'), priors: DEFAULT_PRIORS });
  assert.ok(complex.high > trivial.high);
});

test('persona settings scale output: thorough > fast on identical measurements', () => {
  const m = meas();
  const fast = estimateCost({ measurements: m, model: MODEL, persona: persona('fast'), priors: DEFAULT_PRIORS });
  const thorough = estimateCost({ measurements: m, model: MODEL, persona: persona('thorough'), priors: DEFAULT_PRIORS });
  assert.ok(thorough.high > fast.high, 'high reasoning + verbose costs more output');
});

test('overflow trips when the working memory exceeds the context window', () => {
  const est = estimateCost({ measurements: meas({ inputTokens: MODEL.contextWindow + 1 }), model: MODEL, persona: persona('fast'), priors: DEFAULT_PRIORS });
  assert.equal(est.overflow, true);
});

test('caching discount lowers the input cost', () => {
  const cached: CostModel = { ...MODEL, cacheDiscount: 0.5 };
  const base = estimateCost({ measurements: meas(), model: MODEL, persona: persona('fast'), priors: DEFAULT_PRIORS });
  const disc = estimateCost({ measurements: meas(), model: cached, persona: persona('fast'), priors: DEFAULT_PRIORS });
  assert.ok(disc.low < base.low);
});

test('the band is preserved for large tasks — max_output does not collapse it', () => {
  // A complex intent estimates output far above a single response limit; cost is
  // NOT capped (multiple calls), so low < high must survive.
  const smallCap: CostModel = { ...MODEL, maxOutput: 500 };
  const est = estimateCost({ measurements: meas({ complexity: 'complex' }), model: smallCap, persona: persona('thorough'), priors: DEFAULT_PRIORS });
  assert.ok(est.low < est.high, 'band survives even when the estimate exceeds max_output');
});

test('recommendPersona right-sizes: trivial+low→fast, complex/high→thorough', () => {
  assert.equal(recommendPersona('low', 'trivial', DEFAULT_PERSONAS).name, 'fast');
  assert.equal(recommendPersona('medium', 'complex', DEFAULT_PERSONAS).name, 'thorough');
  assert.equal(recommendPersona('high', 'moderate', DEFAULT_PERSONAS).name, 'thorough');
  assert.equal(recommendPersona('medium', 'moderate', DEFAULT_PERSONAS).name, 'balanced');
});

test('advise picks a persona, bands the cost, and shows refine-to-save for non-trivial', () => {
  const est = advise(meas({ complexity: 'moderate', risk: 'medium' }), defaultCatalog());
  assert.equal(est.persona, 'balanced');
  assert.ok(est.low < est.high);
  assert.ok((est.refineToSave ?? 0) > 0, 'tightening moderate→trivial saves something');
});

test('advise: a trivial low-risk intent has no refine-to-save (already tightest)', () => {
  const est = advise(meas({ complexity: 'trivial', risk: 'low' }), defaultCatalog());
  assert.equal(est.persona, 'fast');
  assert.equal(est.refineToSave, undefined);
});

test('estimateCost is pure — same inputs, same output', () => {
  const inputs = { measurements: meas(), model: MODEL, persona: persona('balanced'), priors: DEFAULT_PRIORS };
  assert.deepEqual(estimateCost(inputs), estimateCost(inputs));
});
