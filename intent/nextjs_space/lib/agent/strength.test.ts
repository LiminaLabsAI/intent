import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessReadiness, RuleBasedStrengthJudge, detectContradictions, stateOf } from './strength.ts';
import { resolveSchema, requirednessOf } from './schema.ts';
import type { IntentRecord, IntentType, Risk, Slot, SlotState } from './types.ts';

function rec(intentType: IntentType | null, slots: Record<string, Slot> = {}): IntentRecord {
  return { id: 'x', version: 0, rawInput: '', intentType, state: 'DRAFT', slots };
}
function slot(key: string, state: SlotState): Slot {
  return { key, value: state === 'empty' ? null : 'a sufficiently long value', state };
}
/** Build a record whose every required slot (at `risk`) is strong. */
function allRequiredStrong(type: IntentType, risk: Risk): IntentRecord {
  const slots: Record<string, Slot> = {};
  for (const d of resolveSchema(type)) {
    if (requirednessOf(d, risk) === 'required') slots[d.key] = slot(d.key, 'strong');
  }
  return rec(type, slots);
}

test('empty record is vague', () => {
  assert.equal(assessReadiness(rec('CHANGE')).readiness, 'vague');
});

test('objective strong (others empty) is actionable', () => {
  const r = rec('CHANGE', { objective: slot('objective', 'strong') });
  assert.equal(assessReadiness(r, 'medium').readiness, 'actionable');
});

test('all required strong is ready', () => {
  assert.equal(assessReadiness(allRequiredStrong('CHANGE', 'medium'), 'medium').readiness, 'ready');
  assert.equal(assessReadiness(allRequiredStrong('REPORT', 'high'), 'high').readiness, 'ready');
});

test('any conflict forces vague even with a strong objective', () => {
  const r = rec('CHANGE', {
    objective: slot('objective', 'strong'),
    scope: slot('scope', 'conflicting'),
  });
  const report = assessReadiness(r, 'medium');
  assert.equal(report.readiness, 'vague');
  assert.deepEqual(report.conflicts, ['scope']);
});

test('readiness reports the required-set counts and gaps', () => {
  const r = rec('CHANGE', { objective: slot('objective', 'strong') });
  const report = assessReadiness(r, 'medium');
  assert.ok(report.required > 1);
  assert.equal(report.requiredStrong, 1);
  assert.ok(report.gaps.some((g) => g.key === 'entities' && g.state === 'empty'));
});

test('stateOf defaults untouched slots to empty', () => {
  assert.equal(stateOf(rec('CHANGE'), 'rollback'), 'empty');
});

test('rule-based judge classifies values deterministically', async () => {
  const j = new RuleBasedStrengthJudge();
  const def = resolveSchema('REPORT').find((d) => d.key === 'period_cadence')!;
  assert.equal((await j.judge(def, null)).state, 'empty');
  assert.equal((await j.judge(def, 'short')).state, 'weak');
  assert.equal((await j.judge(def, 'the Q2 sales figures for the board')).state, 'ambiguous');
  assert.equal((await j.judge(def, 'fiscal year 2026, April through June, one-off')).state, 'strong');
});

test('detectContradictions finds an out-of-scope item echoed in scope', () => {
  const r = rec('CHANGE', {
    scope: { key: 'scope', value: 'the billing service and the auth service', state: 'weak' },
    out_of_scope: { key: 'out_of_scope', value: 'the auth service', state: 'weak' },
  });
  assert.deepEqual(detectContradictions(r), ['the auth service']);
});
