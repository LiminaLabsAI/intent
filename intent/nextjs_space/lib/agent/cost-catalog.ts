/**
 * ADR-0001 — the config-load seam. I/O at the EDGE: loads the cost config from
 * the DB (source of truth) so it can be passed INTO the pure function (which
 * never queries). Falls back to the versioned default when there's no database,
 * the tables are empty, or a query fails — so tests (no DATABASE_URL) and cold
 * environments still get a working advisory. Prisma is imported lazily so the
 * node --test path never instantiates a client.
 */

import { defaultCatalog } from './cost-config.ts';
import type { CostModel, EstimationPrior, Persona, PromptStyle, ReasoningDepth, RetrievalStrategy } from './cost-config.ts';

export interface Catalog {
  models: CostModel[];
  personas: Persona[];
  priors: EstimationPrior[];
}

export async function loadCatalog(): Promise<Catalog> {
  if (!process.env.DATABASE_URL) return defaultCatalog();
  try {
    const { prisma } = await import('../prisma.ts');
    const [models, personas, priors] = await Promise.all([
      prisma.costModel.findMany(),
      prisma.persona.findMany(),
      prisma.estimationPrior.findMany(),
    ]);
    if (models.length === 0 || personas.length === 0) return defaultCatalog();
    return {
      models: models.map(toCostModel),
      personas: personas.map(toPersona),
      priors: priors.length ? priors.map(toPrior) : defaultCatalog().priors,
    };
  } catch {
    return defaultCatalog();
  }
}

type Row = Record<string, unknown>;
function iso(v: unknown): string {
  return v instanceof Date ? v.toISOString() : String(v ?? '');
}
function toCostModel(r: Row): CostModel {
  return {
    id: String(r.id), name: String(r.name), provider: String(r.provider),
    priceIn: Number(r.priceIn), priceOut: Number(r.priceOut),
    contextWindow: Number(r.contextWindow), maxOutput: Number(r.maxOutput),
    tokenizerId: String(r.tokenizerId), cacheDiscount: Number(r.cacheDiscount),
    reasoningMultiplier: Number(r.reasoningMultiplier),
    updatedAt: iso(r.updatedAt), sourceNote: String(r.sourceNote ?? ''),
  };
}
function toPersona(r: Row): Persona {
  return {
    id: String(r.id), name: String(r.name), modelRef: String(r.modelRef),
    temperature: Number(r.temperature), reasoningDepth: String(r.reasoningDepth) as ReasoningDepth,
    promptStyle: String(r.promptStyle) as PromptStyle, retrieval: String(r.retrieval) as RetrievalStrategy,
    budgetCeiling: r.budgetCeiling == null ? null : Number(r.budgetCeiling),
    visibleToUser: Boolean(r.visibleToUser),
  };
}
function toPrior(r: Row): EstimationPrior {
  return { refClass: String(r.refClass), outLow: Number(r.outLow), outHigh: Number(r.outHigh), sampleSize: Number(r.sampleSize), updatedAt: iso(r.updatedAt) };
}
