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

### [EVALUATOR] 2026-07-14 — Phase 11 acceptance verified live (DeepSeek V4 Flash)
Topics: verification, behavior, cost, termination
Affects-phases: phase-11-behavior-cost
Affects-specs: none
Detail: The todo-CRUD intent that previously looped now: (turn 1) sizes low/trivial, infers objective/scope/out-of-scope/entities/acceptance, reaches actionable 4/5, asks only `context`; (turn 2, answered) reaches ready 5/5 and closes itself — no drip, no re-asking, no loop. A high-risk auth-migration sizes high/complex → 8 required, batches all 6 gaps in one message, persona `thorough`, cost band ~$0.17–$0.46. Cost is right-sized (trivial ≈ $0.0003–$0.0009, `fast`). Suite 54/54. Browser-visual of `/refine` is auth-gated → left to the user.

---
