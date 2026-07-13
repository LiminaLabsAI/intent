/**
 * Phase 7 — The lifecycle state machine (§4.5).
 *
 * Guarded transitions: illegal moves are impossible (they throw). The allowed
 * graph is the single source of truth; the append layer (store.ts) validates a
 * `transitioned` event against it before persisting.
 */

import type { LifecycleState } from './types.ts';

/** Allowed transitions. Anything not listed is illegal. */
export const TRANSITIONS: Record<LifecycleState, LifecycleState[]> = {
  DRAFT: ['IN_PROGRESS', 'ARCHIVED'],
  IN_PROGRESS: ['NEEDS_CLARIFICATION', 'UNDER_REVIEW', 'APPROVED', 'ARCHIVED'],
  NEEDS_CLARIFICATION: ['IN_PROGRESS', 'ARCHIVED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'NEEDS_CLARIFICATION', 'ARCHIVED'],
  APPROVED: ['ARCHIVED'],
  REJECTED: ['IN_PROGRESS', 'ARCHIVED'],
  ARCHIVED: [],
};

export function canTransition(from: LifecycleState, to: LifecycleState): boolean {
  return TRANSITIONS[from].includes(to);
}

export class IllegalTransitionError extends Error {
  from: LifecycleState;
  to: LifecycleState;
  constructor(from: LifecycleState, to: LifecycleState) {
    super(`Illegal lifecycle transition: ${from} -> ${to}`);
    this.name = 'IllegalTransitionError';
    this.from = from;
    this.to = to;
  }
}

/** Throw unless the transition is allowed. */
export function assertTransition(from: LifecycleState, to: LifecycleState): void {
  if (!canTransition(from, to)) throw new IllegalTransitionError(from, to);
}
