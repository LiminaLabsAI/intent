# Phase 11 History — Behavior & Cost

### [DECISION] 2026-07-14 — Batch (O4) is the default interaction, not 1–2/turn
Topics: behavior, refinement-cycle, o4
Affects-phases: phase-11-behavior-cost
Affects-specs: specs/vision/product-design.md#3.11
Detail: A real transcript (a todo-CRUD app) showed the agent dripping one question at a time, re-asking the same slot, and never accepting a "good enough" answer — even asking the user to narrate how the built app would be tested. User decision: the agent analyzes intent+context and presents the draft + ALL gaps at once (the vision's O4 fast lane), and the user answers in bulk. Overrides §3.5's "1–2 gaps per turn" for the common path.

### [DECISION] 2026-07-14 — Agent is a spec-writer; it owns termination
Topics: behavior, termination, first-principles
Affects-phases: phase-11-behavior-cost
Affects-specs: specs/vision/product-design.md#3.11
Detail: The agent refines to "record Ready to hand off," right-sized to risk — it never asks the user how the executed app would be verified (that's the executor's test), and never re-poses "how will we know it's done?" (Readiness = f(slot states) is its own call). Root cause of the loop was outsourcing termination to the user.

### [DECISION] 2026-07-14 — Right-size rigor by complexity × risk (activate the deferred lever)
Topics: right-sizing, requiredness, risk
Affects-phases: phase-11-behavior-cost
Affects-specs: specs/vision/product-design.md#3.9
Detail: A trivial low-risk intent gets a small required-set (reaches Ready in one pass); a high-risk change gets the full template. This activates the risk-weighted requiredness matrix designed but deferred in §3.9. It is what stops over-interrogation.

### [DECISION] 2026-07-14 — Cost is a downstream-execution advisory, shown as ranges
Topics: cost, advisory, false-precision
Affects-phases: phase-11-behavior-cost
Affects-specs: specs/vision/product-design.md#5.2
Detail: The cost machine estimates what the downstream EXECUTOR would spend (not our refinement, not a bill): cost = input_tokens (measured record) × price_in + output_tokens (estimated from scope/acceptance/artifact) × price_out, per-tier catalog + caching. Shown as RANGES + a persona recommendation + refine-to-save — never a false-precise single number. Mostly deterministic; unit-tested.

### [NOTE] 2026-07-14 — BUG-001 resolved by Phases 9–10
Topics: bug, refine-ui
Affects-phases: phase-11-behavior-cost
Affects-specs: none
Detail: BUG-001 (`/refine` UI broken) is resolved — Phase 9 guarded the render, Phase 10 converged `/refine` onto the agent (browser-verified). Flipping it to resolved in the backlog.

### [DECISION] 2026-07-14 — Slot provenance is DETERMINISTIC, not the LLM's self-report
Topics: provenance, inferred, determinism, core-principle
Affects-phases: phase-11-behavior-cost
Affects-specs: specs/vision/product-design.md#3.11
Detail: The `inferred` badge (which values the agent supplied vs the user stated) is derived deterministically — a value is inferred when <25% of its content words trace to anything the user actually said. We do NOT trust the model's `inferred` flag: DeepSeek V4 Flash swung from flagging nothing to flagging everything under prompt pressure. Provenance is a fact about the input, so it belongs on a deterministic rail — the exact "deterministic systems a probabilistic agent runs on" principle. Persisted on `Slot.inferred` via the `slot_valued` event; a later user edit clears the flag.

### [DISCOVERY] 2026-07-14 — Three behavior bugs surfaced in /refine testing
Topics: behavior, right-sizing, termination, deferral
Affects-phases: phase-11-behavior-cost
Affects-specs: specs/vision/product-design.md#3.11
Detail: Real user session exposed (1) turn.ts passing hardcoded 'medium' to decide/materialize, silently defeating the risk-weighted requiredness built in G0 — the assessed risk was decorative; (2) a deferral ("I have no tech stack, you choose") judged as a weak gap and re-asked verbatim every turn — the loop resurfacing in a subtler form; (3) no terminal state, so an at-Ready "yes" re-offered the handoff forever. All three are the same "accept answers + terminate" theme. Fixed: honor record.risk; treat deferral/decline as a strong decision; add DRAFT→IN_PROGRESS→APPROVED handoff with a decide() short-circuit to `handoff_complete`.

### [ARCH_CHANGE] 2026-07-14 — Artifact (PRD/Plan) surface = streaming slide-over drawer
Topics: studio, ui, artifacts, ux
Affects-phases: phase-11-behavior-cost
Affects-specs: none
Detail: PRD/Plan previously rendered inside the record column, burying the working memory (the studio's centerpiece) and overflowing. User decision: a slide-over drawer that overlays the studio (working memory stays intact), streaming markdown live, with PRD/Plan tabs + download. Also installed @tailwindcss/typography — the `prose` classes were inert so markdown had been rendering flat.

### [DECISION] 2026-07-14 — ADR-0001: configurable, deterministic cost estimator
Topics: cost, config, personas, determinism, reference-class
Affects-phases: phase-11-behavior-cost
Affects-specs: specs/decisions/0001-configurable-cost-estimator.md, specs/vision/product-design.md#5.2
Detail: FORGE design session with the user re-architected the Phase-11 cost machine. Decision: separate config-as-data (CostModel/Persona/EstimationPrior — every volatile model/provider var, live-editable in Postgres, seeded from a versioned default) from a pure deterministic estimateCost (config passed IN, never queried) from the measurement layer (working memory → tokens). Output = reference-class forecasting (artifact×complexity priors × persona settings) shown as honest bands, calibratable from logged estimated-vs-actual (CostObservation). One model backing N personas by settings now; multi-model/provider supported by construction. Riskiest assumption named: the output estimate is the only uncertain input — quarantined behind the reference class; commitments (measured priors, day-one logging, staleness surfacing) are what keep it from becoming a dressed-up constant.

### [ARCH_CHANGE] 2026-07-14 — Cost machine implemented per ADR-0001 (4 Neon tables)
Topics: cost, prisma, calibration
Affects-phases: phase-11-behavior-cost
Affects-specs: none
Detail: Built lib/agent/cost-config.ts (types + default catalog), cost.ts (pure estimateCost/advise), measure.ts (working memory → tokens), cost-catalog.ts (DB loader + fallback); Prisma models CostModel/Persona/EstimationPrior/CostObservation pushed to Neon and seeded (1 model, 3 personas, 12 priors). /api/expand logs CostObservation. Removed the max_output cost cap (collapsed the band on large tasks). Verified: editing a DB price reflects live; auth-migration band $0.009–$0.027; 65/65 tests.

### [EVALUATOR] 2026-07-14 — Phase 11 acceptance verified live (DeepSeek V4 Flash)
Topics: verification, behavior, cost, termination
Affects-phases: phase-11-behavior-cost
Affects-specs: none
Detail: The todo-CRUD intent that previously looped now: (turn 1) sizes low/trivial, infers objective/scope/out-of-scope/entities/acceptance, reaches actionable 4/5, asks only `context`; (turn 2, answered) reaches ready 5/5 and closes itself — no drip, no re-asking, no loop. A high-risk auth-migration sizes high/complex → 8 required, batches all 6 gaps in one message, persona `thorough`, cost band ~$0.17–$0.46. Cost is right-sized (trivial ≈ $0.0003–$0.0009, `fast`). Suite 54/54. Browser-visual of `/refine` is auth-gated → left to the user.

---
