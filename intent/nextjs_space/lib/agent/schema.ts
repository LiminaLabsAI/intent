/**
 * Phase 7 — The layered slot schema (§3.8) + the registry.
 *
 * Universal spine (always) + type templates (selected after classification).
 * Emergent slots are added per-record at runtime (not here). Each slot carries
 * its rubric (what makes it `strong`, §3.9) and a risk-weighted requiredness
 * matrix. This whole file is the *governed artifact* — deterministic, reviewable.
 */

import type { IntentType, Requiredness, Risk, SlotDef } from './types.ts';

/** Terse constructor for a requiredness matrix (low/medium/high). */
const req = (low: Requiredness, medium: Requiredness, high: Requiredness): Record<Risk, Requiredness> =>
  ({ low, medium, high });

// ── The universal spine (§3.9) ───────────────────────────────────────────────
export const SPINE_SLOTS: SlotDef[] = [
  {
    key: 'objective', label: 'Objective', layer: 'spine',
    describe: 'The one outcome that means "done".',
    rubric: 'A concrete end-state (not an activity), single (not blended), verifiable in principle.',
    requiredness: req('required', 'required', 'required'),
  },
  {
    key: 'scope', label: 'Scope', layer: 'spine',
    describe: 'The boundary of what is included.',
    rubric: 'Enumerated, bounded, and decidable — you can tell whether something is in or out.',
    requiredness: req('required', 'required', 'required'),
  },
  {
    key: 'out_of_scope', label: 'Out of scope', layer: 'spine',
    describe: 'Explicit exclusions.',
    rubric: 'Names the tempting-but-excluded, especially risk-adjacent exclusions.',
    requiredness: req('optional', 'recommended', 'required'),
  },
  {
    key: 'context', label: 'Context', layer: 'spine',
    describe: 'Environment, prerequisites, and constraints.',
    rubric: 'Covers what the objective depends on; states hard constraints (deadline/budget/tech/policy).',
    requiredness: req('recommended', 'required', 'required'),
  },
  {
    key: 'entities', label: 'Key items', layer: 'spine',
    describe: 'The specific things the intent touches.',
    rubric: 'Named specifically and resolvable to real assets; no dangling references.',
    requiredness: req('required', 'required', 'required'),
  },
  {
    key: 'acceptance_criteria', label: 'Outcome', layer: 'spine',
    describe: 'How we verify the objective is met.',
    rubric: 'Checkable output properties (Change/Create/Report), or an evidentiary bar (Analyze).',
    requiredness: req('recommended', 'required', 'required'),
  },
];

// ── Type templates (§3.8) ────────────────────────────────────────────────────
export const CHANGE_TEMPLATE: SlotDef[] = [
  {
    key: 'rollback', label: 'Rollback', layer: 'template',
    describe: 'The fallback if the change fails.',
    rubric: 'A concrete way to revert, or an explicit statement that it is one-way.',
    requiredness: req('recommended', 'required', 'required'),
  },
  {
    key: 'cutover_window', label: 'Cutover window', layer: 'template',
    describe: 'When the change lands and any downtime it needs.',
    rubric: 'A specific window and the coordination/downtime it requires.',
    requiredness: req('optional', 'recommended', 'required'),
  },
  {
    key: 'migration_path', label: 'How to move over', layer: 'template',
    describe: 'How existing data/users move to the new state.',
    rubric: 'A concrete plan for moving existing data/users without loss.',
    requiredness: req('recommended', 'required', 'required'),
  },
  {
    key: 'blast_radius', label: 'What could be affected', layer: 'template',
    describe: 'What is affected if this goes wrong.',
    rubric: 'Names downstream systems/users at risk if the change fails.',
    requiredness: req('recommended', 'required', 'required'),
  },
  {
    key: 'dependencies', label: 'Dependencies', layer: 'template',
    describe: 'Systems or work this depends on or must sequence with.',
    rubric: 'Names upstream/downstream dependencies and required ordering.',
    requiredness: req('optional', 'recommended', 'recommended'),
  },
];

export const REPORT_TEMPLATE: SlotDef[] = [
  {
    key: 'audience', label: 'Audience', layer: 'template',
    describe: 'Who reads it and the decision they make.',
    rubric: 'Names the reader and the decision — it drives depth, metrics, and format.',
    requiredness: req('required', 'required', 'required'),
  },
  {
    key: 'data_sources', label: 'Data sources', layer: 'template',
    describe: 'Which datasets/systems of record supply the numbers.',
    rubric: 'Names the specific systems of record / datasets.',
    requiredness: req('required', 'required', 'required'),
  },
  {
    key: 'metrics', label: 'Metrics', layer: 'template',
    describe: 'The specific metrics/KPIs to include.',
    rubric: 'Enumerates the metrics/KPIs, not just a topic.',
    requiredness: req('recommended', 'required', 'required'),
  },
  {
    key: 'period_cadence', label: 'Period & cadence', layer: 'template',
    describe: 'The time period and whether it recurs.',
    rubric: 'Unambiguous period (fiscal vs calendar, which year) and one-off vs recurring.',
    requiredness: req('required', 'required', 'required'),
  },
  {
    key: 'format', label: 'Format', layer: 'template',
    describe: 'Length, layout, and channel of the deliverable.',
    rubric: 'States the medium/length/layout expected.',
    requiredness: req('optional', 'recommended', 'recommended'),
  },
  {
    key: 'distribution', label: 'Distribution', layer: 'template',
    describe: 'Who may see it and how it is delivered.',
    rubric: 'States confidentiality/recipients and delivery channel.',
    requiredness: req('optional', 'recommended', 'required'),
  },
];

/** Templates by intent-type. CREATE/ANALYZE are spine-only until their templates land. */
export const TEMPLATES: Record<IntentType, SlotDef[]> = {
  CHANGE: CHANGE_TEMPLATE,
  REPORT: REPORT_TEMPLATE,
  CREATE: [],
  ANALYZE: [],
};

/** Resolve the full slot set for an intent type: spine + its template (§3.8). */
export function resolveSchema(type: IntentType | null): SlotDef[] {
  const template = type ? TEMPLATES[type] : [];
  return [...SPINE_SLOTS, ...template];
}

/** Requiredness of a slot at a given risk — the requiredness-matrix lookup (§3.9). */
export function requirednessOf(def: SlotDef, risk: Risk): Requiredness {
  return def.requiredness[risk];
}
