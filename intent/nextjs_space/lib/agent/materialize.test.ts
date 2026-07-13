import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryEventStore } from './store.ts';
import { materializeRecord } from './materialize.ts';

const AT = '2026-07-14T00:00:00.000Z';

test('materializeRecord returns null for unknown intent', async () => {
  const store = new InMemoryEventStore();
  assert.equal(await materializeRecord(store, 'nope'), null);
});

test('materializeRecord composes record + readiness + resolved schema', async () => {
  const store = new InMemoryEventStore();
  await store.append('i1', { kind: 'created', at: AT, by: 'u', rawInput: 'Migrate auth to OAuth' });
  await store.append('i1', { kind: 'classified', at: AT, by: 'agent', intentType: 'CHANGE' });
  const view = await materializeRecord(store, 'i1', 'medium');
  assert.ok(view);
  assert.equal(view.record.intentType, 'CHANGE');
  assert.equal(view.readiness.readiness, 'vague');
  assert.ok(view.schema.length >= 11, 'spine + change template surfaced');
  assert.ok(view.schema.some((s) => s.key === 'rollback' && s.layer === 'template'));
  assert.ok(view.schema.some((s) => s.key === 'objective' && s.requiredness === 'required'));
});

test('readiness climbs vague -> actionable as the objective is valued & assessed strong', async () => {
  const store = new InMemoryEventStore();
  await store.append('i1', { kind: 'created', at: AT, by: 'u', rawInput: 'x' });
  await store.append('i1', { kind: 'classified', at: AT, by: 'agent', intentType: 'REPORT' });
  let view = await materializeRecord(store, 'i1', 'low');
  assert.equal(view!.readiness.readiness, 'vague');

  await store.append('i1', { kind: 'slot_valued', at: AT, by: 'u', key: 'objective', value: 'a board-ready Q2 revenue report' });
  await store.append('i1', { kind: 'slot_assessed', at: AT, by: 'agent', key: 'objective', state: 'strong' });
  view = await materializeRecord(store, 'i1', 'low');
  assert.equal(view!.readiness.readiness, 'actionable');
});
