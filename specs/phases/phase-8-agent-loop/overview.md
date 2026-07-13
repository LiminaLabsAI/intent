# Phase 8: The Agent Loop (the driver)

> Part of the **Intent Agent build arc** (`feat/intent-agent`, Phases 7→9). No merge to `main` until the arc is complete + tested.
> Builds on Phase 7's deterministic rails. Implements design `specs/vision/product-design.md` §3.4 (loop), §3.5 (DECIDE policy), §3.10 (turn architecture).

## Goal
Make one intent **behave like an agent** — a `perceive → decide → narrate` loop over the Phase-7 record that drives toward Ready, instead of open-ended chat. Deterministic control flow + DECIDE policy in code; the LLM used only at the Perceive and Narrate edges. Delivered as a **testable library + a real-model smoke** (HTTP routes + Studio UI are Phase 9).

## Key Decisions
| Decision | Choice | Why |
|---|---|---|
| LLM boundary | An `LLM` interface; `FakeLLM` for unit tests, `HfLLM` (HF router) for real | Loop is testable without network; determinism boundary stays clean |
| Model | Cheap instruct model via `AGENT_MODEL` env (default Qwen2.5-7B-Instruct class), HF router + `HF_TOKEN` | Low cost, good structured output; swappable |
| DECIDE | Deterministic code — the invariant envelope + gap ranking picks the move; the LLM only phrases it | "Deterministic rails, probabilistic path" — behavior provably follows the policy |
| Spine / termination | Gate holds: no hand-off below Ready; escape = human-review valve | Governance invariant (§4.2); reversible |
| Scope boundary | Loop as a library + smoke; HTTP + UI in Phase 9 | Verifiable now, like Phase 7 |

## Scope
**In:** `LLM` interface + HF adapter + env loading · Perceive (message→slot extraction + LLM `StrengthJudge`, classification on turn 1) · **DECIDE** policy (conflict → split → highest-risk gap → close, + governance-stop stub) · Narrate (voice the chosen move) · turn orchestrator over the event store · integration smoke against a real HF model.

**Out (→ later):** HTTP routes + Studio UI (Phase 9) · precedent/memory + recommend/reuse moves (Phase 10) · full governance/approval engine (Phase 11) · promotion loop (later) · streaming/SSE polish.

## Deliverables
| Deliverable | Verification |
|---|---|
| DECIDE picks the correct move from injected record states | `cd intent/nextjs_space && npm test` (policy suite, deterministic) |
| Perceive maps a message → slot deltas + states (FakeLLM) | `npm test` (perceive suite) |
| Turn orchestrator applies events, advances readiness | `npm test` (orchestrator suite) |
| A real HF turn: vague intent → agent asks the highest-risk gap | `node scripts/agent-turn-smoke.ts` (needs `HF_TOKEN`) |

## Acceptance Criteria
1. DECIDE is a pure function of perceived state — same state → same move (policy tests green).
2. Governance-stop pre-empts; `close` only fires when Readiness = ready (policy tests).
3. A full turn (FakeLLM) folds a message, assesses slots, and returns the chosen move + narration deterministically.
4. Real-model smoke: given "Migrate our auth to OAuth", the agent classifies CHANGE and asks about the highest-risk gap (objective sharpening or rollback), **one or two moves, not a barrage**.
5. `cd intent/nextjs_space && npm test` green (Phase 7 suite still passing + new suites).
