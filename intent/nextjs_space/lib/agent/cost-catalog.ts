/**
 * ADR-0001 — the config-load seam. I/O at the EDGE: loads the cost config so it
 * can be passed INTO the pure function (which never queries). Today it returns
 * the versioned default; task #4 makes it read the DB (source of truth) and fall
 * back to this default when the DB is empty.
 */

import { defaultCatalog } from './cost-config.ts';
import type { CostModel, EstimationPrior, Persona } from './cost-config.ts';

export interface Catalog {
  models: CostModel[];
  personas: Persona[];
  priors: EstimationPrior[];
}

export async function loadCatalog(): Promise<Catalog> {
  return defaultCatalog();
}
