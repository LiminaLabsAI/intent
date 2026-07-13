# Phase 7: The Deterministic Trunk (Intent Record & Rails)

> Part of the **Intent Agent build arc** (`feat/intent-agent`, Phases 7→9+). Merges to `main` only when the arc is working end-to-end and tested.

## Goal
Build the **deterministic system the probabilistic agent will run on** — the event-sourced canonical intent record, the layered slot schema, the lifecycle state machine, and the strength function (Readiness = f(slot states)). No conversational rewiring this phase: we lay the rails; the driver (Phase 8) comes next. Implements design-doc `specs/vision/product-design.md` §3.6, §3.8, §3.9 and vision build-order step 1.

**Anchoring principle:** *deterministic rails, probabilistic agent.* Deterministic = record structure, event-sourcing, what "strong/Ready" means, governance invariants, the guaranteed direction toward Ready. The one probabilistic piece (the LLM strength-judge) is quarantined behind an interface and deferred to Phase 8.

## Key Decisions
| Decision | Choice | Why |
|---|---|---|
| Record persistence | Append-only `IntentEvent` log = source of truth; `SlotValue` = materialized current-state | Immutability, versioning, audit fall out for free (§2) |
| Schema shape | Layered, code-defined registry: spine (6) + templates (Change, Report), each slot carrying rubric + requiredness | §3.8; governable + extensible |
| Strength | Deterministic aggregation + a `StrengthJudge` **interface** (rule-based impl now; LLM impl → Phase 8) | Keeps the rails fully deterministic & testable |
| Legacy | `Intent` wide row + `/process` pipeline left working, untouched | No convergence this phase (deferred, §9) |

## Scope
**In:** event model + record materialization · lifecycle state machine (guarded) · slot schema registry (spine + 2 templates) · deterministic strength + Readiness aggregation · `StrengthJudge` interface (rule-based) · a record-read API · the first real test suite.

**Out (→ Phase 8 / later):** Perceive/DECIDE/Narrate loop · move selection · the LLM strength-judge · precedent/memory · promotion loop · classifier hardening · Studio UI rebuild · governance/approval engine · retiring `/process`.

## Deliverables
| Deliverable | Verification |
|---|---|
| Event replay deterministic; version increments per event | `cd nextjs_space && npm test` (replay suite) |
| Illegal lifecycle transitions rejected | `cd nextjs_space && npm test` (state-machine suite) |
| Readiness = pure fn of slot states + requiredness (🔴🟡🟢) | `cd nextjs_space && npm test` (aggregation suite) |
| Spine + Change + Report templates resolve by intent-type | `cd nextjs_space && npm test` (registry suite) |
| Record-read API returns slots + states + readiness | smoke script + manual `curl` |
| Test harness exists (was zero) | `cd nextjs_space && npm test` runs green |

> **Config note:** `config.md` says `test_command: npm test`, but the app is in `nextjs_space/`; this phase uses `cd nextjs_space && npm test`.

## Acceptance Criteria
1. A given event sequence deterministically reproduces slot states + version + lifecycle state (replay test green).
2. Illegal state transitions throw (guard tests green).
3. Readiness is a pure function of slot states + the requiredness matrix (aggregation tests green across 🔴🟡🟢).
4. `cd nextjs_space && npm test` runs green — **"zero tests" is dead.**
5. Smoke: create an intent → append events → Readiness changes → all persisted immutably (version history intact).
