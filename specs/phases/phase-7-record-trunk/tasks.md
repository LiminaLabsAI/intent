# Phase 7 Tasks — The Deterministic Trunk

> `[ ]` todo · `[/]` in-progress · `[x]` done. Verification: `cd nextjs_space && npm test`.

## Group 0 — Contracts, types, migration
- [ ] TS contracts (SlotKey, SlotState, GapType, Slot, IntentEvent, IntentRecord, LifecycleState, IntentType)
- [ ] Prisma migration: `IntentEvent` (append-only) + `SlotValue` (materialized), additive
- [ ] Schema registry skeleton: spine (6) + Change + Report templates (rubric + requiredness)
- [ ] BUG-001 triage (`/refine` UI broken) — minimal fix or root-cause note
- [ ] Commit `feat(trunk): record/event/slot contracts + migration`

## Group 1 — Event-sourced record + lifecycle
- [ ] Event append (immutable, version++) + replay materialization
- [ ] Lifecycle state machine (transition table, guarded, logged)
- [ ] Repository functions (create, appendEvent, load, replay)
- [ ] Unit tests: replay determinism, version monotonicity, guard rejections
- [ ] Commit `feat(trunk): event-sourced record + lifecycle state machine`

## Group 2 — Schema registry + deterministic strength
- [ ] Registry resolution (type → template → slots + rubrics + requiredness)
- [ ] Deterministic checks (presence, contradiction, entity-resolution, requiredness)
- [ ] Readiness aggregation (slot states → 🔴🟡🟢, pure fn)
- [ ] `StrengthJudge` interface + rule-based impl
- [ ] Unit tests: aggregation bands, requiredness matrix, contradiction detection
- [ ] Commit `feat(trunk): slot schema registry + deterministic strength`

## Group 3 — Wiring + integration
- [ ] `materializeRecord(intentId)` service
- [ ] Record-read API endpoint
- [ ] Legacy `/process` regression check
- [ ] Commit `feat(trunk): materialization service + record-read API`

## Group 4 — Verification
- [ ] Test harness established (first tests in repo)
- [ ] Full suite green (replay, guards, aggregation, registry, contradiction)
- [ ] Smoke script (create → events → readiness change → immutable history)
- [ ] `cd nextjs_space && npm test` verified green
- [ ] Commit `test(trunk): rails test suite + smoke`
