---
type: Decision
---

# 0003 — Knowledge Bundle Registry: versioned OKF deliverables + cyclic refinement

> **Status**: accepted
> **Date**: 2026-07-15
> **Deciders**: er.mayank000@gmail.com (product), agent
> **Amends**: [[0002-working-memory-build-flow-and-cost]] (operationalizes "OKF markdown files, full spec compliance, versioned")

## Context

The Intent Studio's Build run (Phase 13) writes the deliverable as 1+ OKF markdown files, but stores them on `record.files` — a **destructive scratch field**: every Rebuild overwrites them. There is no version history, no addressability, no immutability once "done," and the only "refinement" is a force-flag that throws the past away. ADR-0002 already committed to *versioned* OKF files but never defined the registry model.

Two related backlog entries converge here: **FEAT-005** (publish a built artifact as a versioned v1 — a registry) and **FEAT-006** (cyclical conversational refinement — review → ask agent to change X → another run). They are one system: refinement is **how versions are born**; the registry is **where they live with lineage**. Build them apart and each is half-useful.

This phase is also the load-bearing seam between the *clarity* half (Phases 7–13, done) and the *control* half (Governance). Precedent memory (renumbered Phase 15) needs prior artifacts + outcomes to recommend reuse; the Governance Engine (Phase 16) judges a published candidate and responds to review with "request-changes" → a refined version. Both read what this registry writes.

Forces in play: Google published the **Open Knowledge Format** (OKF) v0.1 Draft on 2026-06-12 — a vendor-neutral spec whose unit of distribution is exactly our deliverable (a **Knowledge Bundle** = a directory of markdown concept files, with reserved `index.md` / `log.md`, recommending git for history). Our own ontology (`product-design.md` §3.6, §4.6, §5.1) already defines the **Intent** as the governed unit and the **Intent Registry** (§4.6) as the immutable, versioned system-of-record for intents — and the working-memory export (§5.1) as a derived, provenance-tagged projection.

## Options Considered

### Option A — Artifact (deliverable files) is the versioned subject
A bundle is its own registry row (e.g. `ART-0007`) independent of the intent, with v1/v2/v3. Closest to HuggingFace Hub / DVC model registry.
**Pros:** Shareable link points at the artifact, not the intent; HF-style one-repo-per-artifact semantics; clean separation.
**Cons:** Orphans the bundle from its intent parent — bad for lineage (precedent needs bundle→intent); adds a top-level entity and a second linkage surface; "Intent Registry" label in the architecture would stop meaning what §4.6 defines.

### Option B — Intent is the only registry root; artifacts are versions OF the intent
`INT-0007` stays the registry root; its built files are versioned outputs — "INT-0007 v1", each a full snapshot of the artifact set.
**Pros:** Simplest; matches the existing `INT-XXXXX` spine + §4.6 definition; lineage is trivial.
**Cons:** Sharing "just the plan" routes through the intent; switching outcome (plan → diagram) is an odd "v4 is now a diagram" jump.

### Option C — Files are first-class; each versioned independently
`plan.md` has its own v1/v2/v3, `diagram.md` its own stream.
**Pros:** Maximum granularity.
**Cons:** "What does the user Publish?" breaks down; precedent/governance loses the "one deliverable" notion; UX is heavy. Not recommended.

## Decision

**A synthesis grounded in OKF + a two-tier history, namespaced under the intent.**

1. **The versioned subject is the OKF Knowledge Bundle** (OKF's own term): a directory of concept `.md` files, with reserved `index.md` / `log.md`. In draft state the UI casually calls it an "artifact"; the canonical noun is **Knowledge Bundle** in both draft and published states (same object, state change only). Not "memory" (collides with Phase 15 + the LLM-context sense), not "outcome" (already a lifecycle noun §3.6), not "intent" (the parent).
2. **The Intent Registry stays the system-of-record holding Intents** (§4.6, image-aligned). A built Intent publishes **versioned OKF Knowledge Bundles as versioned children** — namespaced `INT-0007/vN`, shareable `/i/INT-0007/vN`. No separate "Knowledge Registry" (would orphan bundles from intents and break lineage).
3. **Two-tier immutable history** — draft checkpoints (every refine/build; append-only, immutable; git-commit-like; free one-click restore) + published versions (git-tag-like; immutable forever; citable; auto-supersede on next Publish; one `latestPublished` pointer). Nothing is ever mutated or deleted. The only "revert" is forward — restore-as-new-draft seeds a fresh draft from any version's content. Deprecate / Archive are flag-only. → Satisfies §4.6 immutability + Traceability-First.
4. **Hybrid refinement** — each refine run fully re-builds the bundle (correct-by-construction; no stale-file bugs; no missed cross-file couplings like "shorten §3 also changes the diagram"); the OKF-tree diff then shows only the concepts whose content hash changed. PLUS a manual **"regenerate just this concept"** targeted override when the user knows only one file needs work. **Auto-delta (LLM decides which concepts to touch) is deferred to V2** — it needs a Rule-11-locked evaluator; its prerequisite data is the "identical-regen rate," which this phase starts producing implicitly.
5. **Continuous refine-loop** — the same chat continues after a Build; any post-build message is perceived as a refine instruction (a new `refine` move in the DECIDE policy). No dedicated Refine mode and no inline file editing — both rejected (over-ceremony / V1 risk).
6. **Version label = the user's refine-request text**, not a timestamp; user may name on Publish. We already have the request text in the transcript — auto-labelling is the UX differentiator (Google Docs lets you name versions but no one does, because names are divorced from the work; ours aren't).
7. **Ungated Publish in V1** — a user action, taken when satisfied. The load-bearing invariant is "no *execution* without gate + approval" (§4.2/§4.3); *publishing a deliverable is not execution* (dispatch is Phase 18). The Governance Engine (Phase 16) later JUDGES a published version and reuses this exact state machine ("request-changes" → draft → refine → publish vN+1) — building the skeleton Phase 16 hangs on without half-building governance.
8. **`log.md` autogenerated inside every published bundle** (OKF-native changelog, date-grouped, refine-request labels + publish names) so a bundle is self-describing of its own history even outside Flow (OKF's exchange goal).

**BundleVersion state machine:** `DRAFT → PUBLISHED` (Publish; auto-supersedes the prior `latestPublished`) `→ SUPERSEDED` (automatic); `PUBLISHED → DEPRECATED` (user flag) and `→ ARCHIVED` (user soft-hide; audit-only); `restore-as-draft` from any state spawns a new DRAFT seeded from that version's content (forward; history untouched).

## Consequences

**Easier:** the build/refine flow stops being destructive — every Rebuild that users already love gets free undo + history for the cost of one append. The registry's immutability is free (copy-on-write of immutable rows). Lineage to Phase 15 (precedent) and Phase 16 (governance) is inherent — they read `BundleVersion` rows with attached `understandingSnapshot`. Sharing a specific version (`/i/INT-0007/v1`) is a stable, immutable address — exactly what a reviewer cites, exactly what a precedent search retrieves. Naming aligns with Google's published standard (OKF), so our deliverables are portable/exchangeable, not proprietary.

**Harder / changes from today:** `Intent.files` reads must migrate to `draftHead.ConceptFiles` (drop the dual-store — the §7 trap; backfilled as a seed DRAFT). The agent needs a new `refine` move + post-build perception. The Artifacts card grows a Drafts & Versions drawer (UI surface). A published bundle must pass OKF conformance before publish (a real gate inside an otherwise ungated Publish).

**Deferred deliberately (V2 / later phases):** auto-delta refinement (needs locked evaluator), global `KB-XXXX` id / cross-intent sharing / external share token, external git-repo distribution, named branches/forks, inline bundle editing, approval-gated Publish (Phase 16), precedent memory (Phase 15), ENH-003 mode-scaled build depth (recommended as a `/hotfix` quick-task since it also touches the build prompt).