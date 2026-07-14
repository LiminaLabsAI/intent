# Phase 13 Plan — Studio Experience Redesign

> Execution order: **Group 0 → (Group 1 + Group 2) → Group 3 → Group 4**
> Verify: `cd intent/nextjs_space && npm test`. Refs: ADR-0002 amendment (2026-07-15).

Revises Phase 12 on `feat/intent-agent`. Reuses its pieces (persona gate, cost engine, build run) and changes posture + output + layout.

---

## Group 0 — ADR amendment + contracts *(Sequential. Blocks everything.)*
External deps: web lookup for real DeepInfra prices. Commit: `feat(studio): redesign contracts + real model values (Phase 13 G0)`.

- ADR-0002 amendment written (done at brainstorm).
- **Schema relabel** (`lib/agent/schema.ts`): plain-language `label`s — entities → "What's involved", acceptance_criteria → "How we'll know it's done", etc. Keys unchanged (spine/templates/emergent intact).
- **Personas → Quick/Balanced/Deep-dive** (`cost-config.ts` ids `quick`/`balanced`/`deep` + labels; `personaToRigor` quick→low, balanced→medium, deep→high; `recommendPersona`; seed; update tests).
- **Real `CostModel` values** — pull current DeepInfra / DeepSeek V4 Flash price-in/out per 1M + context window + max output; update `DEFAULT_MODELS` + DB seed.
- **Record fields:** `outcome` (what the user wants: plan/diagram/script/doc) + `format`; `plan_built` event carrying the file list; a `PlanFile { name; content; format }` type.

## Group 1 — Agent behaviour: ask-to-enrich *(Parallel with Group 2.)*
External deps: DeepSeek (live check). Commit: `feat(agent): ask-to-enrich + outcome question (Phase 13 G1)`.

- Reframe the `verify` move → **grounded gap-filling questions**: DECIDE/narrate ask what's needed to enrich the intent, not "I assumed X, confirm". Assumption only when the user declines to specify.
- **Plain-language narration**: never surface internal keys; use the plain labels; explain what it's doing/planning.
- **Early outcome/format question**: after the mode pick, the agent asks once what deliverable the user wants (full plan / diagram / script / doc) → sets `record.outcome`/`format`; drives the build's file shape.
- Remove the "assume-then-confirm" default from perceive/narrate.

## Group 2 — Build → OKF plan files *(Parallel with Group 1.)*
External deps: DeepSeek. Commit: `feat(agent): build writes OKF plan files by outcome (Phase 13 G2)`.

- `lib/agent/okf.ts` (new): render a `PlanFile` as **full-spec OKF markdown** (front-matter: id, version, type, created; structured body).
- `runBuild` (build.ts): from `record.outcome`, compose **1+ files named by outcome** (`diagram.md`, `plan.md`, `script.md`, …) via a usage-capturing pass; each rendered as OKF; emit `plan_built` with the file list + keep actual-cost capture; build the graph data.
- Persist files (Intent header `artifacts`/new column) + serve; turn route `{build:true}` returns the files.

## Group 3 — Studio UI *(Sequential. After Groups 1 + 2.)*
External deps: dev server. Commit: `feat(studio): top strip + Understanding/Artifacts split + always-on build (Phase 13 G3)`.

- **Top strip**: status pill · **mode badge** (persists, from `selectedPersona`) · cost (est → actual). Lift out of the record panel.
- **Right column split**: `Understanding` (live fields, plain labels, `assumed` tag) + `Artifacts` (files list: view in the drawer + download; OKF). Remove the separate PRD/Plan buttons.
- **Build button** in the conversation, **always enabled**, colour follows status (amber→green).
- Understanding fills **live** (un-gate the panel from `built`); mode indicator persists on reload.

## Group 4 — Verification *(Sequential. Last.)*
External deps: dev server + DeepSeek. Commit: `test(studio-redesign): verified (Phase 13 G4)`.

- Unit: persona rename + rigor; OKF render; plan_built file list; outcome-drives-files.
- Live: mode pick → **ask-to-enrich** questions (no premature "got it") → outcome asked → live Understanding → Build (always-on) → **OKF files named by outcome** + graph + actual cost; mode badge visible throughout.
- Full suite green.
