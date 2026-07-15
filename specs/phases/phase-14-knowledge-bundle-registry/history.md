# Phase 14 History — Knowledge Bundle Registry & Cyclic Refinement

### [SCOPE_CHANGE] 2026-07-15 — New Phase 14 inserted; intent-lifecycle arc renumbers
Topics: roadmap, registry, phase-numbering
Affects-phases: phase-14-knowledge-bundle-registry (new); Phase 15+ (renumbered)
Affects-specs: specs/planning/roadmap.md
Detail: Added Phase 14 = Knowledge Bundle Registry & Cyclic Refinement. The existing roadmap's "Precedent & Memory" (14→15) now follows it: precedent memory reads what this registry writes. Governance 15→16; Human Review 16→17; Handoff 17→18; Normalization 18→19; Multi-source 19→20; Progressive Autonomy 20→21; V2 21→22; Execution Agent 22→23. Rationale: registry + versioning is the load-bearing seam between the clarity half (Phases 7–13, done) and the control half (governance, Phase 16); both renumbered Precedent (15) and Governance (16) consume it.

---

### [DECISION] 2026-07-15 — Knowledge Bundle (OKF) is the versioned subject; Intent Registry holds Intents
Topics: naming, ontology, okf, registry
Affects-phases: phase-14-knowledge-bundle-registry
Affects-specs: specs/vision/product-design.md#4.6 (Intent Registry unchanged), #5.1 (export)
Detail: The thing we version and publish is the OKF **Knowledge Bundle** (Google Open Knowledge Format, published 2026-06-12 v0.1 Draft): a directory of concept `.md` files + optional `index.md` / `log.md`. The Intent Registry (design doc §4.6, image label "Intent Registry") remains the system-of-record for INTENTS and now also holds their versioned bundles as children. "Memory" (collides with Phase 15 Precedent & Memory + LLM-context sense), "Outcome" (already a lifecycle noun §3.6), and "Intent" (the parent, not the deliverable) are all rejected. "Artifact" stays as the casual UI word for the draft; the canonical noun is Knowledge Bundle in both draft and published states.

---

### [DECISION] 2026-07-15 — Two-tier immutable history (drafts + published)
Topics: versioning, immutability, audit, drafts, publish
Affects-phases: phase-14-knowledge-bundle-registry
Affects-specs: specs/vision/product-design.md#4.6
Detail: Draft checkpoints (every refine/build) are append-only, immutable rows — git-commit-like; free one-click restore. Published versions are git-tag-like: immutable forever, citable, shareable, with auto-supersession on the next Publish (one `latestPublished` pointer per bundle). Nothing is ever mutated or deleted; the only "revert" is forward — restore-as-new-draft seeds a fresh draft from any version's content (history untouched). Deprecate / Archive are flag-only. Satisfies the §4.6 immutability requirement + the Traceability-First principle.

---

### [DECISION] 2026-07-15 — Hybrid refinement (full re-build default + per-concept manual override)
Topics: refine-engine, cost, deltas, content-hash
Affects-phases: phase-14-knowledge-bundle-registry
Affects-specs: specs/decisions/0002-working-memory-build-flow-and-cost.md (operationalized)
Detail: Each refine run regenerates the bundle (full re-build, correct-by-construction — no stale-file bugs, no missed cross-file couplings like "shorten §3 also changes the diagram"); the OKF-tree diff then shows only the concepts whose content hash actually changed. A per-concept "Regenerate just this concept" action gives the cheap targeted path when the user knows only one file needs work. Auto-delta (LLM decides which concepts to touch) is deferred to V2 — needs a Rule-11-locked evaluator whose prerequisite data is "identical-regen rate," which this phase starts producing implicitly.

---

### [DECISION] 2026-07-15 — Ungated Publish in V1; governance coupling deferred to Phase 16
Topics: governance, publish-gate
Affects-phases: phase-14-knowledge-bundle-registry; phase-16-governance-engine (future)
Affects-specs: specs/vision/product-design.md#4.3
Detail: Publish is a user action in V1 — taken when the user is satisfied; no governance/approval gate. Rationale: the load-bearing invariant is "no EXECUTION without gate + approval" (§4.2/§4.3); publishing a deliverable is not execution (dispatch is Phase 18). The Governance Engine (Phase 16) later JUDGES a published version ("request-changes" → forces a draft → refine → publish vN+1) and reuses this exact state machine — so we build the skeleton Phase 16 hangs on, without half-building governance.

---

### [DECISION] 2026-07-15 — INT-namespaced version identity; continuous refine-loop
Topics: identity, sharing, ux, refine-loop
Affects-phases: phase-14-knowledge-bundle-registry
Affects-specs: none (new)
Detail: A published bundle's address is INT-namespaced (`INT-0007/v1`, shareable `/i/INT-0007/v1`) — a global `KB-XXXX` id pays only when bundles leave their intent, which V1 doesn't need. Refinement is continuous: the same chat continues after a build; any post-build message is perceived as a refine instruction (a new `refine` move in the DECIDE policy). A dedicated Refine mode and inline file editing were rejected (over-ceremony / V1 risk). Per-file Regenerate is the targeted override surface.

---

### [DISCOVERY] 2026-07-15 — OKF spec sourced (Google Cloud, 2026-06-12, v0.1 Draft)
Topics: okf, research, standards
Affects-phases: phase-14-knowledge-bundle-registry
Affects-specs: none
Detail: OKF (Open Knowledge Format) is real — published by Google Cloud on 2026-06-12 as v0.1 Draft. A **Knowledge Bundle** is a directory tree of markdown concept files with YAML frontmatter (required `type`); reserved filenames `index.md` (progressive disclosure) and `log.md` (date-grouped changelog). Recommends distribution as a git repository ("history, attribution, diffs"). This grounds our tree/version model: a `BundleVersion` is an immutable tree snapshot; refinement = parent tree + delta; per-concept diffs are git-shaped. ADR-0002 already commits to "OKF, full spec compliance, versioned" — this phase operationalizes that recorded decision.

---

### [DISCOVERY] 2026-07-15 — ENH-003 deferred again; routed to a /hotfix quick-task
Topics: build-prompt, personas, scope
Affects-phases: phase-14-knowledge-bundle-registry
Affects-specs: specs/backlog/backlog.md (ENH-003)
Detail: ENH-003 (mode-scaled build depth — Deep-Dive should produce a deeper bundle than Quick) also touches the build/refine prompt we're now re-touching. Folding it in here is cheap but expands phase scope; left explicit as a non-goal, recommended as a `/hotfix` quick-task before or after this phase (Rule 14 — the lightest work type that fits). Not lost; just sequenced out to keep this phase focused.

---