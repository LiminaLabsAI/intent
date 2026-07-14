# Phase 11 Tasks — Behavior & Cost

> `[ ]` todo · `[/]` in-progress · `[x]` done. Verify: `cd intent/nextjs_space && npm test`.

## Group 0 — Contracts + risk sizing + right-sizing
- [x] `ComplexityAssessment` + `CostEstimate` types; `sized` event; `record.risk`/`complexity`
- [/] Perceive emits risk/complexity assessment → folded into Group 1 (same Perceive call)
- [x] Requiredness / readiness resolve by the assessed risk (`assessReadiness`/`materializeRecord` use `record.risk`) — test added
- [x] Commit `feat(behavior): risk assessment + risk-weighted requiredness`

## Group 1 — Infer-first + batch DECIDE + termination
- [ ] Perceive proposes inferable slots (flag inferred) + judges good-enough-for-risk
- [ ] DECIDE returns the full open-gap set (batch); keeps stop/conflict/close pre-emption
- [ ] Close fires at risk-scoped Ready; sufficient answers accepted
- [ ] Unit tests (FakeLLM): trivial → 1-pass Ready; batch = all gaps
- [ ] Commit `feat(behavior): infer-first + batch DECIDE`

## Group 2 — Cost machine (pure)
- [ ] `lib/agent/cost.ts` — input tokens · output estimate · price catalog · personas · estimateCost(range) · recommendPersona · refineToSave
- [ ] Unit tests — ranges, no false precision
- [ ] Commit `feat(cost): pre-execution advisory`

## Group 3 — Wire batch + cost into UI
- [ ] Narrate composes the batch message (inferred + all gaps, one message)
- [ ] `materializeRecord` includes `costEstimate`
- [ ] Studio cost-advisory panel (range · persona · refine-to-save)
- [ ] Commit `feat(studio): batch narration + cost panel`

## Group 4 — Verification
- [ ] Full suite green
- [ ] Browser: todo-app → 🟢 Ready in one batch pass, no loop; cost band shows
- [ ] Commit `test(behavior+cost): verified`
