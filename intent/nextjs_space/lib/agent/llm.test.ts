import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractJson } from './llm.ts';

test('extractJson parses clean JSON', () => {
  assert.deepEqual(extractJson('{"a":1,"b":"x"}'), { a: 1, b: 'x' });
});

test('extractJson strips code fences and leading prose', () => {
  const t = 'Sure, here it is:\n```json\n{"files":[{"name":"plan.md"}]}\n```';
  assert.deepEqual(extractJson(t), { files: [{ name: 'plan.md' }] });
});

test('extractJson repairs a truncated object (the max_tokens cut that caused the bug)', () => {
  // A build response cut off mid-body — unterminated string + unclosed braces.
  const truncated = '{"files":[{"name":"plan.md","format":"plan","body":"# Plan\\n\\nStep one is to design the';
  const out = extractJson<{ files: { name: string; body: string }[] }>(truncated);
  assert.equal(out.files[0].name, 'plan.md');
  assert.ok(out.files[0].body.startsWith('# Plan'), 'partial body preserved');
});

test('extractJson throws a clean marker (never a raw JSON.parse message) on garbage', () => {
  assert.throws(() => extractJson('not json at all'), /MODEL_OUTPUT_UNPARSEABLE/);
});
