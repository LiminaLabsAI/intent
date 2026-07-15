import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryEventStore } from './store.ts';
import { FakeLLM } from './llm.ts';
import { runBuild, runRefine, fileDiff } from './build.ts';

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

test('runBuild throws (not an empty build) when the model returns no usable files', async () => {
  const store = new InMemoryEventStore();
  await seed(store, 'b5', 'quick', 'plan');
  const llm = new FakeLLM({ structs: [{ files: [] }] });
  await assert.rejects(() => runBuild(store, 'b5', llm, { at: AT }), /BUILD_PRODUCED_NO_FILES/);
  const rec = await store.load('b5');
  assert.equal(rec?.built, false, 'record not marked built on a failed build');
});

test('runBuild retries once when generation throws, then succeeds', async () => {
  const store = new InMemoryEventStore();
  await seed(store, 'b6', 'quick', 'plan');
  let calls = 0;
  const flaky = {
    generateText: async () => 'ok',
    generateStructured: async () => ({}),
    generateStructuredWithUsage: async () => {
      calls++;
      if (calls === 1) throw new Error('MODEL_OUTPUT_UNPARSEABLE');
      return { data: { files: [{ name: 'plan.md', format: 'plan', body: '# Plan' }] }, usage: { inputTokens: 100, outputTokens: 50 } };
    },
  };
  const rec = await runBuild(store, 'b6', flaky as any, { at: AT });
  assert.equal(calls, 2, 'retried exactly once');
  assert.equal(rec.files.length, 1);
  assert.equal(rec.built, true);
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

// ── Phase 14: runRefine (cyclic refinement) ──────────────────────────────────

test('runRefine generates new files + computes diff (full re-build)', async () => {
  const store = new InMemoryEventStore();
  await seed(store, 'r1', 'quick', 'plan');
  const buildLlm = new FakeLLM({ structs: [{ files: [{ name: 'plan.md', format: 'plan', body: '# Plan\n\nOriginal.' }] }] });
  await runBuild(store, 'r1', buildLlm, { at: AT });
  const refineLlm = new FakeLLM({ structs: [{ files: [{ name: 'plan.md', format: 'plan', body: '# Plan\n\nOriginal.\n\n## Risk\n\nSomething.' }] }] });
  const result = await runRefine(store, 'r1', refineLlm, { refineRequest: 'add a risk section', at: AT });
  assert.equal(result.files.length, 1);
  assert.equal(result.label, 'add a risk section');
  assert.equal(result.diff.length, 1);
  assert.equal(result.diff[0].path, 'plan.md');
  assert.equal(result.diff[0].status, 'changed');
});

test('runRefine throws if not yet built', async () => {
  const store = new InMemoryEventStore();
  await seed(store, 'r2', 'quick', 'plan');
  const llm = new FakeLLM({ structs: [{ files: [{ name: 'plan.md', format: 'plan', body: '# Plan' }] }] });
  await assert.rejects(() => runRefine(store, 'r2', llm, { refineRequest: 'change it', at: AT }), /NOT_YET_BUILT/);
});

test('runRefine targeted update — only regenerates the named concept', async () => {
  const store = new InMemoryEventStore();
  await seed(store, 'r3', 'balanced', 'plan');
  const buildLlm = new FakeLLM({ structs: [{ files: [
    { name: 'plan.md', format: 'plan', body: '# Plan' },
    { name: 'diagram.md', format: 'diagram', body: '```mermaid\ngraph A\n```' },
  ] }] });
  await runBuild(store, 'r3', buildLlm, { at: AT });
  // Refine: only regenerate diagram.md
  const refineLlm = new FakeLLM({ structs: [{ files: [{ name: 'diagram.md', format: 'diagram', body: '```mermaid\ngraph A-->B\n```' }] }] });
  const result = await runRefine(store, 'r3', refineLlm, { refineRequest: 'add B to the diagram', conceptPath: 'diagram.md', at: AT });
  assert.equal(result.files.length, 2, 'both files present (parent plan.md + new diagram.md)');
  assert.equal(result.files.find((f) => f.name === 'plan.md').format, 'plan');
  assert.equal(result.files.find((f) => f.name === 'diagram.md').format, 'diagram');
  const diagramDiff = result.diff.find((d) => d.path === 'diagram.md');
  assert.equal(diagramDiff.status, 'changed');
  const planDiff = result.diff.find((d) => d.path === 'plan.md');
  assert.equal(planDiff.status, 'unchanged', 'plan.md not touched by targeted refine');
});

test('fileDiff computes added/changed/unchanged/removed', () => {
  const fileA = (name: string, content: string) => ({ name, format: 'plan', content: `---\ntype: plan\n---\n\n${content}` });
  const old = [fileA('plan.md', 'old'), fileA('removed.md', 'gone')];
  const nw = [fileA('plan.md', 'new'), fileA('added.md', 'new')];
  const diff = fileDiff(old, nw);
  assert.equal(diff.length, 3);
  assert.equal(diff.find((d) => d.path === 'plan.md').status, 'changed');
  assert.equal(diff.find((d) => d.path === 'removed.md').status, 'removed');
  assert.equal(diff.find((d) => d.path === 'added.md').status, 'added');
});

test('fileDiff reports unchanged for identical content', () => {
  const f = (name: string) => ({ name, format: 'plan', content: `---\ntype: plan\n---\n\nsame` });
  const diff = fileDiff([f('plan.md')], [f('plan.md')]);
  assert.equal(diff[0].status, 'unchanged');
});
