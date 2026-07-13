/**
 * Phase 8 — minimal .env loader (server/script only).
 *
 * The project's `.env` lives at the repo root, above the Next app. Next loads its
 * own env from the app dir; node scripts (smoke) and the HF adapter use this to
 * walk up from cwd and load `HF_TOKEN` / `AGENT_MODEL` if not already set.
 * Never import this from a client component (uses node:fs).
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

let loaded = false;

export function loadEnv(): void {
  if (loaded) return;
  loaded = true;
  if (process.env.HF_TOKEN) return; // already provided by the host env
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const p = resolve(dir, '.env');
    if (existsSync(p)) {
      for (const line of readFileSync(p, 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
        if (m && process.env[m[1]] === undefined) {
          process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
        }
      }
      return;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
}
