# Phase 10 Plan — Converge the Studio onto `/refine`

```
# Execution: Group 0 → Group 1 → Group 2 → Group 3 → Group 4
```
In `intent/nextjs_space/`. Verify: `npm test` + `next dev` + browser (with login).

## Group 0 — Bind agent → auth / Intent row (the crux)
**Sequential. The load-bearing work.**
- `Intent` row as header: on first turn create `prisma.intent.create({ requesterId, rawInput, intentId: INT-XXXXX })`; use its `id` as the agent record id (IntentEvent keyed to it).
- Turn route: read `getServerSession`; set `requesterId` when present (anonymous fallback during transition).
- Optionally mirror the materialized objective/scope/readiness onto the `Intent` row header for list/search.
- Commit: `feat(converge): bind agent turns to an Intent row + requester`

## Group 1 — Re-point the chat
**Sequential.**
- `RefinementChat`: call `/api/agent/turn` (send message + history) instead of `/refine` + `/evaluate`; render `reply` + hold transcript; drop the score/`/evaluate` path.
- Commit: `feat(converge): RefinementChat → agent turn`

## Group 2 — Re-point the live document
**Sequential.**
- `LiveDocument`: render the agent record view (slots · states · readiness · evidence). Inline slot edit → posts a `slot_valued` event (new `/api/agent/record/[id]/slot` or reuse turn). Show the per-slot `reason` as evidence.
- Commit: `feat(converge): LiveDocument → new record + inline edit + evidence`

## Group 3 — Graph, artifacts, export
**Sequential.**
- `MiniGraph`: feed from the record's entities + context (placeholder until precedent).
- PRD/Plan: `/expand` re-pointed to the Ready record's materialized data.
- Export: working-memory (MD/OKF) from the record.
- Commit: `feat(converge): graph + PRD/Plan + export on the new record`

## Group 4 — One Studio + verify
**Sequential. Last.**
- `/studio` → redirect to `/refine`. Old `/refine`+`/evaluate` engine left dormant (not invoked).
- Login for testing: set `NEXTAUTH_URL`; use the seeded credentials account.
- Verify in browser: login → refine via agent → history → edit slot → PRD → export.
- `npm test` green.
- Commit: `feat(converge): redirect /studio, one Studio verified`
