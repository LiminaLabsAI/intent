# Phase 7 Plan — The Deterministic Trunk

```
# Execution: Group 0 → (Group 1 + Group 2 parallel) → Group 3 → Group 4
```

All work on branch `feat/intent-agent`, in `nextjs_space/`. Verification: `cd nextjs_space && npm test`.

## Group 0 — Contracts, types, migration
**Sequential. Blocks everything.** Deps: Prisma, existing `nextjs_space` app.
- TS contracts (`lib/agent/types.ts` or similar): `SlotKey`, `SlotState` (empty·weak·ambiguous·conflicting·strong), `GapType`, `Slot`, `IntentEvent`, `IntentRecord`, `LifecycleState`, `IntentType` (Change/Create/Analyze/Report).
- Prisma migration: `IntentEvent` (append-only, ordered, versioned), `SlotValue` (materialized current state). **Additive — legacy `Intent` fields untouched.**
- Schema registry skeleton: spine (6 slots) + `Change` + `Report` templates, each slot `{ rubric, requiredness(type, risk) }`.
- **BUG-001 triage:** diagnose why `/refine` UI is broken; minimal fix or record root cause (full UI rewire → Phase 9).
- Commit: `feat(trunk): record/event/slot contracts + migration`

## Group 1 — Event-sourced record + lifecycle
**Parallel with Group 2.** Deps: Group 0 types + migration.
- Event append (immutable, version++); materialize slot state via replay.
- Lifecycle state machine: transition table, guarded, illegal transitions throw, each transition logged as an event.
- Repository functions: `create`, `appendEvent`, `load`, `replay`.
- Unit tests: replay determinism, version monotonicity, guard rejections.
- Commit: `feat(trunk): event-sourced record + lifecycle state machine`

## Group 2 — Schema registry + deterministic strength
**Parallel with Group 1.** Deps: Group 0 types + registry skeleton.
- Registry resolution: `intentType → template → slot set (+ rubrics, requiredness)`.
- Deterministic checks: presence · cross-slot contradiction · basic entity-resolution · requiredness lookup.
- Readiness aggregation: slot states → gate PASS/FAIL → 🔴🟡🟢 (pure function).
- `StrengthJudge` interface + **rule-based** impl (LLM impl deferred to Phase 8).
- Unit tests: aggregation from injected states across all bands; requiredness matrix; contradiction detection.
- Commit: `feat(trunk): slot schema registry + deterministic strength`

## Group 3 — Wiring + integration
**Sequential.** Deps: Groups 1 + 2.
- `materializeRecord(intentId)`: events → slot states → strength → readiness → lifecycle, as one record view.
- Re-point `GET /api/intents/[id]` (or new `/api/records/[id]`) to return the record view. Legacy `/process` still works.
- Commit: `feat(trunk): materialization service + record-read API`

## Group 4 — Verification
**Sequential. Last.** Deps: all.
- Establish the test harness (first tests in the repo — pick the runner Next.js/the app already supports; add if none).
- Full suite: replay, guards, aggregation, registry, contradiction.
- Smoke script: create → events → readiness change → immutable history.
- Verify `cd nextjs_space && npm test` green.
- Commit: `test(trunk): rails test suite + smoke`
