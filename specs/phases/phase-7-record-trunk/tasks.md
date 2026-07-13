# Phase 7 Tasks — The Deterministic Trunk

> `[ ]` todo · `[/]` in-progress · `[x]` done. Verification: `cd intent/nextjs_space && npm test`.
> Status: **core complete, 31/31 tests green, smoke passes.** One item deferred to Phase 9 (HTTP API — needs running app + DB).

## Group 0 — Contracts, types, migration
- [x] TS contracts — `lib/agent/types.ts` (SlotKey, SlotState, GapType, Slot, IntentEvent, IntentRecord, LifecycleState, IntentType)
- [x] Prisma migration models: `IntentEvent` (append-only) + `SlotValue` (materialized), additive — `prisma generate` validates
- [x] Schema registry: spine (6) + Change + Report templates with rubric + requiredness — `lib/agent/schema.ts`
- [x] BUG-001 triage — root cause: `/refine` server component awaits Prisma + NextAuth at render; throws without DB/auth env. Full fix → Phase 9.
- [x] Commit `feat(trunk): record/event/slot contracts + migration`

## Group 1 — Event-sourced record + lifecycle
- [x] Event append (immutable, version++) + replay materialization — `lib/agent/events.ts`
- [x] Lifecycle state machine (transition table, guarded, throws on illegal) — `lib/agent/lifecycle.ts`
- [x] Repository — `IntentEventStore` interface + `InMemoryEventStore` — `lib/agent/store.ts` (+ Prisma adapter `store-prisma.ts`, DB-gated)
- [x] Unit tests: replay determinism, version monotonicity, immutability, guard rejections
- [x] Commit `feat(trunk): event-sourced record + lifecycle state machine`

## Group 2 — Schema registry + deterministic strength
- [x] Registry resolution (type → template → slots + rubrics + requiredness)
- [x] Deterministic checks (contradiction detection, requiredness lookup)
- [x] Readiness aggregation (slot states → 🔴🟡🟢, pure fn) — `lib/agent/strength.ts`
- [x] `StrengthJudge` interface + rule-based impl (LLM impl → Phase 8)
- [x] Unit tests: readiness bands, requiredness matrix, contradiction detection, judge
- [x] Commit `feat(trunk): slot schema registry + deterministic strength`

## Group 3 — Wiring + integration
- [x] `materializeRecord(store, id, risk)` service — `lib/agent/materialize.ts` (+ tests)
- [x] Prisma-backed store adapter + `defaultStore()` factory — `lib/agent/store-prisma.ts` (DB-gated)
- [ ] Record-read HTTP API endpoint — **deferred to Phase 9** (needs running app + DB + auth env)
- [x] Legacy `/process` pipeline untouched (additive schema; no code changes)

## Group 4 — Verification
- [x] Test harness established — Node native `node --test` (zero-dep), `npm test` wired
- [x] Full suite green (31 tests: replay, guards, aggregation, registry, contradiction, materialize)
- [x] Smoke script `scripts/agent-smoke.ts` — readiness climbs vague→actionable→ready, guard blocks illegal transition
- [x] `cd intent/nextjs_space && npm test` verified green
- [x] Commit `test(trunk): rails test suite + smoke`
