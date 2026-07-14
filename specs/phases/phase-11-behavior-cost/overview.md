# Phase 11: Behavior & Cost

> On `feat/intent-agent`. Implements `product-design.md` §3.11 (refinement cycle) + §5.2 (cost advisory); activates the deferred risk-weighted requiredness (§3.9). Fixes the "todo-app interrogation loop."

## Goal
Make the refinement cycle behave right — **right-sized, inference-first, batch (not drip), self-owned termination** — and add the **pre-execution cost advisory**.

## Key Decisions
| Decision | Choice |
|---|---|
| Interaction | **Batch (O4) is the default** — draft + all gaps in one message, not 1–2/turn |
| Rigor | **Right-size** the required-set + "strong" bar by complexity × risk |
| Elicitation | **Infer-first** — propose inferable slots; `ask` only genuine unknowns |
| Termination | Agent owns it (Readiness = f(slots)); accept "good enough for the risk" |
| Cost | Downstream-**execution** advisory as **ranges** (not a bill); mostly deterministic (token count + output heuristic + price catalog) + persona rec + refine-to-save |
| Determinism | sizing / requiredness / cost math = pure + unit-tested; LLM parts behind `FakeLLM` |

## Scope
**In:** complexity/risk assessment in Perceive · risk-weighted requiredness resolution · infer-first proposing · DECIDE returns the **full** gap set (batch) · batch Narrate · self-owned termination + good-enough judging · cost machine (`lib/agent/cost.ts`) · cost advisory in the Studio · tests.

**Out (later phases):** precedent (12) · governance engine (13) · human review (14) · dispatch (15) · ontology (16) · multi-source (17) · autonomy (18) · optional "interview me" guided-drip mode.

## Deliverables (verify: `cd intent/nextjs_space && npm test`)
| Deliverable | Verification |
|---|---|
| Right-sizing: trivial intent → few required slots → Ready fast | unit test |
| Batch: DECIDE returns all open gaps; Narrate = one message | unit test (FakeLLM) |
| Cost: deterministic estimate → range + persona + refine-to-save | unit test |
| Todo-app reaches 🟢 Ready in ~1 pass, no loop; cost band shows | browser (logged in) |

## Acceptance Criteria
1. "Build a todo CRUD web app" reaches 🟢 **Ready in a single batch pass** — agent infers the obvious, no drip, no re-asking.
2. DECIDE returns the full open-gap set; Narrate composes **one** batch message.
3. Cost advisory shows a **range** + recommended persona + refine-to-save delta — never a false-precise single number.
4. `npm test` green.
