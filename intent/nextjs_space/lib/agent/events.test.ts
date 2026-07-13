import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apply, replay, emptyRecord } from './events.ts';
import type { IntentEvent } from './types.ts';

const AT = '2026-07-14T00:00:00.000Z';
const BY = 'user-1';

const log: IntentEvent[] = [
  { kind: 'created', at: AT, by: BY, rawInput: 'Migrate our auth to OAuth' },
  { kind: 'classified', at: AT, by: 'agent', intentType: 'CHANGE' },
  { kind: 'slot_valued', at: AT, by: 'agent', key: 'objective', value: 'OAuth becomes the sole login path' },
  { kind: 'slot_assessed', at: AT, by: 'agent', key: 'objective', state: 'strong', reason: 'concrete end-state' },
  { kind: 'transitioned', at: AT, by: 'agent', to: 'IN_PROGRESS' },
];

test('replay is deterministic — same log yields identical records', () => {
  assert.deepEqual(replay('i1', log), replay('i1', log));
});

test('replay materializes the expected record', () => {
  const r = replay('i1', log);
  assert.equal(r.rawInput, 'Migrate our auth to OAuth');
  assert.equal(r.intentType, 'CHANGE');
  assert.equal(r.state, 'IN_PROGRESS');
  assert.equal(r.slots['objective'].value, 'OAuth becomes the sole login path');
  assert.equal(r.slots['objective'].state, 'strong');
});

test('version increments once per event', () => {
  assert.equal(replay('i1', log).version, log.length);
  assert.equal(emptyRecord('i1').version, 0);
});

test('apply never mutates its input (immutability)', () => {
  const before = emptyRecord('i1');
  const after = apply(before, { kind: 'created', at: AT, by: BY, rawInput: 'x' });
  assert.equal(before.version, 0, 'input version unchanged');
  assert.equal(before.rawInput, '', 'input rawInput unchanged');
  assert.notEqual(after, before, 'returns a new object');
  assert.equal(after.version, 1);
});

test('slot_added is idempotent and does not clobber an existing value', () => {
  const def = { key: 'rollback', label: 'Rollback', layer: 'template' as const, describe: '', rubric: '', requiredness: { low: 'optional' as const, medium: 'optional' as const, high: 'optional' as const } };
  const r = replay('i1', [
    { kind: 'slot_valued', at: AT, by: BY, key: 'rollback', value: 'revert to sessions' },
    { kind: 'slot_added', at: AT, by: 'agent', def },
  ]);
  assert.equal(r.slots['rollback'].value, 'revert to sessions');
});
