# Phase 11 Plan — Behavior & Cost

```
# Execution: Group 0 → (Group 1 + Group 2 parallel) → Group 3 → Group 4
```
In `intent/nextjs_space/`. Verify: `cd intent/nextjs_space && npm test` + browser (logged in).

## Group 0 — Contracts + risk sizing + right-sizing
**Sequential. Blocks all.**
- Types: `ComplexityAssessment { risk: Risk; complexity: 'trivial'|'moderate'|'complex'; rationale }` · `CostEstimate { low; high; currency; persona; assumptions[]; refineToSave? }`.
- Perceive emits a risk/complexity assessment (part of the perceive JSON); store as an event/field on the record.
- Right-sizing: `assessReadiness` / requiredness resolves by the **assessed risk** (schema already carries per-risk requiredness) — the risk-scoped required set drives readiness.
- Commit: `feat(behavior): risk/complexity assessment + risk-weighted requiredness`

## Group 1 — Infer-first + batch DECIDE + termination
**Parallel with Group 2.** Deps: G0.
- Perceive: prompt to **propose** inferable slot values (flag inferred) + judge "good-enough-for-risk"; classify risk.
- DECIDE: for the gap case, return **all** open required gaps (ranked), not just the top one; keep governance-stop / conflict / close pre-emption; close when the risk-scoped required set is strong.
- Tests (FakeLLM): trivial intent → Ready in one pass; batch returns all gaps; close fires at right-sized Ready.
- Commit: `feat(behavior): infer-first + batch DECIDE + right-sized termination`

## Group 2 — Cost machine (pure)
**Parallel with Group 1.** Deps: G0 types.
- `lib/agent/cost.ts`: `countInputTokens(record)` (approx chars/4; tiktoken later) · `estimateOutputTokens(record)` (heuristic from scope + acceptance + artifact type) · `PRICE_CATALOG` (per-tier $/1M in/out + prompt-caching discount) · `PERSONAS` · `estimateCost(record, persona) → {low, high}` · `recommendPersona(assessment)` · `refineToSave(record)` (delta vs a tighter-scope baseline).
- Pure + unit-tested — **ranges only, no false precision**.
- Commit: `feat(cost): pre-execution cost advisory (ranges + persona + refine-to-save)`

## Group 3 — Wire batch narration + cost into UI
**Sequential.** Deps: G1 + G2.
- Narrate: compose the **batch** message (acknowledge + inferred + all gaps in one), plain language, no drip.
- `materializeRecord`: include `costEstimate`.
- Studio: a small **cost advisory** panel (range · persona · refine-to-save) in the record panel.
- Commit: `feat(studio): batch narration + cost advisory panel`

## Group 4 — Verification
**Sequential. Last.**
- Full `npm test` green (deterministic sizing/cost/aggregation covered).
- Browser (logged in): "Build a todo CRUD web app" → CREATE, infers obvious slots, **one batch message**, reaches 🟢 Ready with no loop; cost band renders.
- Commit: `test(behavior+cost): right-sized batch + cost advisory verified`
