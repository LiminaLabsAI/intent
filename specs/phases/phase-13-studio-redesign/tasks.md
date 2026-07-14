# Phase 13 Tasks — Studio Experience Redesign

> `[ ]` todo · `[/]` in-progress · `[x]` done. Verify: `cd intent/nextjs_space && npm test`.
> Order: Group 0 → (Group 1 + Group 2) → Group 3 → Group 4.

## Group 0 — ADR amendment + contracts
- [x] ADR-0002 amendment (done at brainstorm)
- [x] Plain-language schema labels (entities → "What's involved", acceptance → "How we'll know it's done", blast_radius, migration_path); keys unchanged
- [x] Personas → Quick / Balanced / Deep-dive (ids quick/balanced/deep + `label`; personaToRigor; recommendPersona; DB reconciled + seed; tests updated)
- [x] Real DeepInfra values in `CostModel` — $0.10 in / $0.20 out per 1M · 1M ctx · 0.8 cache (verified 2026-07-15)
- [x] Record `outcome` + `files`; `outcome_set` + `plan_built` events; `PlanFile` type
- [x] Commit `feat(studio): redesign contracts + real model values` — 71/71, tsc 0

## Group 1 — Ask-to-enrich
- [x] `verify` narration reframed → grounded question ("To get this right, is it X or Y?"); never "I assumed"
- [x] Early outcome question: `ask_outcome` move + gate (persona set, outcome null → ask); perceive detects outcome → `outcome_set`
- [x] Commit `feat(agent): ask-to-enrich + outcome question` — 72/72

## Group 2 — Build → OKF plan files
- [x] `lib/agent/okf.ts` — `renderOkf` (front-matter: okf_version/id/type/title/version/created/generator + body)
- [x] `runBuild` composes 1+ files named by outcome (LLM `{files:[…]}`), renders OKF, emits `plan_built` + actual cost
- [x] Files persist via the event log (`record.files`); turn route returns them + names them in the reply
- [x] Commit `feat(agent): build writes OKF plan files by outcome` — 73/73

## Group 3 — Studio UI
- [x] Understanding un-gated (live slots, plain labels); panel renamed "Artifacts" + **mode badge** in header (persists via selectedPersona)
- [x] Build button in the conversation, always on, colour follows status (amber-when-thin → green-when-ready)
- [x] Outcome picker chips (Plan/Diagram/Script/Doc); persona picker uses labels (Quick/Balanced/Deep-dive)
- [x] Files section (OKF `.md`, click to view in a drawer + download); PRD/Plan buttons removed
- [~] Cost strip stayed in-panel (mode badge lifted to header); full top-strip relocation of status+cost deferred → follow-up
- [x] Commit `feat(studio): Understanding/Artifacts split + always-on build + files`

## Group 4 — Verification
- [x] Unit: persona rename · OKF render · plan_built files (1 + multi) · outcome gate · ask-to-enrich (73/73)
- [x] Live backend (DeepSeek, G0–G2): intent → Quick/Balanced/Deep-dive → outcome detected ("just a plan"→plan) → Build → **plan.md (OKF front-matter)** + actual cost **$0.00017** (real DeepInfra pricing)
- [x] `/refine` server-compiles clean (no build error); tsc 0
- [~] Browser click-through of the new UI (live Understanding, always-on Build, Files view/download, mode badge) — auth-gated → user confirms; `ask_outcome` gate live re-verify (was stale-compiled) → filed as follow-up
- [x] Commit `test(studio-redesign): verified`
