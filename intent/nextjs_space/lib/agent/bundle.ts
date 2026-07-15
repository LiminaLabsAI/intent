/**
 * Phase 14 (ADR-0003) — Knowledge Bundle state machine.
 *
 * Operations on the BundleVersion lifecycle (DRAFT → PUBLISHED → SUPERSEDED …)
 * over Prisma. The Intent Registry holds Intents; bundles are versioned outputs.
 * Two-tier history: drafts (append-only checkpoints) + published versions
 * (immutable, citable). Nothing is ever mutated or deleted — "revert" is
 * forward (restore-as-draft). PURE logic over Prisma; the API routes are thin
 * wrappers. Server-only (imports prisma).
 */

import { prisma } from '../prisma.ts';
import { Prisma } from '@prisma/client';
import { parseOkf, contentHash, okfValidator } from './okf.ts';
import type { PlanFile, IntentRecord } from './types.ts';
import { replay } from './events.ts';

// ── Types ────────────────────────────────────────────────────────────────────

export type BundleVersionState = 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED' | 'DEPRECATED' | 'ARCHIVED';

export interface ConceptFileView {
  path: string;
  contentHash: string;
  frontmatter: Record<string, string>;
  body: string;
  okfType: string;
  content: string; // full file (frontmatter + body)
}

export interface BundleVersionView {
  id: string;
  versionNo: number | null;
  state: BundleVersionState;
  parentVersionId: string | null;
  label: string;
  outcome: string | null;
  personaLabel: string | null;
  costActual: { amount: number; currency: string } | null;
  understandingSnapshot: Record<string, string>;
  builtAt: string;
  publishedAt: string | null;
  supersededByVersionId: string | null;
  concepts: ConceptFileView[];
}

export interface BundleView {
  id: string;
  intentId: string;
  draftHeadVersionId: string | null;
  latestPublishedVersionId: string | null;
  versions: BundleVersionView[];
  drafts: BundleVersionView[];
  published: BundleVersionView[];
}

export interface ConceptDiff {
  path: string;
  status: 'added' | 'changed' | 'unchanged' | 'removed';
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toConceptFileView(cf: {
  path: string;
  contentHash: string;
  frontmatter: unknown;
  body: string;
  okfType: string;
}): ConceptFileView {
  return {
    path: cf.path,
    contentHash: cf.contentHash,
    frontmatter: (cf.frontmatter as Record<string, string>) ?? {},
    body: cf.body,
    okfType: cf.okfType,
    content: cf.body, // We store body separately; content is reconstructed if needed
  };
}

function toVersionView(v: {
  id: string;
  versionNo: number | null;
  state: string;
  parentVersionId: string | null;
  label: string;
  outcome: string | null;
  personaLabel: string | null;
  costActual: unknown;
  understandingSnapshot: unknown;
  builtAt: Date;
  publishedAt: Date | null;
  supersededByVersionId: string | null;
  concepts: Array<{
    path: string;
    contentHash: string;
    frontmatter: unknown;
    body: string;
    okfType: string;
  }>;
}): BundleVersionView {
  return {
    id: v.id,
    versionNo: v.versionNo,
    state: v.state as BundleVersionState,
    parentVersionId: v.parentVersionId,
    label: v.label,
    outcome: v.outcome,
    personaLabel: v.personaLabel,
    costActual: (v.costActual as { amount: number; currency: string }) ?? null,
    understandingSnapshot: (v.understandingSnapshot as Record<string, string>) ?? {},
    builtAt: v.builtAt.toISOString(),
    publishedAt: v.publishedAt?.toISOString() ?? null,
    supersededByVersionId: v.supersededByVersionId,
    concepts: v.concepts.map(toConceptFileView),
  };
}

function snapshotUnderstanding(record: IntentRecord): Record<string, string> {
  const snap: Record<string, string> = {};
  for (const [k, s] of Object.entries(record.slots)) {
    if (s.value) snap[k] = s.value;
  }
  return snap;
}

// ── Lazy migration: seed a DRAFT from existing record.files ────────────────

async function seedDraftFromRecord(
  bundleId: string,
  intentId: string,
  record: IntentRecord,
  by: string,
): Promise<string | null> {
  if (!record.files || record.files.length === 0) return null;

  const at = new Date().toISOString();
  const concepts = record.files.map((f) => {
    const parsed = parseOkf(f.content);
    return {
      path: f.name,
      contentHash: contentHash(f.content),
      frontmatter: parsed.data as Prisma.InputJsonValue,
      body: parsed.body,
      okfType: parsed.data['type'] ?? f.format,
    };
  });

  const version = await prisma.bundleVersion.create({
    data: {
      bundleId,
      versionNo: null,
      state: 'DRAFT',
      label: 'Initial build (migrated)',
      understandingSnapshot: snapshotUnderstanding(record) as Prisma.InputJsonValue,
      costActual: record.actualCost != null
        ? { amount: record.actualCost, currency: 'USD' } as unknown as Prisma.InputJsonValue
        : Prisma.JsonNull,
      personaLabel: record.persona ?? null,
      outcome: record.outcome ?? null,
      createdById: by,
      builtAt: new Date(record.version > 0 ? at : at),
      concepts: { create: concepts },
    },
  });

  await prisma.knowledgeBundle.update({
    where: { id: bundleId },
    data: { draftHeadVersionId: version.id },
  });

  return version.id;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get or create the bundle for an intent. Lazy-migrates: if the intent has a
 * built record (`plan_built` events) but no bundle yet, seeds a DRAFT from the
 * current `record.files`.
 */
export async function getOrCreateBundle(intentId: string, record?: IntentRecord, by = 'system'): Promise<{ id: string; draftHeadVersionId: string | null; latestPublishedVersionId: string | null }> {
  const existing = await prisma.knowledgeBundle.findUnique({ where: { intentId } });
  if (existing) return existing;

  const bundle = await prisma.knowledgeBundle.create({
    data: { intentId },
  });

  // Lazy migration: seed a DRAFT if the intent was already built (Phase 13 data)
  if (record?.built && record.files?.length > 0) {
    await seedDraftFromRecord(bundle.id, intentId, record, by);
  }

  return await prisma.knowledgeBundle.findUnique({ where: { id: bundle.id } }) ?? bundle;
}

/**
 * Append a new DRAFT to the bundle (from a refine/build run). The parent is the
 * current draftHead (lineage). Concepts are stored from the rendered OKF files.
 * Returns the new version id.
 */
export async function createDraft(
  intentId: string,
  files: PlanFile[],
  opts: {
    label?: string;
    understanding?: Record<string, string>;
    costActual?: { amount: number; currency: string };
    personaLabel?: string;
    outcome?: string;
    by?: string;
    parentVersionId?: string | null; // defaults to current draftHead
  } = {},
): Promise<string> {
  const bundle = await getOrCreateBundle(intentId);
  const by = opts.by ?? 'agent';
  const at = new Date();

  const conceptData = files.map((f) => {
    const parsed = parseOkf(f.content);
    return {
      path: f.name,
      contentHash: contentHash(f.content),
      frontmatter: parsed.data as Prisma.InputJsonValue,
      body: parsed.body,
      okfType: parsed.data['type'] ?? f.format,
    };
  });

  const parentVersionId = opts.parentVersionId !== undefined ? opts.parentVersionId : bundle.draftHeadVersionId;

  const version = await prisma.bundleVersion.create({
    data: {
      bundleId: bundle.id,
      versionNo: null,
      state: 'DRAFT',
      parentVersionId: parentVersionId ?? null,
      label: opts.label ?? 'Refine',
      understandingSnapshot: (opts.understanding ?? {}) as Prisma.InputJsonValue,
      costActual: opts.costActual
        ? (opts.costActual as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      personaLabel: opts.personaLabel ?? null,
      outcome: opts.outcome ?? null,
      createdById: by,
      builtAt: at,
      concepts: { create: conceptData },
    },
  });

  await prisma.knowledgeBundle.update({
    where: { id: bundle.id },
    data: { draftHeadVersionId: version.id },
  });

  return version.id;
}

/**
 * Publish the current draftHead as an immutable, citable version (vN+1).
 * Auto-supersedes the prior latestPublished. Rejects if the bundle isn't OKF-conformant.
 * Returns the new published version id + version number.
 */
export async function publishDraft(
  intentId: string,
  opts: { name?: string; by?: string } = {},
): Promise<{ versionId: string; versionNo: number }> {
  const bundle = await getOrCreateBundle(intentId);
  if (!bundle.draftHeadVersionId) throw new Error('NO_DRAFT_TO_PUBLISH');

  // Load the draft + its concepts
  const draft = await prisma.bundleVersion.findUniqueOrThrow({
    where: { id: bundle.draftHeadVersionId },
    include: { concepts: true },
  });

  // OKF conformance gate (OKF §9)
  const okfFiles = draft.concepts.map((c) => ({
    path: c.path,
    content: `---\n${Object.entries(c.frontmatter as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join('\n')}\n---\n\n${c.body}`,
  }));
  const validation = okfValidator(okfFiles);
  if (!validation.valid) {
    throw new Error(`OKF_VALIDATION_FAILED: ${validation.errors.join('; ')}`);
  }

  // Determine the next version number
  const priorLatest = bundle.latestPublishedVersionId;
  let nextNo = 1;
  if (priorLatest) {
    const prior = await prisma.bundleVersion.findUniqueOrThrow({ where: { id: priorLatest } });
    nextNo = (prior.versionNo ?? 0) + 1;
  }

  const at = new Date();
  const by = opts.by ?? 'user';

  // Promote draft → PUBLISHED (in-place state change — the draft row *becomes* published,
  // not a copy. The draft was already an immutable row; its state transitions DRAFT→PUBLISHED.)
  await prisma.bundleVersion.update({
    where: { id: draft.id },
    data: {
      state: 'PUBLISHED',
      versionNo: nextNo,
      publishedAt: at,
      // Rename the label to the user-supplied name if provided
      ...(opts.name ? { label: opts.name } : {}),
    },
  });

  // Auto-supersede the prior latest published version
  if (priorLatest) {
    await prisma.bundleVersion.update({
      where: { id: priorLatest },
      data: {
        state: 'SUPERSEDED',
        supersededByVersionId: draft.id,
      },
    });
  }

  // Update the bundle's latestPublished pointer; clear draftHead (needs a new draft to publish again)
  await prisma.knowledgeBundle.update({
    where: { id: bundle.id },
    data: {
      latestPublishedVersionId: draft.id,
      draftHeadVersionId: null, // no draft until the next refine/restore
    },
  });

  return { versionId: draft.id, versionNo: nextNo };
}

/**
 * Spawn a new DRAFT seeded from any version's content (the "revert" that's
 * actually a forward fork — history is never mutated). Sets draftHead.
 */
export async function restoreAsDraft(
  versionId: string,
  opts: { by?: string } = {},
): Promise<string> {
  const source = await prisma.bundleVersion.findUniqueOrThrow({
    where: { id: versionId },
    include: { concepts: true, bundle: true },
  });

  const by = opts.by ?? 'user';
  const at = new Date();

  // Copy concepts (same content → same hashes; dedup is natural)
  const conceptData = source.concepts.map((c) => ({
    path: c.path,
    contentHash: c.contentHash,
    frontmatter: c.frontmatter as Prisma.InputJsonValue,
    body: c.body,
    okfType: c.okfType,
  }));

  const newDraft = await prisma.bundleVersion.create({
    data: {
      bundleId: source.bundleId,
      versionNo: null,
      state: 'DRAFT',
      parentVersionId: versionId, // lineage: restored from this version
      label: `Restored from ${source.versionNo ? `v${source.versionNo}` : 'draft'}`,
      understandingSnapshot: source.understandingSnapshot as Prisma.InputJsonValue,
      costActual: source.costActual ?? Prisma.JsonNull,
      personaLabel: source.personaLabel,
      outcome: source.outcome,
      createdById: by,
      builtAt: at,
      concepts: { create: conceptData },
    },
  });

  await prisma.knowledgeBundle.update({
    where: { id: source.bundleId },
    data: { draftHeadVersionId: newDraft.id },
  });

  return newDraft.id;
}

/** Flag a published version as deprecated (kept visible with a banner). */
export async function deprecateVersion(versionId: string): Promise<void> {
  await prisma.bundleVersion.update({
    where: { id: versionId },
    data: { state: 'DEPRECATED' },
  });
}

/** Soft-hide a version (admin/audit only; content unchanged). */
export async function archiveVersion(versionId: string): Promise<void> {
  await prisma.bundleVersion.update({
    where: { id: versionId },
    data: { state: 'ARCHIVED' },
  });
}

/**
 * Load the full bundle with all versions + concepts, partitioned into
 * drafts and published for the API/UI.
 */
export async function getBundle(intentId: string): Promise<BundleView | null> {
  const bundle = await prisma.knowledgeBundle.findUnique({
    where: { intentId },
    include: {
      versions: {
        orderBy: { builtAt: 'desc' },
        include: { concepts: true },
      },
    },
  });
  if (!bundle) return null;

  const versions = bundle.versions.map(toVersionView);
  return {
    id: bundle.id,
    intentId: bundle.intentId,
    draftHeadVersionId: bundle.draftHeadVersionId,
    latestPublishedVersionId: bundle.latestPublishedVersionId,
    versions,
    drafts: versions.filter((v) => v.state === 'DRAFT'),
    published: versions.filter((v) => ['PUBLISHED', 'SUPERSEDED', 'DEPRECATED', 'ARCHIVED'].includes(v.state)),
  };
}

/**
 * Load a single version with its concepts. For the version viewer / shareable link.
 */
export async function getVersion(versionId: string): Promise<BundleVersionView | null> {
  const v = await prisma.bundleVersion.findUnique({
    where: { id: versionId },
    include: { concepts: true },
  });
  if (!v) return null;
  return toVersionView(v);
}

/**
 * Compute a per-concept diff between two versions by content hash.
 * `added` = path in child but not parent; `changed` = same path, different hash;
 * `unchanged` = same path, same hash; `removed` = path in parent but not child.
 */
export async function computeDiff(parentVersionId: string, childVersionId: string): Promise<ConceptDiff[]> {
  const [parent, child] = await Promise.all([
    prisma.conceptFile.findMany({ where: { versionId: parentVersionId } }),
    prisma.conceptFile.findMany({ where: { versionId: childVersionId } }),
  ]);
  const parentMap = new Map(parent.map((c) => [c.path, c.contentHash]));
  const childMap = new Map(child.map((c) => [c.path, c.contentHash]));
  const allPaths = new Set([...parentMap.keys(), ...childMap.keys()]);
  const diffs: ConceptDiff[] = [];
  for (const path of allPaths) {
    const ph = parentMap.get(path);
    const ch = childMap.get(path);
    if (ch && !ph) diffs.push({ path, status: 'added' });
    else if (!ch && ph) diffs.push({ path, status: 'removed' });
    else if (ch && ph && ch !== ph) diffs.push({ path, status: 'changed' });
    else diffs.push({ path, status: 'unchanged' });
  }
  return diffs.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Autogenerate an OKF-conformant `log.md` content from the bundle's published
 * version history (OKF §7: date-grouped, newest first, bold action words).
 */
export async function autogenLogMd(intentId: string): Promise<string> {
  const bundle = await getBundle(intentId);
  if (!bundle) return '# Update Log\n';
  const entries: string[] = ['# Update Log'];
  // Group by date (YYYY-MM-DD), newest first
  const byDate = new Map<string, string[]>();
  for (const v of bundle.published) {
    const date = v.publishedAt ?? v.builtAt;
    const day = date.slice(0, 10);
    if (!byDate.has(day)) byDate.set(day, []);
    const action = v.versionNo === 1 ? 'Creation' : 'Update';
    const name = v.label ? ` — ${v.label}` : '';
    byDate.get(day)!.push(`* **${action}**: v${v.versionNo}${name}`);
  }
  for (const [day, lines] of [...byDate.entries()].sort((a, b) => b[0].localeCompare(a[0]))) {
    entries.push(`\n## ${day}`, ...lines);
  }
  return entries.join('\n') + '\n';
}