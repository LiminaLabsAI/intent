'use strict';

/**
 * Phase 19 — Lifecycle Hardening, Group 0.
 *
 * Canonical contract for momentum's git-lifecycle + ad-hoc-work enforcement.
 * PURE functions + constants only — NO fs access, NO process side effects —
 * so that the git hooks (core/git-hooks/run-check.js), the installer
 * (bin/momentum.js), and the /hotfix command all share ONE source of truth,
 * and the logic is unit-testable in isolation.
 *
 * Vendor-neutral by design (DIP): pure git, no forge API. Enforcement lives in
 * plain git hooks that work on any forge and under any agent. See
 * core/lifecycle-contract.md for the full reference.
 */

const CONTRACT = {
  // Hooks ship as plain scripts in a tracked dir, wired via
  // `git config core.hooksPath`. No husky/lefthook — zero dependencies.
  hooksPath: '.githooks',

  // Emergency bypass for ALL momentum git hooks (e.g. MOMENTUM_SKIP_HOOKS=1).
  skipEnv: 'MOMENTUM_SKIP_HOOKS',

  // Single-use sentinel authorizing ONE push to a protected branch. Created
  // by the agent only after the user approves a merge; consumed on use.
  mergeApprovedSentinel: '.momentum/merge-approved',

  // Direct pushes to these branches are blocked unless the sentinel exists.
  // 'master' included for downstream repos that haven't renamed to 'main'.
  protectedBranches: ['main', 'master', 'staging'],

  // Canonical Verification-Evidence heading in retrospective.md (Rule 12).
  // The same heading gates ad-hoc records (specs/adhoc/<id>/record.md).
  verifyEvidenceHeading: '## Verification Evidence',

  // Allowed Conventional-Commit types: momentum's stated set
  // (feat/fix/docs/refactor/chore/infra) plus the standard extras the project
  // actually uses (test/perf/build/ci/style/revert).
  conventionalTypes: [
    'feat', 'fix', 'docs', 'refactor', 'chore', 'infra',
    'test', 'perf', 'build', 'ci', 'style', 'revert',
  ],

  // First-class work types (Rule 14). 'phase' = full ceremony; 'quick-task' =
  // ad-hoc record + Rule 12 gate, no phase scaffold; 'spike' = declared,
  // gate-exempt, throwaway.
  workTypes: ['phase', 'quick-task', 'spike'],
};

// Subjects that bypass type validation (git-generated or WIP markers).
// 'merge: ' covers the house merge style `merge: x → y` alongside git's
// default `Merge ` (BUG-015 — CLAUDE.md Naming Conventions + repo history).
const COMMIT_SUBJECT_BYPASS = /^(Merge |merge: |Revert "|fixup!|squash!|amend!|Initial commit$)/;

/**
 * True when the emergency bypass env var is set to a truthy value.
 * @param {NodeJS.ProcessEnv} [env]
 */
function skipRequested(env) {
  const e = env || (typeof process !== 'undefined' ? process.env : {});
  const v = e[CONTRACT.skipEnv];
  return v != null && v !== '' && v !== '0' && String(v).toLowerCase() !== 'false';
}

/**
 * The first non-empty, non-comment line of a commit message (the subject).
 * @param {string} message
 * @returns {string}
 */
function firstMeaningfulLine(message) {
  if (!message) return '';
  for (const raw of String(message).split('\n')) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    return line;
  }
  return '';
}

/**
 * True when a commit subject conforms to Conventional Commits (or is a
 * git-generated/WIP subject that bypasses validation).
 * @param {string} subject
 * @param {string[]} [types]
 */
function isValidCommitSubject(subject, types) {
  const s = (subject || '').trim();
  if (s === '') return false;
  if (COMMIT_SUBJECT_BYPASS.test(s)) return true;
  const typeAlt = (types || CONTRACT.conventionalTypes).join('|');
  // type(scope)!: description — scope and ! optional; single space after colon.
  const re = new RegExp('^(' + typeAlt + ')(\\([^)]+\\))?(!)?: .+');
  return re.test(s);
}

/**
 * Validate a full commit message; returns { subject, valid }.
 * @param {string} message
 * @param {string[]} [types]
 */
function validateCommitMessage(message, types) {
  const subject = firstMeaningfulLine(message);
  return { subject, valid: isValidCommitSubject(subject, types) };
}

/** refs/heads/main -> 'main'; non-branch refs -> null. */
function branchFromRef(ref) {
  if (!ref) return null;
  const m = /^refs\/heads\/(.+)$/.exec(ref);
  return m ? m[1] : null;
}

/** refs/tags/v1.2.3 -> 'v1.2.3'; non-tag refs -> null. */
function tagFromRef(ref) {
  if (!ref) return null;
  const m = /^refs\/tags\/(.+)$/.exec(ref);
  return m ? m[1] : null;
}

/** True for a semver release tag (v1.2.3, v1.2.3-rc.1, ...). */
function isReleaseTag(tag) {
  return !!tag && /^v\d+\.\d+\.\d+/.test(tag);
}

/** True when `branch` is in the protected list. */
function branchIsProtected(branch, list) {
  return !!branch && (list || CONTRACT.protectedBranches).includes(branch);
}

/**
 * True when `content` (a retrospective.md or ad-hoc record) has a non-empty
 * `## Verification Evidence` section — i.e. ≥1 non-blank, non-heading line
 * before the next heading.
 * @param {string} content
 * @param {string} [heading]
 */
function retroHasEvidence(content, heading) {
  if (!content) return false;
  const target = (heading || CONTRACT.verifyEvidenceHeading).trim();
  const lines = String(content).split('\n');
  const idx = lines.findIndex((l) => l.trim() === target);
  if (idx === -1) return false;
  for (let i = idx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^#{1,6}\s/.test(line)) break; // next heading ends the section
    if (line !== '') return true;
  }
  return false;
}

/**
 * Parse a pre-push stdin line: "<localRef> <localSha> <remoteRef> <remoteSha>".
 * Returns null for malformed lines.
 */
function parsePrePushLine(line) {
  const parts = (line || '').trim().split(/\s+/);
  if (parts.length < 4 || parts[0] === '') return null;
  const [localRef, localSha, remoteRef, remoteSha] = parts;
  return { localRef, localSha, remoteRef, remoteSha };
}

module.exports = {
  CONTRACT,
  COMMIT_SUBJECT_BYPASS,
  skipRequested,
  firstMeaningfulLine,
  isValidCommitSubject,
  validateCommitMessage,
  branchFromRef,
  tagFromRef,
  isReleaseTag,
  branchIsProtected,
  retroHasEvidence,
  parsePrePushLine,
};
