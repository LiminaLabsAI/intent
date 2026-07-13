import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, assertTransition, IllegalTransitionError } from './lifecycle.ts';

test('legal transitions are allowed', () => {
  assert.ok(canTransition('DRAFT', 'IN_PROGRESS'));
  assert.ok(canTransition('IN_PROGRESS', 'UNDER_REVIEW'));
  assert.ok(canTransition('UNDER_REVIEW', 'APPROVED'));
  assert.ok(canTransition('NEEDS_CLARIFICATION', 'IN_PROGRESS'));
});

test('illegal transitions are rejected', () => {
  assert.equal(canTransition('DRAFT', 'APPROVED'), false);
  assert.equal(canTransition('APPROVED', 'IN_PROGRESS'), false);
  assert.equal(canTransition('ARCHIVED', 'IN_PROGRESS'), false);
});

test('assertTransition throws IllegalTransitionError on illegal moves', () => {
  assert.throws(() => assertTransition('DRAFT', 'APPROVED'), IllegalTransitionError);
  assert.doesNotThrow(() => assertTransition('DRAFT', 'IN_PROGRESS'));
});

test('the error carries from/to for auditability', () => {
  try {
    assertTransition('APPROVED', 'DRAFT');
    assert.fail('should have thrown');
  } catch (e) {
    assert.ok(e instanceof IllegalTransitionError);
    assert.equal(e.from, 'APPROVED');
    assert.equal(e.to, 'DRAFT');
  }
});
