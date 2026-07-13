# Phase 7 History — The Deterministic Trunk

### [DECISION] 2026-07-14 — Event-sourced record as the trunk
Topics: record, event-sourcing, persistence, immutability
Affects-phases: phase-7-record-trunk
Affects-specs: specs/vision/product-design.md#2
Detail: The canonical record is an append-only `IntentEvent` log (source of truth) with a materialized `SlotValue` current-state. Immutability, versioning, and audit derive from it rather than being bolted on.

---

### [DECISION] 2026-07-14 — Layered, code-defined slot schema (resolves rigid-vs-dynamic)
Topics: schema, slots, templates, governance
Affects-phases: phase-7-record-trunk, phase-8
Affects-specs: specs/vision/product-design.md#3.8
Detail: A single rigid schema fails across intent types; fully-dynamic LLM-invented schema breaks governance/audit/precedent. Resolution: universal spine + selected type-templates + promotable emergent slots. The spine is universal; classification reshapes strength rubrics, not the slot set.

---

### [DECISION] 2026-07-14 — Strength split: deterministic now, probabilistic judge deferred
Topics: strength-function, readiness, determinism-boundary
Affects-phases: phase-7-record-trunk, phase-8
Affects-specs: specs/vision/product-design.md#3.9
Detail: The strength function = the Quality Gate's five checks per-slot, continuous. Readiness = f(slot states). The deterministic aggregation + rubric registry ship in Phase 7; the constrained LLM `StrengthJudge` is quarantined behind an interface and deferred to Phase 8 — honoring "deterministic rails, probabilistic agent."

---

### [ARCH_CHANGE] 2026-07-14 — Turn architecture: deterministic spine, thin LLM edges
Topics: turn-architecture, decide-policy, control-flow
Affects-phases: phase-8
Affects-specs: specs/vision/product-design.md#3.10
Detail: Control flow + the DECIDE policy live in code; the LLM is used only at the Perceive and Narrate edges over the shared record. "One brain or two" resolved to neither. Recorded here as the design that Phase 7's rails must support; implemented in Phase 8.

---

### [SCOPE_CHANGE] 2026-07-14 — Phase scoped to the rails only
Topics: scope, build-order
Affects-phases: phase-7-record-trunk
Affects-specs: none
Detail: This phase builds only the deterministic trunk. The Perceive→DECIDE→Narrate loop is Phase 8; the Studio UI re-point + fixes is Phase 9. Trunk before branches.

---

### [DISCOVERY] 2026-07-14 — BUG-001 (/refine UI broken) folded into Group 0
Topics: bug, refine-ui
Affects-phases: phase-7-record-trunk, phase-9
Affects-specs: none
Detail: Existing P0 BUG-001 (`/refine` UI broken) is triaged in Group 0 (minimal fix or root-cause note); the full UI rewire is deferred to Phase 9 when the Studio re-points onto the new record.

---

### [NOTE] 2026-07-14 — Legacy pipeline preserved
Topics: legacy, two-pipeline-cleanup
Affects-phases: phase-7-record-trunk
Affects-specs: specs/vision/product-design.md#9
Detail: The legacy `Intent` wide row and `/api/intents/[id]/process` pipeline are left working and untouched this phase. Convergence onto the one record is deferred.

---
