import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide, governanceStop } from './decide.ts';
import { resolveSchema, requirednessOf } from './schema.ts';
import type { IntentRecord, IntentType, Risk, Slot, SlotState } from './types.ts';

// persona defaults to 'balanced' (→ medium rigor) so tests exercise refinement,
// not the persona gate; pass null to test the gate itself.
function rec(intentType: IntentType | null, slots: Record<string, Slot> = {}, rawInput = 'do a thing', persona: string | null = 'balanced', outcome: string | null = 'plan'): IntentRecord {
  return { id: 'x', version: 0, rawInput, intentType, persona, outcome, state: 'DRAFT', slots } as IntentRecord;
}

test('outcome gate: mode chosen but no outcome yet → ask_outcome', () => {
  const m = decide(rec('CHANGE', {}, 'migrate auth', 'balanced', null));
  assert.equal(m.length, 1);
  assert.equal(m[0].kind, 'ask_outcome');
});
function slot(key: string, state: SlotState): Slot {
  return { key, value: state === 'empty' ? null : 'a sufficiently long value', state };
}
function allRequiredStrong(type: IntentType, risk: Risk): IntentRecord {
  const slots: Record<string, Slot> = {};
  for (const d of resolveSchema(type)) if (requirednessOf(d, risk) === 'required') slots[d.key] = slot(d.key, 'strong');
  return rec(type, slots);
}

test('persona gate: a classified intent with no chosen mode → select_persona, nothing else', () => {
  const m = decide(rec('CHANGE', {}, 'migrate auth to OAuth', null));
  assert.equal(m.length, 1);
  assert.equal(m[0].kind, 'select_persona');
});

test('after a mode is chosen, refinement proceeds; thorough demands >= fast', () => {
  const fast = decide(rec('CHANGE', {}, 'x', 'fast'));
  const thorough = decide(rec('CHANGE', {}, 'x', 'thorough'));
  assert.notEqual(fast[0].kind, 'select_persona');
  assert.notEqual(thorough[0].kind, 'select_persona');
  assert.ok(thorough.length >= fast.length, 'higher rigor requires at least as many slots');
});

test('governance-stop pre-empts everything', () => {
  const m = decide(rec('CHANGE', {}, 'plan my grocery shopping'));
  assert.equal(m.length, 1);
  assert.equal(m[0].kind, 'governance_stop');
});

test('empty CHANGE record → objective is the first gap in the batch', () => {
  const m = decide(rec('CHANGE'));
  assert.ok(m.length > 1, 'batch returns all open gaps');
  assert.equal(m[0].kind, 'ask');
  assert.equal(m[0].slot, 'objective');
});

test('a conflict pre-empts open gaps', () => {
  const m = decide(rec('CHANGE', { objective: slot('objective', 'strong'), scope: slot('scope', 'conflicting') }));
  assert.equal(m[0].kind, 'surface_conflict');
  assert.equal(m[0].slot, 'scope');
});

test('clarify surfaces inferred-strong slots as verify moves alongside gaps', () => {
  const r = rec('CHANGE', { objective: { key: 'objective', value: 'an inferred objective', state: 'strong', inferred: true } });
  const m = decide(r);
  assert.ok(m.some((x) => x.kind === 'verify' && x.slot === 'objective'), 'assumed slot surfaced to verify');
  assert.ok(m.some((x) => x.kind === 'ask'), 'still asks the remaining gaps');
});

test('all required strong, not built → offer_build (ADR-0002 gate)', () => {
  assert.equal(decide(allRequiredStrong('CHANGE', 'medium'), 'medium')[0].kind, 'offer_build');
});

test('all required strong AND built → close (handoff-ready)', () => {
  const r = allRequiredStrong('CHANGE', 'medium');
  r.built = true;
  assert.equal(decide(r, 'medium')[0].kind, 'close');
});

test('gap state maps to move when it is the only gap: weak→ask, ambiguous→disambiguate', () => {
  const base = allRequiredStrong('CHANGE', 'medium');
  const withObj = (st: SlotState) => ({ ...base, slots: { ...base.slots, objective: slot('objective', st) } });
  assert.equal(decide(withObj('weak'))[0].kind, 'ask');
  assert.equal(decide(withObj('weak'))[0].slot, 'objective');
  assert.equal(decide(withObj('ambiguous'))[0].kind, 'disambiguate');
});

test('breadth before depth: an empty slot is asked before re-deepening a weak one', () => {
  const r = rec('CHANGE', { objective: slot('objective', 'weak') }); // objective weak, rest empty
  const m = decide(r);
  assert.equal(m[0].kind, 'ask');
  assert.notEqual(m[0].slot, 'objective');
});

test('batch: DECIDE returns all open required gaps at once (§3.11)', () => {
  const m = decide(rec('CHANGE')); // all empty
  const requiredCount = resolveSchema('CHANGE').filter((d) => requirednessOf(d, 'medium') === 'required').length;
  assert.equal(m.length, requiredCount);
  assert.ok(m.every((x) => !!x.slot));
});

test('terminal state short-circuits: APPROVED → handoff_complete, nothing re-opened', () => {
  const r = allRequiredStrong('CHANGE', 'medium');
  r.state = 'APPROVED';
  const m = decide(r);
  assert.equal(m.length, 1);
  assert.equal(m[0].kind, 'handoff_complete');
});

test('an APPROVED record with open gaps still short-circuits (no re-asking)', () => {
  const m = decide({ ...rec('CHANGE'), state: 'APPROVED' });
  assert.equal(m[0].kind, 'handoff_complete');
});

test('governanceStop is null for a legitimate enterprise intent', () => {
  assert.equal(governanceStop(rec('CHANGE', {}, 'migrate auth to OAuth 2.0')), null);
});

test('decide is a pure function — same input, same output', () => {
  const r = rec('CHANGE', { objective: slot('objective', 'weak') });
  assert.deepEqual(decide(r), decide(r));
});
