---
type: Roadmap
---

# Roadmap

> **Start Date**: 2026-07-08

## Vision
Flow becomes the industry-standard UI/UX portal for designing, validating, and auditing AI agent intents.

## Timeline

### Completed
| Phase | Name | Status |
|-------|------|--------|
| 0 | Bootstrap | Complete |
| 1 | Intent Refinement Engine | Complete (v0.1.0) |
| 2 | LLM Integration | Complete |
| 3 | Validation & Quality Gates | Complete (v0.2.0) |

### In flight (separate lanes)
| Phase | Name | Status |
|-------|------|--------|
| 5 | Agentic Dispatch | Paused |
| 6 | Studio Experience | In progress (`feat/phase-6-studio-experience`) |

### The Intent Agent build arc — end-to-end lifecycle
> One feature branch `feat/intent-agent`. Each phase maps to the Flow Intent Lifecycle
> (**1** Capture → **2** Parse → **3** Semantic → **4** Normalize → **5** Quality Gate →
> **6** Approval Decision Engine → **7** Intent ID) and the three pillars (Evidence ·
> Governance · Progressive Autonomy). The lifecycle's load-bearing invariant:
> *no intent executes without passing the Quality Gate **AND** the Approval Decision Engine.*
>
> **Status honesty:** 7–10 shipped the *refinement* half (capture → understanding →
> **continuous** quality gate → immutable registry) — the "clarity" half, browser-verified.
> The *governance* half (stage 6 engine, human review, autonomy) — the "control" half and the
> product's real differentiator — is 12–14. Design reference: `product-design.md` §3.4–3.11, §4, §5.

| # | Phase | Delivers (exact) | Lifecycle stage | Status |
|---|-------|------------------|-----------------|--------|
| 7 | Deterministic Trunk | event-sourced `IntentEvent`/`SlotValue` record + replay · guarded lifecycle state machine · layered slot schema (spine + type-templates + rubrics + risk-weighted requiredness) · strength fn `Readiness = f(slot states)` | 5 (gate, continuous) · 7 (registry) | ✅ done |
| 8 | The Agent Loop | Perceive (LLM: fold + classify + strict judge) · deterministic DECIDE policy · Narrate · turn orchestrator · LLM behind an interface (FakeLLM / HfLLM; `AGENT_MODEL` env) | 1·2·3 · Needs-Clarification loop | ✅ done |
| 9 | Studio on the Trunk | `/studio` split-screen (chat · live record · readiness · graph) over the agent, DB-persisted | UI for 1–5 | ✅ done |
| 10 | Studio Convergence | one Studio at `/refine`: auth + shell + history bound to an `Intent` header row (requesterId, INT-XXXXX) · `RefinementChat`→`/api/agent/turn` · slots/evidence/inline-edit/graph/PRD-Plan/export · `/studio`→redirect | UI + registry binding | ✅ done |
| 11 | Behavior & Cost | **right-size** the required-set by complexity/risk · **infer-first** proposing · **batch-present** (O4: draft + all gaps in one shot, not drip) · self-owned termination + "good-enough" judging · **pre-execution cost advisory** (§5.2: tiktoken input · output estimate · price catalog · **ranges** · persona rec · refine-to-save) | refines 1–5 + advisory | ✅ done |
| 12 | Working-Memory Build Flow & Cost Engine | pick mode → **clarify** (ask gaps + **verify inferred assumptions**) with the panel empty & only 🔴/🟡/🟢 live → **build gate** → **build run** materializes working memory + graph + **actual cost vs estimate**. Ratifies the config-as-data cost engine (ADR-0001) + persona picker. | refines 1–5 + advisory (+ actual) | ✅ done (branch) |
| 13 | Studio Experience Redesign (ask-to-enrich · plan build) | **ask-to-enrich** clarify (grounded questions, plain language, no jargon) · **live** Understanding fields · **always-on** status-coloured Build in the conversation → **1+ OKF `.md` files named by outcome** + graph · top strip (status · **mode** · est→actual cost) · personas **Quick / Balanced / Deep-dive** · **real** DeepInfra values. Revises Phase 12 (ADR-0002 amendment). | refines 1–5 + build | ✅ done (main, v0.3.0) |
| 14 | Precedent & Memory | pgvector semantic memory over prior intents **+ outcomes** · recommend-from-precedent / offer-reuse moves · confidence floor + cold-start · emergent-slot promotion loop | Continuous Feedback (near-term) | ⏳ |
| 15 | Governance Engine (Approval Decision) | stage-6 engine: evaluate Evidence Quality · Policy & Compliance · Semantic Conflicts · Risk & Impact · Delegation (EACI) · Autonomy Eligibility → **5 outcomes** (Auto-Approved · Needs-Clarification · Human-Review · Conditional · Rejected) · drive governance lifecycle states · **enforce the invariant** (rule-based first) | **6 — the missing half** | ⏳ |
| 16 | Human Review Workflow | owner/SME routing map · review tasks · SLA · Review&Evaluate → Decision (approve / request-changes / reject) → Provide Reason (comments · conditions · constraints) · conditional-approval monitor | Human Review · Rejected · Conditional | ⏳ |
| 17 | Handoff & Dispatch | working-memory export (OKF/MD + compression **projection**, never a mutation, §5.1) · artifact expansion (PRD/Plan) · dispatch to a downstream executor with the **persona/config attached** · INT-XXXXX minted at approval | 7 (ID at approval) · handoff | ⏳ |
| 18 | Normalization & Ontology | stage-4: ontology mappings · synonym resolution · standardized intent · domain alignment (feeds the gate's "Valid Domain" check) | **4 — genuinely absent** | ⏳ |
| 19 | Multi-source Capture | Applications/APIs · Agents/Automation · Documents/Emails → the same canonical record (headless capture writes to the trunk) | 1 (other sources) | ⏳ |
| 20 | Progressive Autonomy & Flywheel | outcome capture → patterns & insights → quality & process → models & policies → **widen the auto-approve envelope** | Progressive Autonomy | ⏳ (needs volume) |
| 21 | **V2** — Attached-System Execution Engine | new-vs-existing-system fork · attach harness (repo/dirs/docs) · the senior's full engine: **`budget_ratio`** context allocation · **RAG memory-strategy** (In-Context / Naive / Graph-RAG, chosen by dataset×context) · **overflow→RAG** fallback · **model tiers** + live pricing · **provider payload** (OpenAI/Anthropic/Gemini) · **real execution cost** · **budget auto-pick** ($X→best mode) | execution runtime (ADR-0002 §3) | ⏳ (V2) |
| 22 | **Future** — Execution Agent in Flow | an agent that consumes the built working memory and **runs it** inside Flow; generic outcome (PRD / user story / doc / code); per-user precedent memory folds into Phase 14 | execution (ADR-0002 §3) | 🔭 future |

> **Note (2026-07-15):** Phases 12 (build flow, done) + 13 (studio redesign, next) inserted; the governance/capture arc renumbered to 14–20. Phases 21–22 hold the deferred **V2 / Future** scope from [ADR-0002](../decisions/0002-working-memory-build-flow-and-cost.md) + its amendment, so nothing is lost before it becomes a full spec.

## Guiding Principles
1. Ship working software in every phase
2. Each phase leaves the project in a releasable state
3. Defer scope, not quality
