import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateCost, recommendPersona, countInputTokens, estimateOutputTokens, PERSONAS } from './cost.ts';
import type { Complexity, IntentRecord, Risk, Slot } from './types.ts';

function rec(partial: Partial<IntentRecord> = {}): IntentRecord {
  return {
    id: 'x', version: 0, rawInput: 'do a thing', intentType: 'CHANGE',
    risk: 'medium', complexity: 'moderate', state: 'DRAFT', slots: {}, ...partial,
  };
}
function strong(key: string, value: string): Slot {
  return { key, value, state: 'strong' };
}

test('recommendPersona: trivial+low → fast; complex or high → thorough; else balanced', () => {
  assert.equal(recommendPersona(rec({ complexity: 'trivial', risk: 'low' })), 'fast');
  assert.equal(recommendPersona(rec({ complexity: 'complex', risk: 'medium' })), 'thorough');
  assert.equal(recommendPersona(rec({ complexity: 'moderate', risk: 'high' })), 'thorough');
  assert.equal(recommendPersona(rec({ complexity: 'moderate', risk: 'medium' })), 'balanced');
});

test('estimateCost returns a real range with a known persona + assumptions', () => {
  const est = estimateCost(rec({ slots: { scope: strong('scope', 'a broad scope covering many surfaces') } }));
  assert.ok(est.low < est.high, 'low < high — a band, not a point');
  assert.ok(est.low >= 0);
  assert.equal(est.currency, 'USD');
  assert.ok(est.assumptions.length >= 2);
  assert.ok(PERSONAS[est.persona], 'persona is a known persona');
});

test('a trivial low-risk intent costs less than a complex high-risk one', () => {
  const trivial = estimateCost(rec({ complexity: 'trivial', risk: 'low' }));
  const heavy = estimateCost(rec({ complexity: 'complex', risk: 'high' }));
  assert.ok(trivial.high < heavy.high);
});

test('refine-to-save is present when the right-sized persona beats frontier, absent at frontier', () => {
  const cheap = estimateCost(rec({ complexity: 'trivial', risk: 'low' })); // → fast (cheap tier)
  assert.ok((cheap.refineToSave ?? 0) > 0, 'cheap tier shows savings vs frontier default');
  const frontier = estimateCost(rec({ complexity: 'complex', risk: 'high' })); // → thorough (frontier)
  assert.equal(frontier.refineToSave, undefined, 'no savings when already frontier');
});

test('token counters are monotonic in content', () => {
  const empty = countInputTokens(rec({ rawInput: '' }));
  const full = countInputTokens(rec({ rawInput: 'a much longer raw input string here' }));
  assert.ok(full > empty);
  const c: Complexity = 'complex';
  assert.ok(estimateOutputTokens(rec({ complexity: c })) > estimateOutputTokens(rec({ complexity: 'trivial' })));
});

test('estimateCost is pure — same record, same estimate', () => {
  const r = rec({ complexity: 'moderate', risk: 'medium' });
  assert.deepEqual(estimateCost(r), estimateCost(r));
});
