/**
 * ADR-0001 — seed the cost config from the versioned default catalog.
 *
 * Idempotent and NON-clobbering: `upsert` with an empty `update` creates rows
 * that are missing and leaves any existing (possibly admin-edited) rows
 * untouched. Safe to run repeatedly; contains no deletes.
 *
 *   run: set -a; . ./.env.local; set +a; npx tsx scripts/seed-cost.ts
 */

import { PrismaClient } from '@prisma/client';
import { DEFAULT_MODELS, DEFAULT_PERSONAS, DEFAULT_PRIORS } from '../lib/agent/cost-config.ts';

const prisma = new PrismaClient();

async function main() {
  for (const m of DEFAULT_MODELS) {
    await prisma.costModel.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id, name: m.name, provider: m.provider, priceIn: m.priceIn, priceOut: m.priceOut,
        contextWindow: m.contextWindow, maxOutput: m.maxOutput, tokenizerId: m.tokenizerId,
        cacheDiscount: m.cacheDiscount, reasoningMultiplier: m.reasoningMultiplier, sourceNote: m.sourceNote,
      },
    });
  }
  for (const p of DEFAULT_PERSONAS) {
    await prisma.persona.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id, name: p.name, label: p.label, modelRef: p.modelRef, temperature: p.temperature,
        reasoningDepth: p.reasoningDepth, promptStyle: p.promptStyle, retrieval: p.retrieval,
        budgetCeiling: p.budgetCeiling, visibleToUser: p.visibleToUser,
      },
    });
  }
  for (const pr of DEFAULT_PRIORS) {
    await prisma.estimationPrior.upsert({
      where: { refClass: pr.refClass },
      update: {},
      create: { refClass: pr.refClass, outLow: pr.outLow, outHigh: pr.outHigh, sampleSize: pr.sampleSize },
    });
  }
  const [models, personas, priors] = await Promise.all([
    prisma.costModel.count(), prisma.persona.count(), prisma.estimationPrior.count(),
  ]);
  console.log(`cost config seeded — models=${models} personas=${personas} priors=${priors}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
