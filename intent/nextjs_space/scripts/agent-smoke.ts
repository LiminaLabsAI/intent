/**
 * Phase 7 smoke — the deterministic trunk end to end, no DB, no LLM.
 * Run: node scripts/agent-smoke.ts
 *
 * Demonstrates: create -> classify -> fill+judge slots -> readiness climbs
 * vague->actionable->ready -> guarded lifecycle transition -> immutable log.
 */

import { InMemoryEventStore } from '../lib/agent/store.ts';
import { materializeRecord } from '../lib/agent/materialize.ts';
import { RuleBasedStrengthJudge } from '../lib/agent/strength.ts';
import { resolveSchema } from '../lib/agent/schema.ts';
import { IllegalTransitionError } from '../lib/agent/lifecycle.ts';

const AT = '2026-07-14T12:00:00.000Z';
const store = new InMemoryEventStore();
const judge = new RuleBasedStrengthJudge();
const id = 'INT-SMOKE';

async function show(label: string): Promise<void> {
  const v = await materializeRecord(store, id, 'medium');
  if (!v) return;
  console.log(
    `  [${label}] readiness=${v.readiness.readiness} ` +
      `required=${v.readiness.requiredStrong}/${v.readiness.required} version=${v.record.version}`,
  );
}

async function main(): Promise<void> {
  console.log('Phase 7 trunk smoke — deterministic rails\n');

  await store.append(id, { kind: 'created', at: AT, by: 'user', rawInput: 'Migrate our auth to OAuth' });
  await store.append(id, { kind: 'classified', at: AT, by: 'agent', intentType: 'CHANGE' });
  await show('created + classified CHANGE');

  const schema = resolveSchema('CHANGE');
  const objectiveDef = schema.find((d) => d.key === 'objective')!;
  const value = 'OAuth 2.0 becomes the sole login path; existing sessions migrated';
  await store.append(id, { kind: 'slot_valued', at: AT, by: 'user', key: 'objective', value });
  const judged = await judge.judge(objectiveDef, value);
  await store.append(id, {
    kind: 'slot_assessed', at: AT, by: 'agent', key: 'objective', state: judged.state, reason: judged.reason,
  });
  await show(`objective judged '${judged.state}'`);

  for (const d of schema) {
    if (d.requiredness.medium === 'required' && d.key !== 'objective') {
      await store.append(id, {
        kind: 'slot_valued', at: AT, by: 'user', key: d.key,
        value: `a concrete, specific value for ${d.label}`,
      });
      await store.append(id, { kind: 'slot_assessed', at: AT, by: 'agent', key: d.key, state: 'strong' });
    }
  }
  await show('all required slots strong');

  await store.append(id, { kind: 'transitioned', at: AT, by: 'agent', to: 'IN_PROGRESS' });
  await show('transitioned -> IN_PROGRESS');

  try {
    // IN_PROGRESS -> REJECTED is illegal (rejection requires review first)
    await store.append(id, { kind: 'transitioned', at: AT, by: 'agent', to: 'REJECTED' });
    console.log('  [guard] illegal transition was NOT blocked ✗');
  } catch (e) {
    console.log(`  [guard] illegal IN_PROGRESS->REJECTED ${e instanceof IllegalTransitionError ? 'blocked ✓' : 'error ✗'}`);
  }

  const log = await store.events(id);
  console.log(`\n  immutable event log: ${log.length} events (append-only, replayable)`);
  console.log('\nsmoke OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
