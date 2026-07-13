# Phase 9: Studio on the Trunk (+ BUG-001)

> Final phase of the **Intent Agent build arc** (`feat/intent-agent`). Ships a usable browser experience of the agent. No merge to `main` until the user reviews the arc.
> Builds on Phase 7 (rails) + Phase 8 (loop). Implements design §5.1 (record-first Studio surface) and the readiness UI (§3.9).

## Goal
A **working, usable agent Studio in the browser** — split-screen: conversation on the left driving the Phase-8 loop, the live record (slots · states · readiness 🔴🟡🟢) on the right building itself. Plus BUG-001 resilience.

## Key Decisions
| Decision | Choice | Why |
|---|---|---|
| Auth/DB dependency | New `/studio` + `/api/agent/*` **outside** the middleware matcher; in-memory store + HfLLM | Usable immediately with no login/DB; matches infra available now |
| Persistence | In-memory (survives the dev-server process) | A working demo now; Prisma/DB swap is a documented follow-on (adapter already exists, Phase 7) |
| BUG-001 | Make `/refine` resilient (guard Prisma/session) | Stops the 500; full re-point onto the new record is a follow-on needing the DB/auth stack |
| Verification | Real browser (Claude Browser) against `next dev` | "Working product" means it works in a browser, not just tests |

## Scope
**In:** `/api/agent/turn` + `/api/agent/record/[id]` routes (in-memory store singleton + HfLLM) · `/studio` split-screen client page (chat + LiveRecord + readiness badge) · BUG-001 resilience fix · minimal app `.env` · browser verification.

**Out (documented follow-ons):** DB persistence wiring (swap `defaultStore()` to Prisma + migrate) · full `/refine`/`/evaluate` re-point onto the new record · Knowledge Graph / MiniGraph re-point · artifact expansion re-point · precedent/memory (Phase 10).

## Deliverables
| Deliverable | Verification |
|---|---|
| `/api/agent/turn` runs a real agent turn | `curl` POST → JSON with moves + reply + readiness |
| `/studio` renders split-screen and drives the loop | Browser: send a vague intent, see classification + question + record filling |
| Readiness badge reflects `f(slot states)` | Browser: badge shows 🔴→🟡 as slots fill |
| `/refine` no longer 500s without DB/auth | Browser/log: renders (empty state) instead of crashing |
| Existing tests still green | `cd intent/nextjs_space && npm test` |

## Acceptance Criteria
1. In the browser at `/studio`, entering "Migrate our auth to OAuth" yields: CHANGE classification, one targeted question (highest-risk gap), and the live record shows the objective captured with its state.
2. The right panel lists the resolved schema slots with their states and the readiness band.
3. `/refine` renders without throwing when DB/auth are unconfigured.
4. `npm test` remains green (Phases 7–8 unaffected).
