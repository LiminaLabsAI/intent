import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPINE_SLOTS, CHANGE_TEMPLATE, REPORT_TEMPLATE, resolveSchema, requirednessOf } from './schema.ts';

test('spine has the six universal slots', () => {
  assert.equal(SPINE_SLOTS.length, 6);
  const keys = SPINE_SLOTS.map((s) => s.key).sort();
  assert.deepEqual(keys, [
    'acceptance_criteria', 'context', 'entities', 'objective', 'out_of_scope', 'scope',
  ]);
});

test('CHANGE resolves spine + change template with unique keys', () => {
  const slots = resolveSchema('CHANGE');
  assert.equal(slots.length, 6 + CHANGE_TEMPLATE.length);
  const keys = slots.map((s) => s.key);
  assert.equal(new Set(keys).size, keys.length, 'no duplicate slot keys');
});

test('REPORT resolves spine + report template', () => {
  assert.equal(resolveSchema('REPORT').length, 6 + REPORT_TEMPLATE.length);
});

test('ANALYZE / CREATE are spine-only for now', () => {
  assert.equal(resolveSchema('ANALYZE').length, 6);
  assert.equal(resolveSchema('CREATE').length, 6);
});

test('null type resolves spine-only (cold start / pre-classification)', () => {
  assert.equal(resolveSchema(null).length, 6);
});

test('requiredness is risk-weighted: out_of_scope optional@low, required@high', () => {
  const oos = SPINE_SLOTS.find((s) => s.key === 'out_of_scope')!;
  assert.equal(requirednessOf(oos, 'low'), 'optional');
  assert.equal(requirednessOf(oos, 'high'), 'required');
});

test('objective is required at every risk', () => {
  const obj = SPINE_SLOTS.find((s) => s.key === 'objective')!;
  assert.equal(requirednessOf(obj, 'low'), 'required');
  assert.equal(requirednessOf(obj, 'medium'), 'required');
  assert.equal(requirednessOf(obj, 'high'), 'required');
});
