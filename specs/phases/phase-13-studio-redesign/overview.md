---
type: Phase
status: planned
tags: [studio, ask-to-enrich, okf, plan-files, personas, live-fields, ux]
---

# Phase 13 — Studio Experience Redesign: Ask-to-Enrich + Plan Build

> **Branch:** `feat/intent-agent` · **Verify:** `cd intent/nextjs_space && npm test` · **Build:** none
> **Governing decision:** [ADR-0002 amendment (2026-07-15)](../../decisions/0002-working-memory-build-flow-and-cost.md#amendment--2026-07-15-studio-experience-redesign-phase-13-from-live-testing) · revises [Phase 12](../phase-12-working-memory-build/overview.md)

## Goal

Turn the Studio into a **guide, not a black box**. The agent proactively **asks grounded questions to enrich** the intent + context (assumption is the last resort); the **Understanding** (schema fields, in plain language) updates **live**; **status · mode · cost** live in a top strip; an **always-on, status-coloured Build** in the conversation writes the deliverable as one-or-more **OKF markdown files** (named by the outcome, viewable + downloadable) plus the graph; the agent **asks early what outcome/format** the user wants. Generalized for any business use case, not code.

## Key decisions (→ ADR-0002 amendment)

| Decision | Choice |
|---|---|
| Clarify posture | **Ask-to-enrich** — proactive grounded questions; assumption is last resort (the `verify` move becomes a gap-filling question) |
| Language | **Plain** — relabel the (unchanged) layered schema: entities → "what's involved", acceptance_criteria → "how we'll know it's done" |
| Understanding fields | **Live** during the conversation *(reverses Phase 12 "empty until build")* |
| Build gating | **Always on**, status-coloured amber→green *(reverses "gated at 🟢")* |
| Build output | **1+ OKF `.md` files** (full spec compliance, versioned), **named by outcome**, view + download; builds the graph; **removes PRD/Plan buttons** *(reverses "materialize fields")* |
| Outcome/format | Agent **asks early** (full plan / diagram / script / doc) → files match |
| Layout | **Top strip:** status · mode · cost (est→actual). **Right column:** Understanding · Artifacts (files). Selected **mode persists visibly** all session |
| Personas | Renamed **Quick / Balanced / Deep-dive** |
| Model values | Seed `CostModel` with **real DeepInfra / DeepSeek V4 Flash** prices + context window |

## Scope

### In (V1)
Everything in the decisions table.

### Out (→ roadmap / backlog)
- **V2 execution engine** (roadmap row 20) — attach system, senior's full engine.
- **Actual-cost reconciliation** edge cases → file as a bug if measured usage doesn't tie out (fix post-phase).
- **Deep multi-file orchestration** beyond "agent decides N files + names them by outcome".
- **Governance-engine** work (separate arc).

## Deliverables (verify: `npm test`)

| Deliverable | Verification |
|---|---|
| ADR-0002 amendment; plain-language schema labels; personas → Quick/Balanced/Deep-dive; real `CostModel` values; `outcome`/`format` on the record; plan-file artifact type + `plan_built` event | unit + read |
| Ask-to-enrich agent behaviour (grounded questions, no premature "got everything"); early outcome/format question | live behaviour check |
| `runBuild` writes 1+ OKF-markdown files (named by outcome) + graph; files persisted + served; actual cost | unit (Fake) + live |
| UI: top status·mode·cost strip; Understanding (live) + Artifacts (files: view + download) split; in-conversation always-on status-coloured Build; PRD/Plan buttons removed; mode persists | tsc + browser (user) |

## Acceptance criteria
1. After the mode pick, the agent **asks grounded questions to enrich** (no premature "I've got everything"); labels are plain.
2. **Understanding** fields fill **live**; the top strip shows **status · mode · cost (est → actual)**; mode stays visible all session (and on reload).
3. The agent **asks the desired outcome/format** early.
4. **Build** (always on, status-coloured, in the conversation) → writes **1+ OKF `.md` files named by outcome** + graph; files **open + download**; actual cost shown.
5. Personas read **Quick / Balanced / Deep-dive**; catalog holds **real** DeepInfra values.
6. Full suite green.

## Non-goals
No V2 attached-system execution, no governance-engine work, no per-user precedent memory.
