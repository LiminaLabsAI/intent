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
- [ ] Hide working-memory panel until `built`; readiness status prominent during clarify
- [ ] "Build working memory" button on `offer_build`
- [ ] On build → reveal panel + graph + actual-vs-estimate
- [ ] Commit `feat(studio): build gate + actual-vs-estimate`

## Group 4 — Verification
- [ ] Unit: offer_build gate · built replay · runBuild actual-cost math
- [ ] Live (DeepSeek): intent → pick → clarify (empty panel, 🔴→🟢, assumptions verified) → Build → materialize + actual vs estimate
- [ ] Full suite green
- [ ] Commit `test(build-flow): verified`
