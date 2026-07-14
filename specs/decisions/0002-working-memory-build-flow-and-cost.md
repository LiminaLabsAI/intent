---
type: Decision
---

# 0002 — Working-memory build flow + the V1/V2 cost model

> **Status**: accepted
> **Date**: 2026-07-15
> **Deciders**: er.mayank000@gmail.com (product), agent
> **Amends**: [[0001-configurable-cost-estimator]] (persona choice UX, cost basis)

## Context

The Intent Studio's job is to turn a vague intent + context into a **working memory** (the governed record) built so that **assumption and hallucination are driven down** — so any downstream consumer (a PRD reader, a user story, a coding agent, a future execution agent) can act with no hop-on/hop-off. The outcome is **generic**, not code-specific.

A long design session (incl. reading the senior's Gemini "memory + cost" conversation) clarified two things I had wrong: (1) the working memory is **built on approval as one run**, not filled live during chat; (2) there is an **estimate → actual** cost pair around that run. It also clarified the boundary between our engine and the senior's.

## Decision

### 1. Two-phase flow

| Phase | What happens | Right panel |
|---|---|---|
| **Pick** | After the intent, the user picks a **persona/mode** (estimated cost shown per mode). | — |
| **Clarify** | The agent understands the intent, **asks for missing context**, and **surfaces its own assumptions to verify** ("I'm assuming X — confirm/edit/tell me how"). Readiness 🔴 vague → 🟡 actionable → 🟢 ready is re-checked **after every interaction**, against the **selected persona's** bar. | **Empty** — only readiness status + conversation are live. |
| **Build gate** | At 🟢 a **"Build working memory"** button appears. | — |
| **Build run** | On click = **one run**: the agent materializes the full working memory (objective · scope · out-of-scope · context · entities · acceptance · graph) and shows the **actual execution cost** beside the estimate. | Working memory + graph revealed. |

Assumption verification reuses the existing `inferred` provenance: inferred slots are what the agent offers back for confirmation during Clarify.

### 2. The cost function

Three distinct things were all called "cost"; separated:

| # | "Cost" | What it is | Verdict |
|---|---|---|---|
| 1 | Senior's loss `L = W_cost·cost + W_latency·latency − W_quality·quality` | The *objective for choosing a profile* | **Not built.** Baked into the named profiles (his own UX rule). Design rationale, not runtime. |
| 2 | `input_tokens × price_in + output_tokens × price_out` | The **dollar** cost | **The one.** Ours == his. |
| 3 | Estimate vs Actual | predicted tokens (pre-build) vs **measured** tokens from the API usage field (post-build) | **Both.** Add actual-cost capture on the Build run. |

The only real difference is what fills `input_tokens`, and that IS the V1/V2 split:
- **V1** (build the working memory): `input` = intent + clarified conversation (measured); `output` = the working memory produced, scaled by persona depth (reference-class, calibratable). Small, real.
- **V2** (run analysis over an attached system): `input` = `budget_ratio × context_window` (senior's allocation model — only meaningful once a large dataset exists); + RAG memory-strategy, overflow→RAG, model tiers, caching, provider payload.

### 3. Product line

- **V1 (Intent Studio, the spec-maker):** pick → clarify (+ assumption verification) → build gate → build run + actual cost. 3 plain modes, **one model + settings**. Budget auto-pick = V1.1.
- **V2 (attach the system):** new-vs-existing fork → attach harness (repo/docs) → the senior's **full engine** (budget_ratio, memory strategy, overflow, tiers, provider payload) → real execution cost.
- **Future:** an **execution agent inside Flow** that consumes the working memory and runs it; **per-user memory / precedent** (Phase 12).

**Two memories kept distinct** (resolves the "per-system vs per-profile" debate): **execution memory strategy** (senior's RAG choice) is a function of *attached-system-size × profile budget_ratio*, chosen per-run in V2; **user memory** (remembering this user's past intents) is a separate precedent layer (Phase 12). Not the same thing.

## Consequences

**Easier:** the clarify/build split gives a clean "one run" to price and measure (estimate vs actual); the working memory is a deliberate, approved artifact, not a live-mutating panel. The senior's whole engine is cleanly deferred to V2 behind the new-vs-existing fork — §5.2's boundary already anticipated this.

**Harder / changes from today:** the UI must **hide the working-memory panel during Clarify** and reveal it on Build (today it fills live); we add a **Build action** (a dedicated analysis run) and **actual-cost capture** (LLM usage). The agent must **narrate inferred slots as verification questions** during Clarify.

**Deferred deliberately:** RAG/memory-architecture, overflow→RAG, per-profile model tiers + live pricing, provider payload translation (all V2); execution agent + per-user precedent (future).
