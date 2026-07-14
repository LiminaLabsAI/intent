# Phase 12 Tasks — Working-Memory Build Flow & Cost Engine

> `[ ]` todo · `[/]` in-progress · `[x]` done. Verify: `cd intent/nextjs_space && npm test`.
> Order: Group 0 → (Group 1 + Group 2) → Group 3 → Group 4.

## Group 0 — Contracts
- [x] `record.built` + `record.actualCost`; `built` event; `emptyRecord` + `apply` updated
- [x] `offer_build` move; decide returns it at ready+!built, `close` at ready+built
- [x] `Usage` + `generateStructuredWithUsage` on the LLM interface (Hf + Fake)
- [x] Commit `feat(agent): build-flow contracts` — 68/68, tsc clean

## Group 1 — Backend build run + actual cost
- [x] `lib/agent/build.ts` `runBuild` — one usage-capturing analysis pass → materialize + `built` w/ actualCost (2 tests)
- [x] Turn route `{ build: true }` action → runBuild; persist transcript line
- [x] `materializeRecord` surfaces `built`/`actualCost` (on `record`, flows through)
- [x] Commit `feat(agent): build run + actual-cost capture` — 70/70

## Group 2 — Clarify: verify assumptions
- [x] Narrate inferred-strong slots as confirm/edit prompts (`verify` move, one batch)
- [x] `verify` moves appended to the gap batch; offer_build narration notes assumptions
- [x] Commit `feat(agent): verify assumptions in clarify` — 71/71

## Group 3 — Studio UI
- [x] Hide slots panel + graph + MD/PRD/Plan until `built`; readiness + cost estimate live during clarify
- [x] "Build working memory" button on `offer_build` (awaitingBuild); clarify placeholder otherwise
- [x] `buildMemory()` → POST `{build:true}` → reveal panel + graph + actual cost line vs estimate
- [x] Commit `feat(studio): build gate + actual-vs-estimate` — tsc clean, 71/71

## Group 4 — Verification
- [x] Unit: offer_build gate · built replay · runBuild actual-cost math · verify move (71/71)
- [x] Live (DeepSeek): intent → select_persona → balanced → **offer_build** (readiness ready, built:false) → **Build** → built:true, **actualCost $0.00011** (est $0.0004–$0.0011), 6 slots materialized; offer_build narration states assumptions + invites correction; thorough → 10 asks (right-sized)
- [x] Full suite green (71/71, tsc 0)
- [~] Browser-visual of `/refine` (panel hidden until build, Build button, actual line) — auth-gated → user confirms
- [x] Commit `test(build-flow): verified`
