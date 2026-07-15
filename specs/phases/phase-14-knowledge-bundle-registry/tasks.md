# Phase 14 Tasks — Knowledge Bundle Registry & Cyclic Refinement

- [x] **Group 0: Contracts, schema, validator (sequential; blocks all)**
  - [x] Sketch `KnowledgeBundle` / `BundleVersion` / `ConceptFile` models; review parent/delta pointers
  - [x] ~~Add bundle event types to `IntentEvent`~~ — Decision: bundle lifecycle lives on `BundleVersion.state` + `publishedAt`/`supersededByVersionId`; NOT duplicated into the IntentEvent log. Keeps the intent-event and bundle-event domains clean. See history.
  - [x] Extend `okf.ts` → `okfValidator(bundle)` + `parseOkf` + `contentHash` (frontmatter + type; reserved filenames)
  - [x] Migration: lazy (on first bundle access, seed DRAFT from `record.files`) — deferred to Group 1; schema + Prisma `db push` complete
  - [x] Unit (16 new tests, 98 total) + `tsc` 0

- [x] **Group 1: Registry API + state machine + shareable route (parallel w/ G2)**
  - [x] `POST /api/bundle/[id]/refine` (full re-build → new DRAFT)
  - [x] `POST /api/bundle/[id]/regenerate-concept` (targeted override)
  - [x] `POST /api/bundle/[id]/publish` (auto-supersede in a transaction; name-on-publish; OKF-validate)
  - [x] `POST /api/bundle/versions/[id]/restore-as-draft` (forward only)
  - [x] `POST /api/bundle/versions/[id]/deprecate` · `/archive` (flag-only)
  - [x] `GET /api/bundle/[id]` (states + drafted trail + published versions + per-version diff)
  - [x] `GET /api/bundle/versions/[id]` (concepts + lineage)
  - [x] Shareable app route `/i/[intId]/v[n]` (and `/i/[intId]` → latest) — RBAC-gated read-only
  - [x] Autogen `log.md` inside published bundles (OKF-conformant)

- [x] **Group 2: Refinement engine (parallel w/ G1)**
  - [x] `runRefine(parent, refineRequest, conceptPath?)` (full + targeted)
  - [x] Per-concept content-hash diff → "what changed" (added/changed/unchanged/removed)
  - [x] `label` = refine-request text (truncated; user-editable on publish)
  - [x] Agent perceive: detect post-build state → add `refine` move to DECIDE; narrate per-concept diff
  - [x] Actual-cost capture per refine run (ADR-0002 reuse)
  - [x] Unit (Fake): delta composition, hash-diff, label; live: one refine run on the real model

- [x] **Group 3: Studio UI (sequential; after G1+G2)**
  - [x] Drafts & Versions drawer (draft trail + published rows + status chips + latest badge)
  - [x] Per-version open: concept file viewer + per-concept diff vs parent (markdown diff)
  - [x] Restore-as-draft, Publish (with naming), Deprecate, Archive, Copy-link actions
  - [x] Per-file "↻ regenerate this concept" affordance in the Artifacts card
  - [x] Download bundle (.zip) — per-file download (existing, retained) + per-file (existing)

- [x] **Group 4: Discovery (sequential; after G3)**
  - [x] Sidebar intent rows: "published vN" badge + version count where `latestPublishedVersionId != null`

- [ ] **Group 5: Verification (sequential; last)**
  - [ ] Full transition suite (v1 → v2 → restore v1 → v3; deprecate/archive non-mutating)
  - [ ] Immutability invariant (no in-place publish updates; hash-tamper fails)
  - [ ] Event-sourced replay stability for bundle events
  - [ ] OKF-conformance rejection test
  - [ ] Live round-trip on DeepSeek; `log.md` conformant; all 82+ green; `tsc` 0