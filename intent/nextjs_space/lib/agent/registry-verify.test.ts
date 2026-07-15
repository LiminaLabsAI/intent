/**
 * Phase 14 (ADR-0003) — Verification suite.
 *
 * Exercises the pure core of the registry + refine loop: fileDiff, okfValidator,
 * event-sourced replay stability under build + refine, and the state-machine
 * invariants (immutability, forward-restore, OKF conformance). Uses only
 * InMemoryEventStore + FakeLLM + the pure functions — no Prisma/Disk needed.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryEventStore } from './store.ts';
import { FakeLLM } from './llm.ts';
import { runBuild, runRefine, fileDiff } from './build.ts';
import { okfValidator, parseOkf, contentHash, renderOkf } from './okf.ts';
import { replay } from './events.ts';
import type { IntentEvent, PlanFile } from './types.ts';

const AT = '2026-07-15T00:00:00.000Z';

async function seed(store: InMemoryEventStore, id: string, persona = 'quick', outcome = 'plan') {
  await store.append(id, { kind: 'created', at: AT, by: 'u', rawInput: 'build a todo app' });
  await store.append(id, { kind: 'classified', at: AT, by: 'agent', intentType: 'CREATE' });
  await store.append(id, { kind: 'persona_selected', at: AT, by: 'user', persona });
  await store.append(id, { kind: 'outcome_set', at: AT, by: 'user', outcome });
}

const ok = (name: string, body: string): PlanFile => ({
  name, format: 'plan', content: renderOkf({ id: `int:${name}`, type: 'plan', title: 'Plan', version: '1.0.0', created: AT, body }),
});

// ── 1 · full stand-up-the-stream ─────────────────────────────────────────────

test('v1 → refine → v2 → restore v1 → v3 (full lifecycle events are stable under replay)', async () => {
  const store = new InMemoryEventStore();
  await seed(store, 'life');
  // v1 — build
  await runBuild(store, 'life', new FakeLLM({ structs: [{ files: [{ name: 'plan.md', format: 'plan', body: '# Plan v1' }] }] }), { at: AT });
  const afterBuild = await store.load('life');
  assert.ok(afterBuild?.built, 'building sets record.built');
  assert.ok(afterBuild?.files.length === 1, 'one file after build');

  // refine
  const ref = await runRefine(store, 'life', new FakeLLM({ structs: [{ files: [{ name: 'plan.md', format: 'plan', body: '# Plan v1\n\n## Risk\nnew' }] }] }), { refineRequest: 'add risk', at: AT });
  assert.equal(ref.diff[0].status, 'changed', 'refine produced a changed diff');
  assert.equal(ref.label, 'add risk', 'label = refine request text');

  // v2 — another refine
  const ref2 = await runRefine(store, 'life', new FakeLLM({ structs: [{ files: [{ name: 'plan.md', format: 'plan', body: '# Plan v1\n\n## Risk\nnew\n\n## Scope\ndone' }] }] }), { refineRequest: 'add scope', at: AT });
  assert.equal(ref2.label, 'add scope');

  // The IntentEvent log accumulates: created + classified + persona + outcome + plan_built (×3)
  const events = await store.events('life');
  const planBuiltCount = events.filter((e) => e.kind === 'plan_built').length;
  assert.equal(planBuiltCount, 3, 'three plan_built events (build + 2 refines)');

  // Event-sourced replay stability: each refine mutates record.files but doesn't corrupt earlier events
  const r = replay('life', events);
  assert.ok(r.built, 'replay shows record as built (last plan_built)');
  assert.equal(r.files.length, 1, 'one file (latest plan_built wins on replay)');
  assert.match(r.files[0].content, /Scope/);
});

test('restore-as-draft behaves as a forward fork — a simulated restore preserves history', async () => {
  // In the pure layer, "restore as draft" = copy old file content into a new plan_built
  const store = new InMemoryEventStore();
  await seed(store, 'restore');
  const v1 = await runBuild(store, 'restore', new FakeLLM({ structs: [{ files: [{ name: 'plan.md', format: 'plan', body: '# v1 content' }] }] }), { at: AT });
  const v1content = v1.files[0].content;
  // refine to v2
  await runRefine(store, 'restore', new FakeLLM({ structs: [{ files: [{ name: 'plan.md', format: 'plan', body: '# v2 different' }] }] }), { refineRequest: 'revise', at: AT });
  // simulate restore: runBuild with v1 again (the bundle layer does this via createDraft with copied concepts)
  // The v1 content is preserved in the event log and can be re-issued
  const restored = await runRefine(store, 'restore', new FakeLLM({ structs: [{ files: [{ name: 'plan.md', format: 'plan', body: '# v1 content' }] }] }), { refineRequest: 'restore v1', at: AT });
  assert.match(restored.files[0].content, /v1 content/, 'restored file matches v1 content');
  // The event log still contains the v2 plan_built — history is untouched by the restore
  const events = await store.events('restore');
  const contents = events.filter((e) => e.kind === 'plan_built').map((e: any) => e.files[0]?.content ?? '');
  assert.ok(contents.some((c) => c.includes('v2 different')), 'v2 event still in log (immutable)');
  assert.ok(contents.some((c) => c.includes('v1 content')), 'restored v1 event also in log');
});

// ── 2 · immutability invariant ───────────────────────────────────────────────

test('published BundleVersion content is never in-place updated — a fresh plan_built appends, never edits prior events', async () => {
  const store = new InMemoryEventStore();
  await seed(store, 'immut');
  await runBuild(store, 'immut', new FakeLLM({ structs: [{ files: [{ name: 'plan.md', body: 'original' }] }] }), { at: AT });
  const events1 = await store.events('immut');
  const firstPlanBuilt = events1.find((e) => e.kind === 'plan_built') as any;
  const firstContents = firstPlanBuilt.files[0].content;
  // refine (simulates a publish-followed-by-refine)
  await runRefine(store, 'immut', new FakeLLM({ structs: [{ files: [{ name: 'plan.md', body: 'changed' }] }] }), { refineRequest: 'change it', at: AT });
  const events2 = await store.events('immut');
  const stillThere = events2.find((e) => e.kind === 'plan_built' && (e as any).files[0]?.content === firstContents);
  assert.ok(stillThere, 'the original plan_built event is untouched (immutable) — refine appends, never edits');
});

// ── 3 · OKF-conformance rejection ────────────────────────────────────────────

test('okfValidator rejects a non-conformant bundle that would-be Publish rejects', () => {
  // Missing type
  const bad = [{ path: 'plan.md', content: '---\nokf_version: "1.0"\n---\n\nbody' }];
  assert.ok(!okfValidator(bad).valid, 'missing type → not valid');
  // Non-empty type → valid
  const good = [{ path: 'plan.md', content: renderOkf({ id: 'x', type: 'plan', title: 't', version: '1.0.0', created: AT, body: 'b' }) }];
  assert.ok(okfValidator(good).valid);
});

test('OKF frontmatter survives build → refine (each file is still conformant)', async () => {
  const store = new InMemoryEventStore();
  await seed(store, 'conf');
  const built = await runBuild(store, 'conf', new FakeLLM({ structs: [{ files: [{ name: 'plan.md', body: '# ok' }] }] }), { at: AT });
  const builtCheck = okfValidator(built.files.map((f) => ({ path: f.name, content: f.content })));
  assert.ok(builtCheck.valid, 'build output is OKF-conformant');
  const ref = await runRefine(store, 'conf', new FakeLLM({ structs: [{ files: [{ name: 'plan.md', body: '# ok\n\n## new' }] }] }), { refineRequest: 'add section', at: AT });
  const refinedCheck = okfValidator(ref.files.map((f) => ({ path: f.name, content: f.content })));
  assert.ok(refinedCheck.valid, 'refine output is also OKF-conformant');
});

// ── 4 · content-hash integrity ───────────────────────────────────────────────

test('content hash changes detect tampering (corrupted refine)', async () => {
  const old = ok('a.md', 'orig');
  const tampered = ok('a.md', 'orig');
  assert.equal(contentHash(old.content), contentHash(tampered.content), 'same content — same hash');
  const changed = ok('a.md', 'modified');
  assert.notEqual(contentHash(old.content), contentHash(changed.content), 'different content — different hash');
});

// ── 5 · per-concept targeted refine ─────────────────────────────────────────

test('targeted regen: unchanged concept diffs as `unchanged` (preserves parent content)', async () => {
  const store = new InMemoryEventStore();
  await seed(store, 'target', 'balanced', 'plan');
  await runBuild(store, 'target', new FakeLLM({ structs: [{ files: [
    { name: 'plan.md', body: '# plan' },
    { name: 'diagram.md', format: 'diagram', body: '```mermaid\ngraph A\n```' },
  ] }] }), { at: AT });
  // Refine ONLY diagram.md — plan.md should be unchanged
  const ref = await runRefine(store, 'target', new FakeLLM({ structs: [{ files: [{ name: 'diagram.md', format: 'diagram', body: '```mermaid\ngraph A-->B\n```' }] }] }), { refineRequest: 'update diagram', conceptPath: 'diagram.md', at: AT });
  assert.equal(ref.files.length, 2, 'both files preserved');
  const planDiff = ref.diff.find((d) => d.path === 'plan.md');
  assert.equal(planDiff?.status, 'unchanged', 'plan.md is unchanged');
  const diagramDiff = ref.diff.find((d) => d.path === 'diagram.md');
  assert.equal(diagramDiff?.status, 'changed', 'diagram.md is changed');
});

test('refine replaces the parent file cleanly — full file set is produced', async () => {
  const store = new InMemoryEventStore();
  await seed(store, 'replace');
  await runBuild(store, 'replace', new FakeLLM({ structs: [{ files: [{ name: 'plan.md', body: '# old plan' }] }] }), { at: AT });
  const ref = await runRefine(store, 'replace', new FakeLLM({ structs: [{ files: [{ name: 'plan.md', body: '# new plan' }, { name: 'data.md', format: 'doc', body: '# Data model' }] }] }), { refineRequest: 'expand', at: AT });
  assert.equal(ref.files.length, 2, 'full rebuild produced a new file set');
  assert.equal(ref.diff.filter((d) => d.status === 'added').length, 1, 'data.md added');
  assert.equal(ref.diff.filter((d) => d.status === 'changed').length, 1, 'plan.md changed');
});

// ── 6 · label contract ──────────────────────────────────────────────────────

test('auto-label truncates long refine requests (>120 chars)', async () => {
  const store = new InMemoryEventStore();
  await seed(store, 'label');
  await runBuild(store, 'label', new FakeLLM({ structs: [{ files: [{ name: 'plan.md', body: 'x' }] }] }), { at: AT });
  const longRequest = 'A'.repeat(200);
  const ref = await runRefine(store, 'label', new FakeLLM({ structs: [{ files: [{ name: 'plan.md', body: '# new' }] }] }), { refineRequest: longRequest, at: AT });
  assert.ok(ref.label.length <= 120, 'label truncated to 120 chars');
  assert.equal(ref.label, 'A'.repeat(120));
});