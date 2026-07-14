# Phase 11 Tasks — Behavior & Cost

> `[ ]` todo · `[/]` in-progress · `[x]` done. Verify: `cd intent/nextjs_space && npm test`.

## Group 0 — Contracts + risk sizing + right-sizing
- [x] `ComplexityAssessment` + `CostEstimate` types; `sized` event; `record.risk`/`complexity`
- [/] Perceive emits risk/complexity assessment → folded into Group 1 (same Perceive call)
- [x] Requiredness / readiness resolve by the assessed risk (`assessReadiness`/`materializeRecord` use `record.risk`) — test added
- [x] Commit `feat(behavior): risk assessment + risk-weighted requiredness`

## Group 1 — Infer-first + batch DECIDE + termination
- [x] Perceive: proposes inferable slots (inferred flag), sizes risk/complexity (emits `sized`), judges adequate-for-risk
- [x] DECIDE returns the full open-gap set (batch); keeps stop/conflict/close pre-emption; risk-scoped default
- [x] Close fires at risk-scoped Ready (readiness uses assessed risk)
- [x] Unit tests: batch = all gaps; right-sizing (live 1-pass check in G4)
- [x] Commit `feat(behavior): infer-first + batch DECIDE`

## Group 2 — Cost machine (pure)
- [x] `lib/agent/cost.ts` — input tokens · output estimate · price catalog · personas · estimateCost(range) · recommendPersona · refineToSave
- [x] Unit tests — ranges, no false precision (6/6)
- [x] Commit `feat(cost): pre-execution advisory`

## Group 3 — Wire batch + cost into UI
- [x] Narrate composes the batch message (acknowledge captured + inferred, then all gaps in one message) — API-verified
- [x] Provenance made DETERMINISTIC (derived, not the LLM's self-report) + persisted on `Slot.inferred`
- [x] `materializeRecord` includes `cost` (CostEstimate)
- [x] Studio cost-advisory panel (range · persona · refine-to-save) + inferred badge — typechecks clean; page compiles
- [x] Commit `feat(studio): batch narration + cost panel`

## Group 4 — Verification
- [x] Full suite green — 54/54 (fresh run)
- [x] Live behavior (DeepSeek V4 Flash, API-driven): todo-app **actionable (4/5) in ONE pass**, agent infers objective/scope/out-of-scope/entities/acceptance and asks only the single unknowable (`context`); on the answer it reaches **🟢 ready (5/5)** and **closes itself** — **no drip, no re-asking, no loop** (2-turn transcript captured in history)
- [x] Cost band present in the record view (`view.cost`); deterministic provenance badges (`inferred`) verified
- [~] Browser-visual click-through of `/refine` is the user's to do — the page is auth-gated and credential entry is out of scope for the agent (page compiles clean, tsc 0 errors)
- [x] Commit `test(behavior+cost): verified`
