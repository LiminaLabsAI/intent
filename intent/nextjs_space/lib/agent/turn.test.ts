import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryEventStore } from './store.ts';
import { FakeLLM } from './llm.ts';
import { runTurn, runPersonaSelection } from './turn.ts';

const AT = '2026-07-14T00:00:00.000Z';

test('first turn gates on persona; after selecting, refinement proceeds', async () => {
  const store = new InMemoryEventStore();
  const llm = new FakeLLM({
    structs: [{ intentType: 'CHANGE', slots: [{ key: 'objective', value: 'OAuth becomes the sole login', state: 'weak', reason: 'vague on provider/scope' }] }],
    texts: ['How thorough should I be? Options are below.', 'I read this as OAuth 2.0 — shall I sharpen that?'],
  });
  const res = await runTurn(store, 'i1', 'Migrate our auth to OAuth', llm, { at: AT });
  assert.equal(res.view.record.intentType, 'CHANGE');
  assert.equal(res.moves[0].kind, 'select_persona', 'gate before refining');
  assert.ok(res.view.personas.length >= 1, 'picker options are provided');
  assert.equal(res.view.selectedPersona, null);
  // user picks a mode → the agent proceeds to refine under it
  const res2 = await runPersonaSelection(store, 'i1', 'balanced', llm, {});
  assert.equal(res2.view.record.persona, 'balanced');
  assert.equal(res2.view.selectedPersona, 'balanced');
  assert.notEqual(res2.moves[0].kind, 'select_persona');
  assert.equal(res2.moves[0].kind, 'ask');
});

test('governance-stop path: blocked intent → governance_stop, no barrage', async () => {
  const store = new InMemoryEventStore();
  const llm = new FakeLLM({ structs: [{ intentType: null, slots: [] }], texts: ['This looks personal — want me to flag it for human review?'] });
  const res = await runTurn(store, 'i2', 'plan my grocery shopping list', llm, { at: AT });
  assert.equal(res.moves[0].kind, 'governance_stop');
  assert.ok(res.moves.length <= 1);
});

test('ready intent: after picking a mode, it offers to build (ADR-0002)', async () => {
  const store = new InMemoryEventStore();
  const strong = (key: string) => ({ key, value: `a concrete specific value for ${key}`, state: 'strong' as const });
  const required = ['objective', 'scope', 'entities', 'acceptance_criteria', 'context', 'rollback', 'migration_path', 'blast_radius'];
  const llm = new FakeLLM({
    structs: [{ intentType: 'CHANGE', slots: required.map(strong) }],
    texts: ['How thorough should I be?', 'Ready — shall I build the working memory?'],
  });
  const res = await runTurn(store, 'i3', 'a full, detailed OAuth migration with rollback, cutover and blast radius defined', llm, { at: AT });
  assert.equal(res.moves[0].kind, 'select_persona');
  // pick 'balanced' (medium rigor = the required set the fixture fills) → ready → offer_build (not yet built)
  const res2 = await runPersonaSelection(store, 'i3', 'balanced', llm, {});
  assert.equal(res2.view.readiness.readiness, 'ready');
  assert.equal(res2.moves[0].kind, 'offer_build');
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
