# Phase 12 Tasks — Working-Memory Build Flow & Cost Engine

> `[ ]` todo · `[/]` in-progress · `[x]` done. Verify: `cd intent/nextjs_space && npm test`.
> Order: Group 0 → (Group 1 + Group 2) → Group 3 → Group 4.

## Group 0 — Contracts
- [ ] `record.built` + `record.actualCost`; `built` event; `emptyRecord` + `apply` updated
- [ ] `offer_build` move; decide returns it at ready+!built, `close` at ready+built
- [ ] `Usage` + `generateStructuredWithUsage` on the LLM interface (Hf + Fake)
- [ ] Commit `feat(agent): build-flow contracts`

## Group 1 — Backend build run + actual cost
- [ ] `lib/agent/build.ts` `runBuild` — one usage-capturing analysis pass → materialize + `built` w/ actualCost
- [ ] Turn route `{ build: true }` action → runBuild; persist transcript line
- [ ] `materializeRecord` surfaces `built`/`actualCost`
- [ ] Commit `feat(agent): build run + actual-cost capture`

## Group 2 — Clarify: verify assumptions
- [ ] Narrate inferred-strong slots as confirm/edit prompts (one batch)
- [ ] Inferred-verify signal to Narrate (doesn't block readiness)
- [ ] Commit `feat(agent): verify assumptions in clarify`

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
