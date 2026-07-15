# Phase 14 Tasks — Knowledge Bundle Registry & Cyclic Refinement

- [ ] **Group 0: Contracts, schema, validator (sequential; blocks all)**
  - [ ] Sketch `KnowledgeBundle` / `BundleVersion` / `ConceptFile` models; review parent/delta pointers
  - [ ] Add bundle event types to `IntentEvent` (`draft_created`, `version_published`, `version_superseded`, `version_deprecated`, `version_archived`, `restored_as_draft`)
  - [ ] Extend `okf.ts` → `okfValidator(bundle)` (frontmatter + type; reserved filenames)
  - [ ] Migration: backfill `Intent.files` → seed DRAFT per intent; switch live reads to `draftHead` (drop `Intent.files` reads — avoid dual-store drift)
  - [ ] Unit + `tsc`

- [ ] **Group 1: Registry API + state machine + shareable route (parallel w/ G2)**
  - [ ] `POST /api/bundle/[id]/refine` (full re-build → new DRAFT)
  - [ ] `POST /api/bundle/[id]/regenerate-concept` (targeted override)
  - [ ] `POST /api/bundle/[id]/publish` (auto-supersede in a transaction; name-on-publish; OKF-validate)
  - [ ] `POST /api/bundle/versions/[id]/restore-as-draft` (forward only)
  - [ ] `POST /api/bundle/versions/[id]/deprecate` · `/archive` (flag-only)
  - [ ] `GET /api/bundle/[id]` (states + drafted trail + published versions + per-version diff)
  - [ ] `GET /api/bundle/versions/[id]` (concepts + lineage)
  - [ ] Shareable app route `/i/[intId]/v[n]` (and `/i/[intId]` → latest) — RBAC-gated read-only
  - [ ] Autogen `log.md` inside published bundles (OKF-conformant)

- [ ] **Group 2: Refinement engine (parallel w/ G1)**
  - [ ] `runRefine(parent, refineRequest, conceptPath?)` (full + targeted)
  - [ ] Per-concept content-hash diff → "what changed" (added/changed/unchanged/removed)
  - [ ] `label` = refine-request text (truncated; user-editable on publish)
  - [ ] Agent perceive: detect post-build state → add `refine` move to DECIDE; narrate per-concept diff
  - [ ] Actual-cost capture per refine run (ADR-0002 reuse)
  - [ ] Unit (Fake): delta composition, hash-diff, label; live: one refine run on the real model

- [ ] **Group 3: Studio UI (sequential; after G1+G2)**
  - [ ] Drafts & Versions drawer (draft trail + published rows + status chips + latest badge)
  - [ ] Per-version open: concept file viewer + per-concept diff vs parent (markdown diff)
  - [ ] Restore-as-draft, Publish (with naming), Deprecate, Archive, Copy-link actions
  - [ ] Per-file "↻ regenerate this concept" affordance in the Artifacts card
  - [ ] Download bundle (.zip) + per-file (existing)

- [ ] **Group 4: Discovery (sequential; after G3)**
  - [ ] Sidebar intent rows: "published vN" badge + version count where `latestPublishedVersionId != null`

- [ ] **Group 5: Verification (sequential; last)**
  - [ ] Full transition suite (v1 → v2 → restore v1 → v3; deprecate/archive non-mutating)
  - [ ] Immutability invariant (no in-place publish updates; hash-tamper fails)
  - [ ] Event-sourced replay stability for bundle events
  - [ ] OKF-conformance rejection test
  - [ ] Live round-trip on DeepSeek; `log.md` conformant; all 82+ green; `tsc` 0