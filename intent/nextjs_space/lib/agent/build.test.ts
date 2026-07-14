import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryEventStore } from './store.ts';
import { FakeLLM } from './llm.ts';
import { runBuild } from './build.ts';

const AT = '2026-07-15T00:00:00.000Z';

async function seed(store: InMemoryEventStore, id: string, persona = 'quick', outcome = 'plan') {
  await store.append(id, { kind: 'created', at: AT, by: 'u', rawInput: 'build a todo app' });
  await store.append(id, { kind: 'classified', at: AT, by: 'agent', intentType: 'CREATE' });
  await store.append(id, { kind: 'persona_selected', at: AT, by: 'user', persona });
  await store.append(id, { kind: 'outcome_set', at: AT, by: 'user', outcome });
}

test('runBuild writes OKF files named by outcome + stamps actual cost', async () => {
  const store = new InMemoryEventStore();
  await seed(store, 'b1', 'quick', 'plan');
  const llm = new FakeLLM({ structs: [{ files: [{ name: 'plan.md', format: 'plan', body: '# Plan\n\nBuild a todo app.' }] }] });
  const rec = await runBuild(store, 'b1', llm, { at: AT });
  assert.equal(rec.built, true);
  assert.equal(rec.files.length, 1);
  assert.equal(rec.files[0].name, 'plan.md');
  assert.equal(rec.files[0].format, 'plan');
  assert.match(rec.files[0].content, /okf_version: "1.0"/, 'rendered as OKF markdown');
  assert.match(rec.files[0].content, /# Plan/, 'body preserved');
  // FakeLLM usage {in:1000,out:500} × quick→deepseek-v4-flash ($0.1/$0.2 per 1M): (1000*0.1+500*0.2)/1e6 = 0.0002
  assert.equal(rec.actualCost, 0.0002);
});

test('runBuild supports multiple files (agent decides)', async () => {
  const store = new InMemoryEventStore();
  await seed(store, 'b2', 'balanced', 'plan');
  const llm = new FakeLLM({ structs: [{ files: [
    { name: 'plan.md', format: 'plan', body: '# Plan' },
    { name: 'data-model.md', format: 'doc', body: '# Data model' },
  ] }] });
  const rec = await runBuild(store, 'b2', llm, { at: AT });
  assert.equal(rec.files.length, 2);
  assert.deepEqual(rec.files.map((f) => f.name), ['plan.md', 'data-model.md']);
});

test('runBuild is idempotent — an already-built record returns unchanged', async () => {
  const store = new InMemoryEventStore();
  await seed(store, 'b3');
  const llm = new FakeLLM({ structs: [{ files: [{ name: 'plan.md', body: 'x' }] }] });
  const first = await runBuild(store, 'b3', llm, { at: AT });
  const second = await runBuild(store, 'b3', llm, { at: AT }); // no struct queued — must NOT call the LLM
  assert.equal(second.built, true);
  assert.equal(second.version, first.version, 'no new events on a re-build');
});

test('runBuild with force regenerates — new files overwrite on replay (point 5 rebuild)', async () => {
  const store = new InMemoryEventStore();
  await seed(store, 'b4', 'quick', 'plan');
  const llm = new FakeLLM({ structs: [
    { files: [{ name: 'plan.md', format: 'plan', body: '# Plan v1' }] },
    { files: [{ name: 'plan.md', format: 'plan', body: '# Plan v2 (revised)' }] },
  ] });
  const first = await runBuild(store, 'b4', llm, { at: AT });
  assert.match(first.files[0].content, /# Plan v1/);
  const second = await runBuild(store, 'b4', llm, { at: AT, force: true });
  assert.equal(second.built, true);
  assert.notEqual(second.version, first.version, 'force appends a fresh plan_built');
  assert.equal(second.files.length, 1);
  assert.match(second.files[0].content, /# Plan v2 \(revised\)/, 'rebuilt files replace the old ones on replay');
});
