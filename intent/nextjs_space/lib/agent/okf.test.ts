import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderOkf, parseOkf, contentHash, okfValidator } from './okf.ts';

const META = {
  id: 'INT-0001:plan.md',
  type: 'plan',
  title: 'Test Plan',
  version: '1.0.0',
  created: '2026-07-15T00:00:00.000Z',
  body: '# Plan\n\nDo the thing.',
};

test('renderOkf produces valid front-matter + body', () => {
  const md = renderOkf(META);
  assert.match(md, /^---\n/);
  assert.match(md, /okf_version: "1.0"/);
  assert.match(md, /type: plan/);
  assert.match(md, /# Plan/);
});

test('parseOkf extracts front-matter fields and body', () => {
  const md = renderOkf(META);
  const parsed = parseOkf(md);
  assert.equal(parsed.data['type'], 'plan');
  assert.equal(parsed.data['okf_version'], '1.0');
  assert.equal(parsed.data['title'], 'Test Plan');
  assert.match(parsed.body, /# Plan/);
});

test('parseOkf handles no front-matter gracefully', () => {
  const parsed = parseOkf('# Just body\n\nNo front-matter.');
  assert.deepEqual(parsed.data, {});
  assert.match(parsed.body, /Just body/);
});

test('parseOkf handles quoted values', () => {
  const md = '---\ntype: "plan"\ntitle: \'My Plan\'\n---\n\nBody';
  const parsed = parseOkf(md);
  assert.equal(parsed.data['type'], 'plan');
  assert.equal(parsed.data['title'], 'My Plan');
});

test('contentHash is deterministic and content-sensitive', () => {
  const h1 = contentHash('hello');
  const h2 = contentHash('hello');
  const h3 = contentHash('world');
  assert.equal(h1, h2, 'same content → same hash');
  assert.notEqual(h1, h3, 'different content → different hash');
  assert.equal(h1.length, 64, 'sha256 hex = 64 chars');
});

// ── okfValidator (OKF §9 conformance) ────────────────────────────────────────

test('okfValidator: valid bundle with one concept file passes', () => {
  const files = [{ path: 'plan.md', content: renderOkf(META) }];
  const result = okfValidator(files);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test('okfValidator: valid bundle with multiple concept files passes', () => {
  const files = [
    { path: 'plan.md', content: renderOkf({ ...META, type: 'plan' }) },
    { path: 'diagram.md', content: renderOkf({ ...META, type: 'diagram', id: 'INT-0001:diagram.md' }) },
  ];
  const result = okfValidator(files);
  assert.equal(result.valid, true);
});

test('okfValidator: empty bundle is rejected', () => {
  const result = okfValidator([]);
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /empty/i);
});

test('okfValidator: concept file without front-matter is rejected', () => {
  const files = [{ path: 'plan.md', content: '# No front-matter here' }];
  const result = okfValidator(files);
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /missing YAML front-matter/);
  assert.match(result.errors[0], /plan\.md/);
});

test('okfValidator: concept file with empty type is rejected', () => {
  const md = '---\nokf_version: "1.0"\nid: x\ntype:\ntitle: T\n---\n\nBody';
  const files = [{ path: 'plan.md', content: md }];
  const result = okfValidator(files);
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /missing required 'type'/);
});

test('okfValidator: concept file missing type field entirely is rejected', () => {
  const md = '---\nokf_version: "1.0"\nid: x\ntitle: T\n---\n\nBody';
  const files = [{ path: 'plan.md', content: md }];
  const result = okfValidator(files);
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /missing required 'type'/);
});

test('okfValidator: reserved index.md must not have front-matter', () => {
  const md = '---\ntype: index\n---\n\n# Directory\n\n* [Plan](plan.md)';
  const files = [{ path: 'index.md', content: md }];
  const result = okfValidator(files);
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /index\.md/);
  assert.match(result.errors[0], /must not have/);
});

test('okfValidator: reserved log.md must not have front-matter', () => {
  const md = '---\ntype: log\n---\n\n# Log\n\n## 2026-07-15\n* **Update**: built';
  const files = [{ path: 'log.md', content: md }];
  const result = okfValidator(files);
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /log\.md/);
});

test('okfValidator: valid index.md (no front-matter) passes', () => {
  const files = [
    { path: 'plan.md', content: renderOkf(META) },
    { path: 'index.md', content: '# Directory\n\n* [Plan](plan.md) - the plan' },
  ];
  const result = okfValidator(files);
  assert.equal(result.valid, true);
});

test('okfValidator: valid log.md (no front-matter) passes', () => {
  const files = [
    { path: 'plan.md', content: renderOkf(META) },
    { path: 'log.md', content: '# Update Log\n\n## 2026-07-15\n* **Update**: initial build' },
  ];
  const result = okfValidator(files);
  assert.equal(result.valid, true);
});

test('okfValidator: reports errors for ALL invalid files at once', () => {
  const files = [
    { path: 'plan.md', content: '# no fm' },
    { path: 'diagram.md', content: '---\ntitle: T\n---\n\nbody' },
  ];
  const result = okfValidator(files);
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 2, 'both errors reported');
});