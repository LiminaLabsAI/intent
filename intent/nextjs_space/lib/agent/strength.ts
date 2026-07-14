/**
 * Phase 7 — The strength function (§3.9): the Quality Gate made continuous.
 *
 * Readiness = f(slot states). Pure aggregation over the resolved schema's
 * REQUIRED slots at a given risk. One mechanism, three scopes: a slot's state,
 * the required-set (PASS/FAIL), and the whole-record Readiness band.
 *
 * `StrengthJudge` is the interface that turns a slot value into a state. The
 * rule-based impl here keeps Phase 7 deterministic; the constrained LLM judge
 * lands in Phase 8 (design §3.10) and implements the same interface.
 */

import type { IntentRecord, Readiness, Risk, Slot, SlotDef, SlotState } from './types.ts';
import { resolveSchema, requirednessOf } from './schema.ts';

/** A slot's current state on the record; untouched schema slots are 'empty'. */
export function stateOf(record: IntentRecord, key: string): SlotState {
  return record.slots[key]?.state ?? 'empty';
}

export interface ReadinessReport {
  readiness: Readiness;
  required: number;
  requiredStrong: number;
  gaps: { key: string; state: SlotState }[];
  conflicts: string[];
}

/**
 * Readiness bands:
 *   🟢 ready       — every required slot is `strong` and nothing conflicts
 *   🟡 actionable  — objective is `strong` and nothing conflicts, but a required slot is still weak/empty
 *   🔴 vague       — objective not `strong`, or any slot conflicts
 */
export function assessReadiness(record: IntentRecord, risk: Risk = record.risk ?? 'medium'): ReadinessReport {
  const schema = resolveSchema(record.intentType);
  const required = schema.filter((d) => requirednessOf(d, risk) === 'required');

  const gaps: { key: string; state: SlotState }[] = [];
  let requiredStrong = 0;
  for (const def of required) {
    const st = stateOf(record, def.key);
    if (st === 'strong') requiredStrong++;
    else gaps.push({ key: def.key, state: st });
  }

  const conflicts = schema
    .filter((d) => stateOf(record, d.key) === 'conflicting')
    .map((d) => d.key);
  const objectiveStrong = stateOf(record, 'objective') === 'strong';

  let readiness: Readiness;
  if (conflicts.length === 0 && required.length > 0 && requiredStrong === required.length) {
    readiness = 'ready';
  } else if (conflicts.length === 0 && objectiveStrong) {
    readiness = 'actionable';
  } else {
    readiness = 'vague';
  }

  return { readiness, required: required.length, requiredStrong, gaps, conflicts };
}

/** Judges a single slot value → state (+ reason/evidence). §3.9. */
export interface StrengthJudge {
  judge(def: SlotDef, value: string | null): Promise<Slot>;
}

/**
 * Deterministic, rule-based judge for Phase 7. Deliberately crude — it is the
 * scaffolding the LLM judge (Phase 8) will replace. Rules:
 *   - empty  → no value
 *   - weak   → too short to be specific
 *   - ambiguous → contains vague quantifiers / unresolved period refs (e.g. "Q2")
 *   - strong → otherwise
 */
export class RuleBasedStrengthJudge implements StrengthJudge {
  async judge(def: SlotDef, value: string | null): Promise<Slot> {
    const v = (value ?? '').trim();
    if (!v) return { key: def.key, value: null, state: 'empty', reason: 'no value provided' };
    if (v.length < 12) return { key: def.key, value: v, state: 'weak', reason: 'too short to be specific' };
    if (/\b(some|several|various|etc\.?|tbd|maybe|q[1-4])\b/i.test(v)) {
      return { key: def.key, value: v, state: 'ambiguous', reason: 'contains vague or ambiguous terms' };
    }
    return { key: def.key, value: v, state: 'strong', reason: 'meets rule-based rubric' };
  }
}

/**
 * Deterministic cross-slot contradiction check: any comma/semicolon-delimited
 * out-of-scope item that also appears in scope. Crude but auditable; the LLM
 * layer (Phase 8) refines it. Returns the conflicting fragments.
 */
export function detectContradictions(record: IntentRecord): string[] {
  const scope = (record.slots['scope']?.value ?? '').toLowerCase();
  const outScope = (record.slots['out_of_scope']?.value ?? '').toLowerCase();
  if (!scope || !outScope) return [];
  return outScope
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((t) => t.length > 3 && scope.includes(t));
}
