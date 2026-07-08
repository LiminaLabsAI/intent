#!/usr/bin/env node
'use strict';

/**
 * Phase 19 — Lifecycle Hardening, Group 1.
 *
 * momentum git-hook dispatcher: a thin I/O layer over the pure contract in
 * ./contract.js. Invoked by the .githooks/commit-msg and .githooks/pre-push
 * shell wrappers. All decision logic lives in contract.js (unit-tested);
 * this file only does fs/stdin/exit-code plumbing.
 *
 * Vendor-neutral: pure git, no forge API. Runs under any agent on any forge.
 */

const fs = require('node:fs');
const path = require('node:path');
const C = require('./contract');

// git invokes hooks with cwd = repo root.
function repoRoot() {
  return process.cwd();
}

function fail(msg) {
  process.stderr.write(`\n✖ momentum git hook blocked this action:\n  ${msg}\n`);
  process.stderr.write(`\n  Emergency bypass (use sparingly): ${C.CONTRACT.skipEnv}=1 <git command>\n\n`);
  process.exit(1);
}

// ── commit-msg ────────────────────────────────────────────────────────────────
function commitMsg(msgFile) {
  if (C.skipRequested()) process.exit(0);
  let content = '';
  try {
    content = fs.readFileSync(msgFile, 'utf8');
  } catch {
    process.exit(0); // no message file — let git handle it
  }
  const { subject, valid } = C.validateCommitMessage(content);
  if (valid) process.exit(0);
  fail(
    `commit subject is not a Conventional Commit:\n      "${subject}"\n` +
    `  Expected:  <type>(scope?)!: description\n` +
    `  where <type> is one of: ${C.CONTRACT.conventionalTypes.join(', ')}`
  );
}

// ── pre-push ──────────────────────────────────────────────────────────────────
function findLatestRetro(root) {
  const specsDir = path.join(root, 'specs');
  if (!fs.existsSync(specsDir)) return null;
  const candidates = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name.startsWith('._')) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(p);
      } else if (
        e.name === 'retrospective.md' ||
        (e.name === 'record.md' && dir.split(path.sep).includes('adhoc'))
      ) {
        try {
          candidates.push({ p, mtime: fs.statSync(p).mtimeMs });
        } catch {
          /* ignore */
        }
      }
    }
  };
  walk(specsDir);
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.mtime - a.mtime);
  return candidates[0].p;
}

function prePush() {
  if (C.skipRequested()) process.exit(0);

  let input = '';
  try {
    input = fs.readFileSync(0, 'utf8'); // git pipes ref lines on stdin
  } catch {
    input = '';
  }
  const root = repoRoot();
  const lines = input.split('\n').map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const parsed = C.parsePrePushLine(line);
    if (!parsed) continue;
    if (/^0+$/.test(parsed.localSha)) continue; // branch/tag deletion — skip

    // (1) Block direct push to a protected branch without the approval sentinel.
    const branch = C.branchFromRef(parsed.remoteRef);
    if (C.branchIsProtected(branch)) {
      const sentinel = path.join(root, C.CONTRACT.mergeApprovedSentinel);
      if (fs.existsSync(sentinel)) {
        try {
          fs.unlinkSync(sentinel); // single-use: consume on push
        } catch {
          /* ignore */
        }
        process.stderr.write(
          `  momentum: '${C.CONTRACT.mergeApprovedSentinel}' consumed — push to '${branch}' authorized.\n`
        );
      } else {
        fail(
          `direct push to protected branch '${branch}' is blocked.\n` +
          `  Merging to '${branch}' needs explicit human approval. After the user approves,\n` +
          `  authorize a single push with the single-use sentinel:\n` +
          `      touch ${C.CONTRACT.mergeApprovedSentinel}\n` +
          `  (it is consumed on push).`
        );
      }
    }

    // (2) Block a release-tag push lacking verification evidence (Rule 12 / FEAT-019).
    const tag = C.tagFromRef(parsed.remoteRef);
    if (C.isReleaseTag(tag)) {
      const retro = findLatestRetro(root);
      // Only enforce where the retrospective convention is in use. A project
      // with no retrospective at all is not gated.
      if (retro) {
        let content = '';
        try {
          content = fs.readFileSync(retro, 'utf8');
        } catch {
          content = '';
        }
        if (!C.retroHasEvidence(content)) {
          fail(
            `release tag '${tag}' is blocked: the most recent retrospective\n` +
            `      (${path.relative(root, retro)})\n` +
            `  has no non-empty '${C.CONTRACT.verifyEvidenceHeading}' section.\n` +
            `  Capture fresh verification output there (Rule 12) before tagging a release.`
          );
        }
      }
    }
  }
  process.exit(0);
}

// ── dispatch ──────────────────────────────────────────────────────────────────
const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'commit-msg') {
  commitMsg(rest[0]);
} else if (cmd === 'pre-push') {
  prePush();
} else {
  process.stderr.write(`momentum run-check: unknown command '${cmd}'\n`);
  process.exit(0); // unknown → don't block
}
