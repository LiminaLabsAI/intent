/**
 * Phase 13 (ADR-0002 amendment) — Open Knowledge Format renderer.
 *
 * The build deliverable is written as OKF markdown: a YAML front-matter block
 * (identity + version + provenance) followed by the markdown body. This is the
 * versioned, portable form every outcome (plan / diagram / script / doc) exports
 * to. PURE — no I/O. Full OKF-spec field alignment is a follow-up; this is the
 * canonical shape (id · type · version · created · generator + body).
 */

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
