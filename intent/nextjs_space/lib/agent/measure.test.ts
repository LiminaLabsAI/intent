import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWorkingMemory, tokenize, measure } from './measure.ts';
import type { IntentRecord, Slot } from './types.ts';

function slot(key: string, value: string): Slot {
  return { key, value, state: 'strong' };
}
function rec(over: Partial<IntentRecord> = {}): IntentRecord {
  return {
    id: 'x', version: 0, rawInput: 'build a thing', intentType: 'CREATE',
    risk: 'low', complexity: 'trivial', state: 'DRAFT', slots: {}, ...over,
  };
}

test('buildWorkingMemory includes rawInput and every filled slot', () => {
  const wm = buildWorkingMemory(rec({ slots: { objective: slot('objective', 'do X'), scope: slot('scope', 'Y') } }));
  assert.match(wm, /build a thing/);
  assert.match(wm, /objective: do X/);
  assert.match(wm, /scope: Y/);
});

test('buildWorkingMemory skips empty slots', () => {
  const wm = buildWorkingMemory(rec({ slots: { objective: slot('objective', 'do X'), scope: { key: 'scope', value: null, state: 'empty' } } }));
  assert.doesNotMatch(wm, /scope:/);
});

test('tokenize is monotonic and falls back to approx for unknown ids', () => {
  assert.ok(tokenize('a much longer string here', 'approx') > tokenize('short', 'approx'));
  assert.equal(tokenize('hello world!!', 'nonexistent'), tokenize('hello world!!', 'approx'));
});

test('measure carries intentType/complexity/risk and a positive token count', () => {
  const m = measure(rec({ slots: { objective: slot('objective', 'a concrete objective') } }));
  assert.ok(m.inputTokens > 0);
  assert.equal(m.intentType, 'CREATE');
  assert.equal(m.complexity, 'trivial');
  assert.equal(m.risk, 'low');
});

test('measure defaults complexity/risk when the record has none', () => {
  const m = measure(rec({ complexity: null, risk: undefined as never }));
  assert.equal(m.complexity, 'moderate');
  assert.equal(m.risk, 'medium');
});
