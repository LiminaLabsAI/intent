import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryEventStore } from './store.ts';
import { FakeLLM } from './llm.ts';
import { runBuild } from './build.ts';

const AT = '2026-07-15T00:00:00.000Z';

async function seed(store: InMemoryEventStore, id: string, persona = 'fast') {
  await store.append(id, { kind: 'created', at: AT, by: 'u', rawInput: 'build a todo app' });
  await store.append(id, { kind: 'classified', at: AT, by: 'agent', intentType: 'CREATE' });
  await store.append(id, { kind: 'persona_selected', at: AT, by: 'user', persona });
}

test('runBuild materializes slots strong + stamps actual cost from usage', async () => {
  const store = new InMemoryEventStore();
  await seed(store, 'b1', 'fast');
  const llm = new FakeLLM({ structs: [{ slots: [{ key: 'objective', value: 'a working todo app' }, { key: 'scope', value: 'crud of todos' }] }] });
  const rec = await runBuild(store, 'b1', llm, { at: AT });
  assert.equal(rec.built, true);
  assert.equal(rec.slots['objective'].state, 'strong');
  assert.equal(rec.slots['objective'].value, 'a working todo app');
  assert.equal(rec.slots['objective'].inferred, false, 'a built slot is authoritative, not inferred');
  // FakeLLM usage {in:1000,out:500} × fast→deepseek-v4-flash ($0.1/$0.3 per 1M): (1000*0.1+500*0.3)/1e6 = 0.00025
  assert.equal(rec.actualCost, 0.00025);
});

test('runBuild is idempotent — an already-built record returns unchanged', async () => {
  const store = new InMemoryEventStore();
  await seed(store, 'b2', 'fast');
  const llm = new FakeLLM({ structs: [{ slots: [{ key: 'objective', value: 'x' }] }] });
  const first = await runBuild(store, 'b2', llm, { at: AT });
  const v = first.version;
  const second = await runBuild(store, 'b2', llm, { at: AT }); // no struct queued — must NOT call the LLM
  assert.equal(second.built, true);
  assert.equal(second.version, v, 'no new events on a re-build');
});
