/**
 * Phase 13 (ADR-0002 amendment) — the BUILD RUN.
 * Phase 14 (ADR-0003) — the REFINE RUN (cyclic refinement loop).
 *
 * One analysis pass that writes the DELIVERABLE for the intent — 1+ OKF markdown
 * files named by the chosen outcome (plan / diagram / script / doc) — and stamps
 * the model's ACTUAL token usage → actual cost (vs the pre-build estimate). The
 * Understanding fields are already filled live during clarify; this produces the
 * files. Idempotent. Server/script only (loads the cost catalog).
 *
 * Phase 14 adds `runRefine`: after a build, any user message is a change request.
 * Full re-build by default (correct-by-construction, no stale-file bugs); targeted
 * single-concept regen when `conceptPath` is set. Returns the new files + a
 * per-concept "what changed" diff (content-hash based). PURE — testable with
 * FakeLLM + InMemoryEventStore; the BundleVersion DRAFT is persisted by the caller.
 */

import type { IntentEventStore } from './store.ts';
import type { LLM } from './llm.ts';
import type { IntentEvent, IntentRecord, PlanFile } from './types.ts';
import { renderOkf, contentHash } from './okf.ts';
import { loadCatalog } from './cost-catalog.ts';
import { recommendPersona } from './cost.ts';

export interface ConceptDiff {
  path: string;
  status: 'added' | 'changed' | 'unchanged' | 'removed';
}

interface BuildOut {
  files?: { name?: string; format?: string; body?: string }[];
}

function recordSummary(record: IntentRecord): string {
  const lines: string[] = [`intent: ${record.rawInput}`, `type: ${record.intentType ?? 'unclassified'}`, `desired outcome: ${record.outcome ?? 'plan'}`];
  for (const [k, s] of Object.entries(record.slots)) if (s.value) lines.push(`- ${k}: ${s.value}`);
  return lines.join('\n');
}

function system(outcome: string): string {
  return `You are the BUILD stage of an intent studio. Produce the DELIVERABLE for this intent as the outcome type "${outcome}".
Output ONLY JSON: {"files":[{"name":"<name>.md","format":"plan|diagram|script|doc","body":"<markdown>"}]}
- Name each file by the outcome: plan.md, diagram.md, script.md, doc.md. Produce ONE file, or MORE when the scenario genuinely needs it (e.g. an app plan → plan.md + data-model.md), each named accordingly.
- body is markdown. For a diagram → a \`\`\`mermaid code block. For a script → a fenced code block. For a plan/doc → clear structured sections.
- Ground everything strictly in the record below; do NOT invent requirements. This is for any domain, not only software.`;
}

const OUTCOME_TITLE: Record<string, string> = {
  plan: 'Execution plan', diagram: 'Diagram', script: 'Script', doc: 'Document',
};

// A full deliverable is far larger than a clarify turn — size the completion so
// the JSON isn't truncated mid-body (the cause of "Unexpected end of JSON input").
const BUILD_MAX_TOKENS = 8000;

/** Run the build generation with one retry — model JSON can occasionally come
 * back malformed/truncated; a single re-ask usually clears it. */
async function generateBuild(llm: LLM, outcome: string, summary: string) {
  try {
    return await llm.generateStructuredWithUsage<BuildOut>(system(outcome), summary, { maxTokens: BUILD_MAX_TOKENS });
  } catch {
    return await llm.generateStructuredWithUsage<BuildOut>(system(outcome), summary, { maxTokens: BUILD_MAX_TOKENS });
  }
}

/**
 * Run the build. Composes 1+ OKF files from the record + outcome, then emits a
 * `plan_built` event carrying the files + measured actual cost. Idempotent.
 */
export async function runBuild(
  store: IntentEventStore,
  id: string,
  llm: LLM,
  opts: { at?: string; by?: string; force?: boolean } = {},
): Promise<IntentRecord> {
  const at = opts.at ?? new Date().toISOString();
  const by = opts.by ?? 'agent';
  let record = await store.load(id);
  if (!record) throw new Error(`no record for ${id}`);
  // Idempotent by default; `force` regenerates the files (e.g. the user edited a
  // field and asked to rebuild). A fresh `plan_built` event overwrites on replay.
  if (record.built && !opts.force) return record;

  const outcome = record.outcome ?? 'plan';
  const { data: out, usage } = await generateBuild(llm, outcome, recordSummary(record));

  const files: PlanFile[] = (out.files ?? [])
    .filter((f) => f && f.name && f.body && String(f.body).trim() !== '')
    .map((f) => {
      const format = String(f.format ?? outcome);
      return {
        name: String(f.name),
        format,
        content: renderOkf({
          id: `${id}:${f.name}`,
          type: format,
          title: OUTCOME_TITLE[format] ?? 'Deliverable',
          version: '1.0.0',
          created: at,
          body: String(f.body),
        }),
      };
    });

  // Don't record a "successful" build with nothing to show — fail so the caller
  // can surface a friendly retry instead of an empty Artifacts panel.
  if (files.length === 0) throw new Error('BUILD_PRODUCED_NO_FILES');

  // Actual cost = measured usage × the selected persona's model price (ADR-0002).
  const catalog = await loadCatalog();
  const personaName = record.persona ?? recommendPersona(record.risk ?? 'medium', record.complexity ?? 'moderate', catalog.personas).name;
  const persona = catalog.personas.find((p) => p.name === personaName) ?? catalog.personas[0];
  const model = catalog.models.find((m) => m.id === persona?.modelRef) ?? catalog.models[0];
  const actualCost = model
    ? Math.round(((usage.inputTokens * model.priceIn + usage.outputTokens * model.priceOut) / 1e6) * 100000) / 100000
    : 0;

  const events: IntentEvent[] = [{ kind: 'plan_built', at, by, files, actualCost, currency: 'USD' }];
  for (const e of events) record = await store.append(id, e);
  return record;
}

// ── Phase 14: The REFINE RUN (cyclic refinement, ADR-0003) ───────────────────

function refineSystem(outcome: string, existingFiles: PlanFile[], refineRequest: string, conceptPath?: string): string {
  const filesBlock = existingFiles.map((f) => `### ${f.name}\n\n${f.content}`).join('\n\n---\n\n');
  if (conceptPath) {
    const existing = existingFiles.find((f) => f.name === conceptPath);
    return `You are the REFINE stage of an intent studio. The user asked to change ONE file ("${conceptPath}"). Regenerate ONLY that file to reflect the change. Keep all other files unchanged.
Existing file "${conceptPath}":
${existing?.content ?? 'NOT FOUND'}

User's change request: ${refineRequest}
Output ONLY JSON: {"files":[{"name":"${conceptPath}","format":"${existing?.format ?? outcome}","body":"<markdown>"}]}`;
  }
  return `You are the REFINE stage of an intent studio. The user reviewed the built deliverable and asked for changes. Regenerate the FULL deliverable reflecting those changes.

Current deliverable files:
${filesBlock}

User's change request: ${refineRequest}

Output ONLY JSON: {"files":[{"name":"<name>.md","format":"plan|diagram|script|doc","body":"<markdown>"}]}
- Apply the user's changes while preserving the overall structure. The record + change request are the source of truth.`;
}

/** Compute a per-concept diff from old vs new file sets by content hash. PURE. */
export function fileDiff(oldFiles: PlanFile[], newFiles: PlanFile[]): ConceptDiff[] {
  const oldMap = new Map(oldFiles.map((f) => [f.name, contentHash(f.content)]));
  const newMap = new Map(newFiles.map((f) => [f.name, contentHash(f.content)]));
  const allPaths = new Set([...oldMap.keys(), ...newMap.keys()]);
  const diffs: ConceptDiff[] = [];
  for (const path of allPaths) {
    const oh = oldMap.get(path);
    const nh = newMap.get(path);
    if (nh && !oh) diffs.push({ path, status: 'added' });
    else if (!nh && oh) diffs.push({ path, status: 'removed' });
    else if (nh && oh && nh !== oh) diffs.push({ path, status: 'changed' });
    else diffs.push({ path, status: 'unchanged' });
  }
  return diffs.sort((a, b) => a.path.localeCompare(b.path));
}

/** Snapshot the Understanding as a simple key→value map (provenance for Phase 15). */
function snapshotUnderstanding(record: IntentRecord): Record<string, string> {
  const snap: Record<string, string> = {};
  for (const [k, s] of Object.entries(record.slots)) {
    if (s.value) snap[k] = s.value;
  }
  return snap;
}

export interface RefineResult {
  record: IntentRecord;
  files: PlanFile[];
  label: string;
  diff: ConceptDiff[];
  actualCost: number;
  understanding: Record<string, string>;
}

/**
 * Run a refine — regenerate the deliverable with the user's change request applied.
 * Full re-build by default (no stale-file bugs); targeted single-concept regen
 * when `conceptPath` is set (compose: parent files + newly-generated concept).
 * Emits a `plan_built` event (record.files updates for the current-state view);
 * the caller persists the immutable BundleVersion DRAFT. PURE (no Prisma).
 */
export async function runRefine(
  store: IntentEventStore,
  id: string,
  llm: LLM,
  opts: {
    refineRequest: string;
    conceptPath?: string;
    at?: string;
    by?: string;
  },
): Promise<RefineResult> {
  const at = opts.at ?? new Date().toISOString();
  const by = opts.by ?? 'user';

  let record = await store.load(id);
  if (!record) throw new Error(`no record for ${id}`);
  if (!record.built) throw new Error('NOT_YET_BUILT — refine requires an existing build');

  const outcome = record.outcome ?? 'plan';
  const oldFiles = record.files;

  // Generate new/updated files via the LLM
  const sys = refineSystem(outcome, oldFiles, opts.refineRequest, opts.conceptPath);
  const { data: genOut, usage: genUsage } = await (async () => {
    try {
      return await llm.generateStructuredWithUsage<BuildOut>(sys, recordSummary(record), { maxTokens: 8000 });
    } catch {
      return await llm.generateStructuredWithUsage<BuildOut>(sys, recordSummary(record), { maxTokens: 8000 });
    }
  })();

  const generated: PlanFile[] = (genOut.files ?? [])
    .filter((f) => f && f.name && f.body && String(f.body).trim() !== '')
    .map((f) => {
      const format = String(f.format ?? outcome);
      return {
        name: String(f.name),
        format,
        content: renderOkf({
          id: `${id}:${f.name}`,
          type: format,
          title: OUTCOME_TITLE[format] ?? 'Deliverable',
          version: '1.0.0',
          created: at,
          body: String(f.body),
        }),
      };
    });

  if (generated.length === 0) throw new Error('REFINE_PRODUCED_NO_FILES');

  // Compose the final file set
  let finalFiles: PlanFile[];
  if (opts.conceptPath) {
    // Targeted: replace only the regenerated concept; keep the rest from parent
    finalFiles = oldFiles.filter((f) => f.name !== opts.conceptPath);
    finalFiles.push(...generated);
  } else {
    // Full re-build: use all generated files
    finalFiles = generated;
  }

  // Actual cost
  const catalog = await loadCatalog();
  const personaName = record.persona ?? recommendPersona(record.risk ?? 'medium', record.complexity ?? 'moderate', catalog.personas).name;
  const persona = catalog.personas.find((p) => p.name === personaName) ?? catalog.personas[0];
  const model = catalog.models.find((m) => m.id === persona?.modelRef) ?? catalog.models[0];
  const actualCost = model
    ? Math.round(((genUsage.inputTokens * model.priceIn + genUsage.outputTokens * model.priceOut) / 1e6) * 100000) / 100000
    : 0;

  // Emit plan_built event (record.files updates for current-state view; the
  // non-destructive history is handled by the BundleVersion rows the caller creates)
  record = await store.append(id, { kind: 'plan_built', at, by, files: finalFiles, actualCost, currency: 'USD' });

  const diff = fileDiff(oldFiles, finalFiles);
  const label = opts.refineRequest.slice(0, 120);
  const understanding = snapshotUnderstanding(record);

  return { record, files: finalFiles, label, diff, actualCost, understanding };
}
