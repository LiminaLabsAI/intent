import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractJson } from './llm.ts';

test('extractJson parses clean JSON', () => {
  assert.deepEqual(extractJson('{"a":1,"b":"x"}'), { a: 1, b: 'x' });
});

test('extractJson unwraps a ```json fence around the whole object', () => {
  const t = 'Sure, here it is:\n```json\n{"files":[{"name":"plan.md"}]}\n```';
  assert.deepEqual(extractJson(t), { files: [{ name: 'plan.md' }] });
});

test('extractJson keeps the object intact when the BODY contains ``` fences (the incomplete-plan bug)', () => {
  // A real plan body has code fences (API request-body examples, mermaid, etc.).
  // The old fence-stripping regex grabbed an inner fence and truncated the plan.
  const body = '# Plan\n## API\nCreate Todo\nRequest Body:\n```json\n{"title":"x"}\n```\n## Schema\n...done.';
  const raw = JSON.stringify({ files: [{ name: 'plan.md', format: 'plan', body }] });
  const out = extractJson<{ files: { body: string }[] }>(raw);
  assert.equal(out.files.length, 1);
  assert.ok(out.files[0].body.includes('done.'), 'full body preserved, not cut at the inner ``` fence');
  assert.ok(out.files[0].body.includes('```json'), 'inner code fence kept verbatim');
});

test('extractJson handles a ```json wrapper AND inner body fences together', () => {
  const body = 'Diagram:\n```mermaid\nA-->B\n```\nEnd.';
  const inner = JSON.stringify({ files: [{ name: 'diagram.md', body }] });
  const out = extractJson<{ files: { body: string }[] }>('```json\n' + inner + '\n```');
  assert.ok(out.files[0].body.includes('End.'));
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
