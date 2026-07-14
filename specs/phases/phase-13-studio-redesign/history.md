# Phase 13 History — Studio Experience Redesign

### [DECISION] 2026-07-15 — Ask-to-enrich replaces assume-then-verify
Topics: agent-behavior, clarify, hallucination
Affects-phases: phase-13-studio-redesign
Affects-specs: specs/decisions/0002-working-memory-build-flow-and-cost.md
Detail: Live testing of Phase 12 showed the agent claiming "I've got everything" and assuming fields, which confuses a business user and risks hallucination. Corrected: the agent's job is to CLARIFY — proactively ask grounded questions that fill gaps and make intent+context richer; assumption is the last resort. The `verify` move becomes a gap-filling question. Grounds the plan to the user's real requirement.

---

### [DECISION] 2026-07-15 — Live fields, always-on build, build-writes-files (reverses Phase 12)
Topics: ux, build, layout
Affects-phases: phase-13-studio-redesign
Affects-specs: specs/decisions/0002-working-memory-build-flow-and-cost.md
Detail: Three Phase-12 decisions reversed from live UX feedback: (1) Understanding fields update LIVE during the conversation (not empty-until-build) so the user watches the intent form; (2) Build is ALWAYS available (not gated at 🟢), status-coloured amber→green — user keeps control; (3) Build writes the deliverable as 1+ OKF markdown files named by the outcome (not "materialize the fields"), removing the separate PRD/Plan buttons. Recorded in the ADR-0002 amendment.

---

### [DECISION] 2026-07-15 — Plain language, enterprise persona names, real model values
Topics: naming, personas, business-users, cost
Affects-phases: phase-13-studio-redesign
Affects-specs: specs/decisions/0002-working-memory-build-flow-and-cost.md
Detail: The layered schema is kept but relabeled in plain language (entities → "what's involved", acceptance_criteria → "how we'll know it's done") — jargon confuses business users. Personas renamed for enterprise legibility: Quick / Balanced / Deep-dive (was fast/balanced/thorough; "thorough" was rejected as unclear). CostModel to be seeded with real DeepInfra / DeepSeek V4 Flash values so the estimate is directional and the actual = measured usage × real prices.

---

### [DECISION] 2026-07-15 — Deliverable = OKF files named by outcome; agent asks the outcome early
Topics: okf, outcome, files, generalization
Affects-phases: phase-13-studio-redesign
Affects-specs: specs/decisions/0002-working-memory-build-flow-and-cost.md
Detail: Build produces the deliverable as full-spec Open Knowledge Format (Google, versioned) markdown files, 1+ per the scenario, NAMED BY THE OUTCOME (diagram.md / plan.md / script.md …) — not hard-bound to "plan". The agent asks early what outcome/format the user wants (full plan / diagram / script / doc) so the files match. Generalized for any business use case, not code. Selected mode persists visibly the whole session (top strip).

---

### [NOTE] 2026-07-15 — Phase 13 revises Phase 12 (both on feat/intent-agent)
Topics: planning, phase-12, phase-13
Affects-phases: phase-13-studio-redesign
Affects-specs: specs/planning/roadmap.md
Detail: Phase 12 (build flow) shipped, then live UX testing produced the reversals above. Rather than retro-edit a completed phase, Phase 13 captures the redesign; the roadmap inserts it and renumbers the governance arc 13–21 → 14–22. Foundation (persona gate, cost engine, build run) is reused.

---
