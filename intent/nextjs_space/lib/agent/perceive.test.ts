import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyRecord } from './events.ts';
import { perceive } from './perceive.ts';
import { FakeLLM } from './llm.ts';

const AT = '2026-07-14T00:00:00.000Z';

test('perceive emits classified + slot events from the LLM perception', async () => {
  const llm = new FakeLLM({
    structs: [{
      intentType: 'REPORT',
      slots: [
        { key: 'objective', value: 'Q2 board revenue report', state: 'weak' },
        { key: 'audience', value: 'the board', state: 'strong' },
      ],
    }],
  });
  const events = await perceive(emptyRecord('i1'), 'I need a Q2 sales report for the board', llm, { at: AT });
  assert.deepEqual(events.map((e) => e.kind), ['classified', 'slot_valued', 'slot_assessed', 'slot_valued', 'slot_assessed']);
  const first = events[0];
  assert.ok(first.kind === 'classified' && first.intentType === 'REPORT');
});

test('perceive does not re-classify an already-typed record', async () => {
  const rec = { ...emptyRecord('i1'), intentType: 'CHANGE' as const };
  const llm = new FakeLLM({
    structs: [{ intentType: 'CHANGE', slots: [{ key: 'rollback', value: 'revert to sessions', state: 'strong' }] }],
  });
  const events = await perceive(rec, 'rollback is to revert to sessions', llm, { at: AT });
  assert.ok(!events.some((e) => e.kind === 'classified'));
  assert.ok(events.some((e) => e.kind === 'slot_valued' && e.key === 'rollback'));
});

test('perceive skips empty values and slots without a key', async () => {
  const llm = new FakeLLM({
    structs: [{ intentType: 'CHANGE', slots: [{ key: 'objective', value: '', state: 'empty' }, { key: '', value: 'x', state: 'strong' }] }],
  });
  const events = await perceive(emptyRecord('i1'), 'vague', llm, { at: AT });
  // classified only + the empty-value slot's assessment (no slot_valued for empty, none for keyless)
  assert.ok(!events.some((e) => e.kind === 'slot_valued'));
});
