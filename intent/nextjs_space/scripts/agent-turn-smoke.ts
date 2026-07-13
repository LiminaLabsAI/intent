/**
 * Phase 8 real-model smoke — one live agent turn against the HF router.
 * Run: node scripts/agent-turn-smoke.ts   (skips gracefully without HF_TOKEN)
 */

import { InMemoryEventStore } from '../lib/agent/store.ts';
import { HfLLM, DEFAULT_MODEL } from '../lib/agent/llm.ts';
import { runTurn } from '../lib/agent/turn.ts';
import { loadEnv } from '../lib/agent/env.ts';

async function main(): Promise<void> {
  loadEnv();
  if (!process.env.HF_TOKEN) {
    console.log('HF_TOKEN not set — skipping real-model smoke.');
    return;
  }
  const model = process.env.AGENT_MODEL ?? DEFAULT_MODEL;
  console.log(`Phase 8 live turn — model: ${model}\n`);

  const store = new InMemoryEventStore();
  const llm = new HfLLM();
  const res = await runTurn(store, 'INT-LIVE', 'Migrate our auth to OAuth', llm);

  console.log('intentType :', res.view.record.intentType);
  console.log('readiness  :', res.view.readiness.readiness, `(${res.view.readiness.requiredStrong}/${res.view.readiness.required})`);
  console.log('move       :', JSON.stringify(res.moves));
  console.log('\nagent reply:\n ', res.reply, '\n');

  const warn: string[] = [];
  if (res.view.record.intentType !== 'CHANGE') warn.push('expected CHANGE classification');
  if (res.moves.length > 2) warn.push('more than 2 moves (barrage)');
  if (warn.length) console.log('⚠ ', warn.join('; '));
  console.log('smoke OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
