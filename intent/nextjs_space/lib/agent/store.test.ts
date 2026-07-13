import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryEventStore } from './store.ts';
import { IllegalTransitionError } from './lifecycle.ts';

const AT = '2026-07-14T00:00:00.000Z';

test('append then load replays the record', async () => {
  const store = new InMemoryEventStore();
  await store.append('i1', { kind: 'created', at: AT, by: 'u', rawInput: 'hello' });
  const r = await store.load('i1');
  assert.ok(r);
  assert.equal(r.rawInput, 'hello');
  assert.equal(r.version, 1);
});

test('load returns null for unknown intent', async () => {
  const store = new InMemoryEventStore();
  assert.equal(await store.load('nope'), null);
});

test('append enforces the lifecycle guard', async () => {
  const store = new InMemoryEventStore();
  await store.append('i1', { kind: 'created', at: AT, by: 'u', rawInput: 'x' });
  // DRAFT -> APPROVED is illegal
  await assert.rejects(
    () => store.append('i1', { kind: 'transitioned', at: AT, by: 'agent', to: 'APPROVED' }),
    IllegalTransitionError,
  );
  // DRAFT -> IN_PROGRESS is legal
  const r = await store.append('i1', { kind: 'transitioned', at: AT, by: 'agent', to: 'IN_PROGRESS' });
  assert.equal(r.state, 'IN_PROGRESS');
});

test('events() returns a defensive copy of the log', async () => {
  const store = new InMemoryEventStore();
  await store.append('i1', { kind: 'created', at: AT, by: 'u', rawInput: 'x' });
  const evs = await store.events('i1');
  evs.push({ kind: 'transitioned', at: AT, by: 'x', to: 'ARCHIVED' });
  assert.equal((await store.events('i1')).length, 1, 'internal log not affected by caller mutation');
});
