import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide, governanceStop } from './decide.ts';
import { resolveSchema, requirednessOf } from './schema.ts';
import type { IntentRecord, IntentType, Risk, Slot, SlotState } from './types.ts';

function rec(intentType: IntentType | null, slots: Record<string, Slot> = {}, rawInput = 'do a thing'): IntentRecord {
  return { id: 'x', version: 0, rawInput, intentType, state: 'DRAFT', slots };
}
function slot(key: string, state: SlotState): Slot {
  return { key, value: state === 'empty' ? null : 'a sufficiently long value', state };
}
function allRequiredStrong(type: IntentType, risk: Risk): IntentRecord {
  const slots: Record<string, Slot> = {};
  for (const d of resolveSchema(type)) if (requirednessOf(d, risk) === 'required') slots[d.key] = slot(d.key, 'strong');
  return rec(type, slots);
}

test('governance-stop pre-empts everything', () => {
  const m = decide(rec('CHANGE', {}, 'plan my grocery shopping'));
  assert.equal(m.length, 1);
  assert.equal(m[0].kind, 'governance_stop');
});

test('empty CHANGE record → ask the objective first (highest priority)', () => {
  const m = decide(rec('CHANGE'));
  assert.equal(m.length, 1);
  assert.equal(m[0].kind, 'ask');
  assert.equal(m[0].slot, 'objective');
});

test('a conflict pre-empts open gaps', () => {
  const m = decide(rec('CHANGE', { objective: slot('objective', 'strong'), scope: slot('scope', 'conflicting') }));
  assert.equal(m[0].kind, 'surface_conflict');
  assert.equal(m[0].slot, 'scope');
});

test('all required strong → close', () => {
  assert.equal(decide(allRequiredStrong('CHANGE', 'medium'), 'medium')[0].kind, 'close');
});

test('gap state maps to move: weak→ask (elicit specifics), ambiguous→disambiguate', () => {
  assert.equal(decide(rec('CHANGE', { objective: slot('objective', 'weak') }))[0].kind, 'ask');
  assert.equal(decide(rec('CHANGE', { objective: slot('objective', 'ambiguous') }))[0].kind, 'disambiguate');
});

test('never returns more than one move (MVP — not a barrage)', () => {
  assert.ok(decide(rec('REPORT')).length <= 1);
  assert.ok(decide(rec('CHANGE', { objective: slot('objective', 'strong') })).length <= 1);
});

test('governanceStop is null for a legitimate enterprise intent', () => {
  assert.equal(governanceStop(rec('CHANGE', {}, 'migrate auth to OAuth 2.0')), null);
});

test('decide is a pure function — same input, same output', () => {
  const r = rec('CHANGE', { objective: slot('objective', 'weak') });
  assert.deepEqual(decide(r), decide(r));
});
