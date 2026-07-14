# Phase 9 Tasks — Studio on the Trunk

> `[ ]` todo · `[/]` in-progress · `[x]` done.
> Status: **complete — browser-verified.** Vague intent → Ready record in the browser; readiness climbed 🔴 Vague → 🟢 Ready (8/8 slots strong). `/refine` no longer 500s. 46/46 tests green.

## Group 0 — Runtime + agent API routes
- [x] `lib/agent/runtime.ts` — singleton store + `getLLM()`
- [x] `lib/agent/index.ts` — public barrel
- [x] `app/api/agent/turn/route.ts` (POST) — verified live via curl + browser
- [x] `app/api/agent/record/[id]/route.ts` (GET)
- [x] Commit `feat(studio): agent runtime + /api/agent routes`

## Group 1 — Studio page
- [x] `app/studio/page.tsx` — split-screen chat + LiveRecord (client component)
- [x] Readiness badge 🔴🟡🟢; slot list with state dots + values
- [x] Commit `feat(studio): /studio split-screen agent page`

## Group 2 — BUG-001 + env
- [x] `/refine` resilient (guarded session + prisma in try/catch) — now 307, not 500
- [x] Minimal app `.env.local` (gitignored)
- [x] Commit `fix(refine): render resiliently without DB/auth (BUG-001)`

## Group 3 — Verification
- [x] `npm test` green (46 tests; Phases 7–8 intact)
- [x] `next dev` + browser: `/studio` drove a real 2-turn refinement, record filled to Ready
- [x] `/refine` returns 307 (no 500), `/studio` returns 200
- [x] Commit `test(studio): browser-verified agent Studio`

## Follow-ons
- [x] **DB persistence — DONE.** Neon `DATABASE_URL` set, `prisma db push` (additive), `runtime.ts` → `getStore()`/`defaultStore()`, routes `await getStore()`. Verified: turn wrote 6 events to Neon; record reads back from Postgres.
- Full `/refine` re-point onto the new record/agent loop (needs auth + DB stack).
- Knowledge Graph / artifact expansion re-point; precedent/memory (Phase 10).
