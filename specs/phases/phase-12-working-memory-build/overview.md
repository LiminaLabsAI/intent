# Phase 12 — Working-Memory Build Flow & Cost Engine

> **Branch:** `feat/intent-agent` · **Verify:** `cd intent/nextjs_space && npm test` · **Build:** none
> **Governing decisions:** [ADR-0001](../../decisions/0001-configurable-cost-estimator.md) · [ADR-0002](../../decisions/0002-working-memory-build-flow-and-cost.md)

## Goal

Make the Intent Studio produce the working memory as a deliberate, **approved build run**, not a live-mutating panel. The user picks a **mode (persona)**; the agent **clarifies** — asking for missing context *and surfacing its own inferred assumptions to verify* — until readiness is 🟢; then on **approval** it **builds** the full working memory in one run and shows the **actual cost against the estimate**. This phase also **ratifies** the configurable cost engine + persona picker already shipped, and draws a clean V1 line with V2/Future deferred (roadmap + ADR-0002).

The product thesis this serves: a working memory built with assumption/hallucination driven *down*, so any downstream consumer (PRD, user story, doc, coding agent, future execution agent) can act with **no hop-on/hop-off**.

## Key decisions

| Decision | Choice | Ref |
|---|---|---|
| Cost engine = config-as-data | `CostModel`/`Persona`/`EstimationPrior` (DB + seeded default); pure `estimateCost` (config passed in) | ADR-0001 |
| Persona = user-facing **choice** | DECIDE gate (`select_persona`) + in-chat picker; the pick drives refinement **rigor** + cost | ADR-0001 amend |
| Two-phase flow | pick → **clarify (+ verify assumptions)** → build gate → **build run** | ADR-0002 |
| Cost function | `input×price_in + output×price_out`; **estimate** before build, **actual** (measured usage) after; senior's loss `L` **not built** (baked into the 3 modes) | ADR-0002 |
| V1 input tokens | the **clarified conversation** (measured); `budget_ratio×context` = V2 | ADR-0002 |
| Panel empty until Build | working memory + graph materialize on the build run | ADR-0002 |
| Actual cost | measured LLM token usage on the **build run only** ("one run") | ADR-0002 |
| Assumption verification | reuse the `inferred` provenance — inferred slots are what the agent offers back to confirm | ADR-0002 |

## Scope

### In (V1)
- **Ratify** (already shipped, no rebuild): config-as-data cost engine (ADR-0001) + in-chat persona picker.
- **Clarify phase:** agent asks missing context **and surfaces inferred assumptions to verify**; working-memory panel **empty**; only 🔴→🟡→🟢 readiness + the conversation are live; readiness re-checked each turn against the selected persona's bar.
- **Build gate:** a **"Build working memory"** button appears at 🟢.
- **Build run:** one analysis pass → materialize working memory + graph → **capture actual token usage → actual cost** shown next to the estimate. It is one run.

### Out (→ roadmap / backlog — preserved, not built)
- **V2 (Attached-System Execution Engine):** new-vs-existing-system fork · attach harness (repo/dirs/docs) · the senior's full engine (`budget_ratio` · RAG memory-strategy · overflow→RAG · model tiers · provider payload) · **real** execution cost. (roadmap; ADR-0002 §3)
- **Future:** execution agent inside Flow · per-user precedent memory (folds into "Precedent & Memory"). (roadmap; ADR-0002 §3)
- **V1.1 (backlog):** budget auto-pick ("$X → best mode"); deeper background verification (cross-checks beyond confirm-the-inference).

## Deliverables (verify: `npm test`)

| Deliverable | Verification |
|---|---|
| `built` event + `record.built`/`actualCost`; `offer_build` move; `Usage` on the LLM interface | unit test (replay, decide) |
| `runBuild` — one analysis pass that materializes the working memory + captures usage → actual cost | unit test (FakeLLM usage) |
| Turn route `build` action; `materializeRecord` exposes `built`/`actualCost` + `offer_build` | unit + live turn |
| Clarify: narrate inferred slots as confirm/edit questions | live behavior check |
| Studio UI: panel hidden until built · readiness prominent · Build button at 🟢 · reveal + actual-vs-estimate on build | tsc clean + browser (user, auth-gated) |

## Acceptance criteria
1. Intent → **pick persona** → **clarify**: right panel **empty**, readiness moves 🔴→🟢, agent **verifies its assumptions** ("I'm assuming X — confirm/edit?").
2. At 🟢, the **"Build working memory"** button appears.
3. **Build** → working memory + graph **materialize**; **actual cost shown next to the estimate**; it is one run.
4. Full suite green (`npm test`).

## Non-goals
No attached-system execution, RAG/memory-strategy, overflow→RAG, model tiers, or provider-payload translation (all **V2**); no execution agent (**Future**). No governance/approval-engine work (separate roadmap arc).
