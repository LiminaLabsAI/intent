# Phase 8 History — The Agent Loop

### [DECISION] 2026-07-14 — LLM behind an interface (FakeLLM + HfLLM)
Topics: llm-boundary, testability, determinism
Affects-phases: phase-8-agent-loop
Affects-specs: specs/vision/product-design.md#3.10
Detail: Perceive and Narrate call the LLM through an `LLM` interface. Unit tests use a deterministic `FakeLLM`; a real `HfLLM` (HF router + HF_TOKEN) is exercised only by an integration smoke. Keeps the loop verifiable offline and the determinism boundary crisp (control flow + DECIDE stay pure).

---

### [DECISION] 2026-07-14 — DECIDE is deterministic code, not an LLM
Topics: decide-policy, determinism, governance
Affects-phases: phase-8-agent-loop
Affects-specs: specs/vision/product-design.md#3.5
Detail: The move-selection policy (governance-stop → conflict → split → highest-risk gap → close) is a pure function of the perceived record state. The LLM only phrases the chosen move. This makes behavior provably follow the policy — "deterministic rails, probabilistic path" (the user's framing).

---

### [DECISION] 2026-07-14 — Spine/termination default: gate holds + human-review valve
Topics: spine, termination, governance
Affects-phases: phase-8-agent-loop
Affects-specs: specs/vision/product-design.md#9
Detail: When the user is satisfied but the record is sub-threshold, the agent does not hand off; the escape is the human-review valve. Adopts the governance invariant as the default (flagged in §9 as the buyer's call); reversible if the buyer wants a soft "export anyway, stamped Not-Ready".

---

### [DECISION] 2026-07-14 — Cheap model via env, HF router
Topics: model, cost, config
Affects-phases: phase-8-agent-loop, phase-12
Affects-specs: none
Detail: Default to a small instruct model (Qwen2.5-7B-Instruct class) through the HF router using HF_TOKEN, configurable via `AGENT_MODEL`. Per-persona model/temperature config is a later phase (arc §5/Phase 12); Phase 8 needs only one cheap default.

---

### [SCOPE_CHANGE] 2026-07-14 — Loop shipped as a library + smoke; HTTP/UI → Phase 9
Topics: scope, verification
Affects-phases: phase-8-agent-loop, phase-9
Affects-specs: none
Detail: Like Phase 7, Phase 8 is verifiable without the running Next app or a DB — the loop is a testable library plus a real-model smoke. HTTP routes (`/refine`, `/evaluate` re-pointed) and the Studio UI land in Phase 9 once app + DB + auth env are stood up.

---

### [NOTE] 2026-07-14 — Live model verified; prompt tuning applied
Topics: verification, prompts, model-behavior
Affects-phases: phase-8-agent-loop
Affects-specs: none
Detail: Real HF turn (Qwen2.5-7B-Instruct) on "Migrate our auth to OAuth" → classifies CHANGE, judges the vague one-liner as weak (readiness vague 0/8), DECIDE picks infer_confirm on objective, narration: "I read this as wanting to switch from your current authentication method to using OAuth. Is that correct?" — one move, no barrage. Two prompt fixes were needed: (1) Narrate must not leak internal jargon (slot/rubric/"strong") into user-facing text — now plain-language only; (2) Perceive must be a strict judge (a bare restatement is 'weak', prefer weak over strong) — fixed over-eager readiness. 46/46 tests green.

---
