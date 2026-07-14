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

---
