import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryEventStore } from './store.ts';
import { FakeLLM } from './llm.ts';
import { runTurn } from './turn.ts';

const AT = '2026-07-14T00:00:00.000Z';

test('first turn: classify → fold → decide → narrate (deterministic with FakeLLM)', async () => {
  const store = new InMemoryEventStore();
  const llm = new FakeLLM({
    structs: [{ intentType: 'CHANGE', slots: [{ key: 'objective', value: 'OAuth becomes the sole login', state: 'weak', reason: 'vague on provider/scope' }] }],
    texts: ['I read this as OAuth 2.0 as the sole login path — shall I sharpen that?'],
  });
  const res = await runTurn(store, 'i1', 'Migrate our auth to OAuth', llm, { at: AT });
  assert.equal(res.view.record.intentType, 'CHANGE');
  assert.equal(res.view.record.slots['objective'].state, 'weak');
  assert.equal(res.moves.length, 1);
  assert.equal(res.moves[0].kind, 'infer_confirm');
  assert.equal(res.moves[0].slot, 'objective');
  assert.match(res.reply, /OAuth/);
});

test('governance-stop path: blocked intent → governance_stop, no barrage', async () => {
  const store = new InMemoryEventStore();
  const llm = new FakeLLM({ structs: [{ intentType: null, slots: [] }], texts: ['This looks personal — want me to flag it for human review?'] });
  const res = await runTurn(store, 'i2', 'plan my grocery shopping list', llm, { at: AT });
  assert.equal(res.moves[0].kind, 'governance_stop');
  assert.ok(res.moves.length <= 1);
});

test('ready intent → close move + ready readiness', async () => {
  const store = new InMemoryEventStore();
  const strong = (key: string) => ({ key, value: `a concrete specific value for ${key}`, state: 'strong' as const });
  const required = ['objective', 'scope', 'entities', 'acceptance_criteria', 'context', 'rollback', 'migration_path', 'blast_radius'];
  const llm = new FakeLLM({
    structs: [{ intentType: 'CHANGE', slots: required.map(strong) }],
    texts: ['All set — this intent is ready to hand off.'],
  });
  const res = await runTurn(store, 'i3', 'a full, detailed OAuth migration with rollback, cutover and blast radius defined', llm, { at: AT });
  assert.equal(res.view.readiness.readiness, 'ready');
  assert.equal(res.moves[0].kind, 'close');
});

test('the record is event-sourced — replay after a turn is stable', async () => {
  const store = new InMemoryEventStore();
  const llm = new FakeLLM({ structs: [{ intentType: 'CHANGE', slots: [{ key: 'objective', value: 'x becomes y', state: 'strong' }] }], texts: ['ok'] });
  await runTurn(store, 'i4', 'do the change', llm, { at: AT });
  const a = await store.load('i4');
  const b = await store.load('i4');
  assert.deepEqual(a, b);
  assert.ok(a!.version >= 3); // created + classified + valued + assessed
});
