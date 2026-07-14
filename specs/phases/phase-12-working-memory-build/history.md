# Phase 12 History — Working-Memory Build Flow & Cost Engine

### [DECISION] 2026-07-15 — Working memory is an approved BUILD RUN, not a live panel
Topics: build-flow, working-memory, ux
Affects-phases: phase-12-working-memory-build
Affects-specs: specs/decisions/0002-working-memory-build-flow-and-cost.md
Detail: A long product session corrected the flow: pick mode → clarify (ask missing context AND surface inferred assumptions to verify) with the working-memory panel EMPTY (only 🔴/🟡/🟢 readiness + conversation live) → at 🟢 a "Build working memory" button → build run materializes the full working memory + graph in one run and shows actual cost vs estimate. The whole point is a low-assumption working memory so downstream consumption needs no hop-on/hop-off. Recorded in ADR-0002.

---

### [DECISION] 2026-07-15 — Cost function resolved; senior's loss L is not a runtime thing
Topics: cost, cost-function, estimate-actual
Affects-phases: phase-12-working-memory-build
Affects-specs: specs/decisions/0002-working-memory-build-flow-and-cost.md
Detail: Read the senior's Gemini "memory + cost" conversation. Three things were all called "cost": (1) his loss `L = W_cost·cost + W_latency·latency − W_quality·quality` = the profile-selection objective, baked into named profiles — NOT built as runtime; (2) `input×price + output×price` = the dollar cost, ours == his — the one we use; (3) estimate (pre-build) vs actual (measured usage, post-build) — build both. V1 `input` = the clarified conversation (measured); his `budget_ratio×context` + RAG/tiers/overflow/provider = V2 (needs attached data). Recorded in ADR-0002.

---

### [SCOPE_CHANGE] 2026-07-15 — Clean V1 line; V2 execution engine + Future deferred to roadmap
Topics: scope, v1, v2, roadmap
Affects-phases: phase-12-working-memory-build
Affects-specs: specs/planning/roadmap.md
Detail: V1 = the build flow (this phase) + the already-shipped cost engine (ADR-0001) + persona picker. Deferred and preserved as roadmap/backlog: V2 (new-vs-existing-system fork, attach harness, the senior's full engine — budget_ratio, RAG memory-strategy, overflow→RAG, model tiers, provider payload, real execution cost) and Future (execution agent inside Flow, per-user precedent memory). Chose roadmap entries over full future-phase specs to avoid spec drift; the load-bearing decisions are frozen in ADR-0001/0002.

---

### [NOTE] 2026-07-15 — Group 0 (contracts) landed
Topics: build-flow, contracts, offer_build, actual-cost
Affects-phases: phase-12-working-memory-build
Affects-specs: none
Detail: Added `record.built`/`actualCost` + `built` event (events.ts apply); `offer_build` move — decide returns it at readiness=ready when `!built`, `close` once built; `Usage` + `generateStructuredWithUsage` on the LLM interface (Hf parses `usage`, Fake returns fixed) for the build run's actual-cost capture. Updated the two ready→close tests to ready→offer_build + a built→close variant. 68/68, tsc clean.

---

### [NOTE] 2026-07-15 — Groups 1 + 2 landed (build run + assumption verification)
Topics: build-run, actual-cost, verify, assumptions
Affects-phases: phase-12-working-memory-build
Affects-specs: none
Detail: G1 — `runBuild` (build.ts) composes the final working memory in one usage-capturing pass, marks slots strong, stamps `actualCost = usage × persona-model price`; turn route `{build:true}` action; idempotent. G2 — a `verify` move: DECIDE appends verify moves for inferred-strong slots to the clarify batch, and offer_build narration notes the assumptions — so the agent surfaces what it assumed for the user to confirm/correct (the assumption-reduction the build depends on). 71/71.

---

### [NOTE] 2026-07-15 — Phase 11 organically outgrew its spec; this phase captures the overflow
Topics: phase-11, phase-12, planning
Affects-phases: phase-12-working-memory-build
Affects-specs: none
Detail: Phase 11 ("Behavior & Cost") shipped, then grew — via ADR-0001 (configurable cost engine) and the persona-choice amendment — well beyond its "cost range advisory" spec. Rather than retro-edit a completed phase, Phase 12 ratifies that shipped work as its foundation and scopes the remaining V1 build (the two-phase build flow). Prompted by the user's call to persist decisions as specs before more implementation.

---
