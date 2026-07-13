# Phase 9 Plan — Studio on the Trunk

```
# Execution: Group 0 → Group 1 → Group 2 → Group 3
```

In `intent/nextjs_space/`. Verify: `npm test` + `next dev` + browser.

## Group 0 — Runtime + agent API routes
**Sequential.**
- `lib/agent/runtime.ts` — process-singleton `agentStore` (in-memory, globalThis-cached) + `getLLM()` (HfLLM).
- `lib/agent/index.ts` — barrel exporting the public agent API (clean import surface).
- `app/api/agent/turn/route.ts` — POST `{ id?, message, risk? }` → `runTurn` → `{ id, moves, reply, view }`.
- `app/api/agent/record/[id]/route.ts` — GET → `materializeRecord` → the record view.
- Commit: `feat(studio): agent runtime + /api/agent turn & record routes`

## Group 1 — The Studio page
**Sequential.**
- `app/studio/page.tsx` (+ client components) — split-screen: chat (posts to `/api/agent/turn`, holds transcript in state) + LiveRecord panel (slots, states, readiness badge from the view). Minimal, brand-neutral, uses existing UI atoms where trivial.
- Readiness badge: 🔴 vague · 🟡 actionable · 🟢 ready.
- Commit: `feat(studio): /studio split-screen agent page`

## Group 2 — BUG-001 resilience + env
**Sequential.**
- `app/refine/page.tsx` — guard `getServerSession` + `prisma.intent.findMany` in try/catch; default to empty state so it renders without DB/auth.
- Minimal app `.env` (HF_TOKEN passthrough, NEXTAUTH_SECRET dummy, NEXTAUTH_URL, dummy DATABASE_URL) — gitignored.
- Commit: `fix(refine): render resiliently without DB/auth (BUG-001)`

## Group 3 — Verification
**Sequential.**
- `npm test` green (Phases 7–8 intact).
- `next dev` boots; browser drives `/studio`: vague intent → classification + question + live record.
- `/refine` renders without 500.
- Commit: `test(studio): browser-verified agent Studio`
