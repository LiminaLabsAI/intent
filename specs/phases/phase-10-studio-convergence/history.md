# Phase 10 History — Converge the Studio onto `/refine`

### [DECISION] 2026-07-14 — Converge onto `/refine`, not `/studio`
Topics: convergence, studio, auth, effort
Affects-phases: phase-10-studio-convergence
Affects-specs: specs/vision/product-design.md#8, specs/vision/product-design.md#9
Detail: To have ONE Studio, keep `/refine` (which already has auth/login, the app shell, sidebar + history, requesterId binding, PRD/Plan, export, and the graph) and swap its ENGINE to the new agent — rather than rebuilding all the cross-cutting plumbing on `/studio`. User decision after an effort comparison: swapping the backend under `/refine` is strictly cheaper than rebuilding auth + shell + history + PRD/export on `/studio`.

---

### [DECISION] 2026-07-14 — Data model: Intent row = header, event log = body
Topics: data-model, two-pipeline-cleanup, event-sourcing
Affects-phases: phase-10-studio-convergence
Affects-specs: specs/vision/product-design.md#9
Detail: The load-bearing work (identical whichever page we keep) is reconciling the two data models. Resolution: the legacy `Intent` row becomes the record HEADER (requesterId, INT-XXXXX, audit, history, listing); the new `IntentEvent`/`SlotValue` log is the BODY (the agent's slots/states). They bind on the first turn. This is the vision's "two-pipeline cleanup".

---

### [SCOPE_CHANGE] 2026-07-14 — Studio convergence promoted to its own phase
Topics: scope, roadmap
Affects-phases: phase-10-studio-convergence
Affects-specs: specs/planning/roadmap.md
Detail: This was flagged as a "Phase 9 follow-on" (full `/refine` re-point needs the auth+DB stack). Now promoted to Phase 10; the earlier roadmap's Precedent/Governance/Handoff/Flywheel shift to 11–14.

---

### [NOTE] 2026-07-14 — Converged Studio browser-verified end to end
Topics: verification, studio, auth
Affects-phases: phase-10-studio-convergence
Affects-specs: none
Detail: Logged into `/refine` as john@doe.com (seeded ADMIN). A turn ("Set up SSO for our staff apps") classified CREATE, the agent asked a breadth-first scope question, the reply persisted in the chat, and the live record filled (slots · states · evidence · readiness 🔴 Vague · 1/5). Context Graph rendered from entities/context; MD export present; the intent appeared in sidebar history (bound to the Intent header row with requesterId). `/studio` redirects to `/refine`. Fixed one bug: `router.replace` after creating a new intent re-triggered the URL effect and wiped the transcript — guarded with `justCreatedRef`. Also fixed `/expand` model (was ollama, now HF Qwen).

---
