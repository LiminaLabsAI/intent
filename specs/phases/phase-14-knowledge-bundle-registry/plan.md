# Execution Order
# Mixed:  Group 0 → (Groups 1 + 2 in parallel) → Group 3 → Group 4 → Group 5

## Group 0 — Contracts, schema, validator (sequential; blocks all)

**External deps:** Prisma + Neon (existing).
**Commit:** `feat(registry): bundle/version/concept schema + OKF validator + migration`

- New Prisma models:
  - `KnowledgeBundle` — 1:1 with `Intent`; holds `draftHeadVersionId` and `latestPublishedVersionId` pointers.
  - `BundleVersion` — immutable row: `bundleId`, `versionNo Int?` (null for drafts), `state` enum (DRAFT / PUBLISHED / SUPERSEDED / DEPRECATED / ARCHIVED), `parentVersionId`, `label`, `understandingSnapshot Json`, `costActual Json`, `personaLabel`, `outcome`, `createdById`, `builtAt`, `publishedAt?`, `supersededByVersionId?`.
  - `ConceptFile` — `versionId`, `path`, `contentHash` (sha256 over frontmatter+body), `frontmatter Json`, `body Text`, `okfType` (from frontmatter `type`).
- New `IntentEvent` types: `draft_created`, `version_published`, `version_superseded`, `version_deprecated`, `version_archived`, `restored_as_draft`.
- Extend `okf.ts` → `okfValidator(bundle)`: conformance check (every concept has parseable frontmatter + non-empty `type`; `index.md`/`log.md` per spec when present). Used as a Publish gate (reject non-conformant).
- Migration: existing `Intent.files` rows → seed a `BundleVersion` DRAFT per intent (preserve work). Thereafter the live file panel reads `draftHead.ConceptFiles` only — drop `Intent.files` reads to avoid the dual-store-drift trap (`product-design.md` §7).
- **Verify:** unit + `tsc`.

## Group 1 — Registry API (server; parallel with G2)

**Commit:** `feat(registry): bundle API + state machine + shareable version route`

- `POST /api/bundle/[intentId]/refine` — run refine (full re-build) → new DRAFT (parent = current `draftHead`); emit `draft_created`.
- `POST /api/bundle/[intentId]/regenerate-concept` — body `{ conceptPath }`; targeted override: compose new DRAFT = parent concepts + freshly-generated concept; emit `draft_created`.
- `POST /api/bundle/[intentId]/publish` — promote `draftHead` → `PUBLISHED vN+1`; auto-supersede prior `latestPublished` in a transaction; emit `version_published` + `version_superseded`. Publish names the version; default label = last refine-request text (user-editable). Reject if `okfValidator` fails.
- `POST /api/bundle/versions/[id]/restore-as-draft` — spawn a new DRAFT seeded from the version's content; pin `draftHead`; emit `restored_as_draft`. (Forward; history untouched.)
- `POST /api/bundle/versions/[id]/deprecate` · `/archive` — flag-only state moves; emit `version_deprecated` / `version_archived`. No content mutation.
- `GET /api/bundle/[intentId]` — states + draft trail + published versions + per-version "what changed" (content-hash diff vs parent).
- `GET /api/bundle/versions/[id]` — full concepts + lineage.
- Shareable app route `/i/[intId]/v[n]` (and `/i/[intId]` → latest) — auth-gated to org members (reuse NextAuth RBAC); renders a read-only published-bundle viewer.
- Autogenerate `log.md` inside every published bundle: date-grouped, entries derived from refine-request labels + publish names — OKF-conformant (`log.md` §7).
- **Verify:** unit + `tsc`.

## Group 2 — Refinement engine (parallel with G1)

**Commit:** `feat(studio): cyclic refinement engine (full + per-concept)`

- Extend `runBuild` (Phase 13) → `runRefine(intent, refineRequest, conceptPath?)`:
  - parent = current `draftHead`;
  - default = full re-gen of all concepts (correct-by-construction);
  - targeted (`conceptPath` set) = regenerate only that concept; compose new draft = parent concepts (copied by reference/hash) + new concept.
- Compute **"what changed"** from per-concept content-hash diffs between parent and new draft: added / changed / unchanged / removed concept paths.
- Set the new draft's `label` = the refine-request message text (truncated; user-editable on publish).
- Agent perceive: detect `bundle exists && message after built` → add a **`refine` move** to the DECIDE policy (priority slot after `fold`); narrate verbalizes the chosen move + the per-concept diff summary ("Updated `diagram.md`; `plan.md` unchanged.").
- Cost: actual tokens measured per refine run (ADR-0002 cost-capture reused); recorded on the DRAFT (`understandingSnapshot` + persona).
- **Verify:** unit (Fake) — refine delta composition, hash-diff correctness, label capture; live (real model) — one continuous refine run.

## Group 3 — Studio UI (sequential; after G1+G2)

**Commit:** `feat(studio): drafts & versions drawer + per-file regenerate + diff`

- Artifacts card grows a **Drafts & Versions drawer**:
  - Draft trail rows — label · timestamp · "current" badge on `draftHead` · restore-as-draft action.
  - Published version rows — `vN` · name · status chip (PUBLISHED / SUPERSEDED / DEPRECATED / ARCHIVED) · "latest" badge · Publish (on `draftHead`, with name input) / Deprecate / Archive / restore-as-draft / "Copy link" actions.
  - Per-version open → renders concept files (reuse the file viewer) + **per-concept markdown diff vs the parent version** (additions/removals highlighted).
- Per concept-file row in the Artifacts card: small **"↻ regenerate this concept"** affordance → runs `regenerate-concept` → live drawer update.
- Download: per-file (existing) + "Download bundle (.zip)".
- Continuous-refine detection: chat keeps going post-build; Build remains a re-run of full refine; no mode switch.
- **Verify:** `tsc` + browser (user): refine → new draft labelled by your text; diff shows only touched concept; publish → immutable v1; second publish → v1 superseded; restore v1 → publish v3; copy link opens the read-only shareable view.

## Group 4 — Discovery (sequential; after G3)

**Commit:** `feat(studio): registry discovery badges in sidebar`

- Sidebar intent-history rows: surface a "published vN" badge + version count where `latestPublishedVersionId != null`. No new page, no taxonomy (that is Phase 15).
- **Verify:** `tsc` + browser.

## Group 5 — Verification (sequential; last)

**Commit:** `test(registry): full stand-up-the-stream + invariant suite`

- Transition suite: refine → publish v1 → refine → publish v2 (v1 auto-superS) → restore v1 → publish v3 (v3 superS v2); deprecate/archive non-mutating.
- Immutability invariant: no in-place update API on published rows; a content-hash tamper attempt fails.
- Event-sourced replay of bundle events is stable.
- Restore forwards: new version id, parent pinned, history untouched.
- OKF-conformance rejection test: non-conformant publish is rejected.
- Live round-trip on DeepSeek: one continuous refine → publish → refine → publish v2; `log.md` conformant.
- All 82+ tests green; `tsc` 0.