/**
 * Phase 13 (ADR-0002 amendment) — Open Knowledge Format renderer.
 * Phase 14 (ADR-0003) — OKF validator + frontmatter parser + content hashing.
 *
 * The build deliverable is written as OKF markdown: a YAML front-matter block
 * (identity + version + provenance) followed by the markdown body. This is the
 * versioned, portable form every outcome (plan / diagram / script / doc) exports
 * to. PURE — no I/O. Full OKF-spec field alignment is a follow-up; this is the
 * canonical shape (id · type · version · created · generator + body).
 */

import { createHash } from 'node:crypto';

export interface OkfMeta {
  id: string;       // stable id (intent id + file)
  type: string;     // plan | diagram | script | doc
  title: string;
  version: string;  // semver-ish, starts at 1.0.0
  created: string;  // ISO
  body: string;     // markdown content
}

function yamlEscape(s: string): string {
  return /[:#\n"']/.test(s) ? JSON.stringify(s) : s;
}

/** Render an OKF markdown document (front-matter + body). PURE. */
export function renderOkf(meta: OkfMeta): string {
  const front = [
    '---',
    'okf_version: "1.0"',
    `id: ${yamlEscape(meta.id)}`,
    `type: ${yamlEscape(meta.type)}`,
    `title: ${yamlEscape(meta.title)}`,
    `version: ${yamlEscape(meta.version)}`,
    `created: ${meta.created}`,
    'generator: flow-intent-studio',
    '---',
  ].join('\n');
  return `${front}\n\n${meta.body.trim()}\n`;
}

// ── Phase 14: OKF parsing + validation (ADR-0003) ────────────────────────────

/** Parsed frontmatter as a simple key→value map (strings only — OKF's minimal YAML). */
export interface ParsedOkf {
  data: Record<string, string>;
  body: string;
}

/**
 * Parse YAML front-matter from an OKF markdown string.
 * Minimal parser for the simple key: value (or key: "value") format the OKF
 * spec and our renderer produce. Handles `---`-delimited blocks per OKF §4.1.
 * No external YAML dependency — robust under Node's type-stripping.
 */
export function parseOkf(content: string): ParsedOkf {
  const text = content.trim();
  if (!text.startsWith('---')) return { data: {}, body: text };
  const end = text.indexOf('\n---', 3);
  if (end === -1) return { data: {}, body: text };
  const fmBlock = text.slice(3, end).trim();
  const body = text.slice(end + 4).trim();
  const data: Record<string, string> = {};
  for (const line of fmBlock.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colon = trimmed.indexOf(':');
    if (colon === -1) continue;
    const key = trimmed.slice(0, colon).trim();
    let val = trimmed.slice(colon + 1).trim();
    // strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key) data[key] = val;
  }
  return { data, body };
}

/** sha256 hex digest of file content (frontmatter + body). For ConceptFile.contentHash. */
export function contentHash(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/** A concept file in the shape the validator consumes. */
export interface OkfConceptFile {
  path: string;     // 'plan.md', 'diagram.md', 'index.md', 'log.md', …
  content: string;  // full OKF markdown (frontmatter + body)
}

/** Result of OKF conformance validation (OKF §9). */
export interface OkfValidationResult {
  valid: boolean;
  errors: string[];
}

/** Reserved filenames per OKF §3.1. */
const OKF_RESERVED = new Set(['index.md', 'log.md']);

/**
 * Validate a bundle's concept files against OKF v0.1 conformance (OKF §9):
 * 1. Every non-reserved `.md` has parseable front-matter with a non-empty `type`.
 * 2. Reserved files (`index.md`, `log.md`) have NO front-matter (per §6, §7).
 * Returns { valid, errors }. Used as the Publish gate.
 */
export function okfValidator(files: OkfConceptFile[]): OkfValidationResult {
  const errors: string[] = [];
  if (files.length === 0) {
    errors.push('bundle is empty — at least one concept file is required');
    return { valid: false, errors };
  }
  for (const f of files) {
    if (OKF_RESERVED.has(f.path)) {
      // Reserved files: must NOT have frontmatter (§6, §7)
      if (f.content.trim().startsWith('---')) {
        errors.push(`${f.path}: reserved files must not have YAML front-matter (OKF §${f.path === 'index.md' ? '6' : '7'})`);
      }
      continue;
    }
    // Concept file: must have front-matter with non-empty `type`
    if (!f.content.trim().startsWith('---')) {
      errors.push(`${f.path}: missing YAML front-matter (OKF §4.1 — every concept must have front-matter)`);
      continue;
    }
    const { data } = parseOkf(f.content);
    const type = data['type'];
    if (!type || type.trim() === '') {
      errors.push(`${f.path}: front-matter missing required 'type' field (OKF §4.1)`);
    }
  }
  return { valid: errors.length === 0, errors };
}
