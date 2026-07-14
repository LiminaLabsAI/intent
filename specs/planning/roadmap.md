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

### The Intent Agent build arc
> One feature branch `feat/intent-agent`. Phases 7→9 build + test on it with **no merge to `main` until the working product is complete and verified**. Phases 10–13 continue after the first merge. Design reference: `specs/vision/product-design.md` §3.4–3.10.

| Phase | Name | Delivers | Design ref |
|-------|------|----------|------------|
| 7 | Deterministic Trunk | event-sourced record · slot schema · state machine · deterministic strength (the rails) | §3.6/3.8/3.9 |
| 8 | The Agent Loop | Perceive→coded-DECIDE→Narrate · LLM strength-judge · gap→move · one intent end-to-end | §3.4/3.5/3.10 |
| 9 | Studio on the Trunk + Fixes | re-point Studio UI onto the record · Readiness states · evidence visible · fix BUG-001 | §5.1 |
| 10 | Studio Convergence | one Studio: swap `/refine`'s engine to the agent, bind to Intent row + auth, retire the old flow | §8/§9 |
| 11 | Precedent & Memory | prior intents + outcomes · recommend/reuse moves · confidence floor · promotion loop | §3.7 |
| 12 | Governance Thread | approval decision + human review + conditional · Governance-stop move | §4.3–4.5 |
| 13 | Handoff & Advisory | working-memory export · artifact expansion · cost/persona advisory | §5 |
| 14 | Feedback Flywheel | outcome capture → widen auto-approve envelope | §6 |

## Guiding Principles
1. Ship working software in every phase
2. Each phase leaves the project in a releasable state
3. Defer scope, not quality
