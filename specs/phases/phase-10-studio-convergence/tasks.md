# Phase 10 Tasks — Converge the Studio onto `/refine`

> `[ ]` todo · `[/]` in-progress · `[x]` done.
> Status: **complete — browser-verified logged in.** One Studio at `/refine` on the new agent; `/studio` redirects. Login → agent drives → record fills → history → evidence → graph → export, all working.

## Group 0 — Bind agent → auth / Intent row (crux)
- [x] Turn route creates/uses an `Intent` row (requesterId from session) as the header
- [x] Event log keyed to the Intent row id; header mirrors objective/scope/type
- [x] Commit `feat(converge): bind agent turns to an Intent row + requester`

## Group 1 — Re-point the chat
- [x] `RefinementChat` rewritten onto `/api/agent/turn` (drops `/refine`+`/evaluate`, sends history)
- [x] Fixed reply-persistence bug (router.replace was wiping the transcript)
- [x] Commit

## Group 2 — Re-point the live document
- [x] Record panel: slots · states · readiness · **evidence** (per-slot reason)
- [x] Inline slot editing → `POST /api/agent/record/[id]/slot`
- [x] Commit

## Group 3 — Graph, artifacts, export
- [x] `MiniGraph` fed from record entities + context (Context Graph renders)
- [x] PRD/Plan via `/expand` (model fixed HF Qwen; reads synced header)
- [x] Working-memory MD export
- [x] Commit

## Group 4 — One Studio + verify
- [x] `/studio` → redirect to `/refine`
- [x] `NEXTAUTH_URL` set; seeded credentials login works
- [x] Browser (logged in): login → refine → history → evidence → graph → export ✓
- [x] `npm test` green (47)
- [x] Commit
