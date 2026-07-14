# Phase 10 Tasks — Converge the Studio onto `/refine`

> `[ ]` todo · `[/]` in-progress · `[x]` done.

## Group 0 — Bind agent → auth / Intent row (crux)
- [ ] Turn route: create/use an `Intent` row (requesterId from session) as the record header
- [ ] Key the `IntentEvent` log to the Intent row id
- [ ] Mirror objective/scope/readiness onto the header for listing
- [ ] Commit `feat(converge): bind agent turns to an Intent row + requester`

## Group 1 — Re-point the chat
- [ ] `RefinementChat` → `/api/agent/turn` (drop `/refine`+`/evaluate`, send history)
- [ ] Commit `feat(converge): RefinementChat → agent turn`

## Group 2 — Re-point the live document
- [ ] `LiveDocument` → record view (slots · states · readiness · evidence)
- [ ] Inline slot editing → `slot_valued` event
- [ ] Commit `feat(converge): LiveDocument → new record + inline edit + evidence`

## Group 3 — Graph, artifacts, export
- [ ] `MiniGraph` ← record entities + context
- [ ] PRD/Plan via `/expand` on the Ready record
- [ ] Working-memory export (MD/OKF)
- [ ] Commit `feat(converge): graph + PRD/Plan + export`

## Group 4 — One Studio + verify
- [ ] `/studio` → redirect to `/refine`
- [ ] `NEXTAUTH_URL` + seeded login for testing
- [ ] Browser: login → refine → history → edit slot → PRD → export
- [ ] `npm test` green
- [ ] Commit `feat(converge): one Studio verified`
