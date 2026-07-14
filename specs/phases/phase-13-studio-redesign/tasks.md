# Phase 13 Tasks — Studio Experience Redesign

> `[ ]` todo · `[/]` in-progress · `[x]` done. Verify: `cd intent/nextjs_space && npm test`.
> Order: Group 0 → (Group 1 + Group 2) → Group 3 → Group 4.

## Group 0 — ADR amendment + contracts
- [x] ADR-0002 amendment (done at brainstorm)
- [ ] Plain-language schema labels (entities → "What's involved", acceptance → "How we'll know it's done", …); keys unchanged
- [ ] Personas → Quick / Balanced / Deep-dive (ids + labels; personaToRigor; recommendPersona; seed; tests)
- [ ] Real DeepInfra / DeepSeek V4 Flash values in `CostModel` (prices, context window, max output)
- [ ] Record `outcome` + `format`; `plan_built` event; `PlanFile` type
- [ ] Commit `feat(studio): redesign contracts + real model values`

## Group 1 — Ask-to-enrich
- [ ] `verify` → grounded gap-filling questions; assumption only on user decline
- [ ] Plain-language narration (no internal keys; explains what it's doing/planning)
- [ ] Early outcome/format question after mode pick → sets record.outcome/format
- [ ] Commit `feat(agent): ask-to-enrich + outcome question`

## Group 2 — Build → OKF plan files
- [ ] `lib/agent/okf.ts` — render PlanFile as full-spec OKF markdown (front-matter + body)
- [ ] `runBuild` composes 1+ files named by outcome; emits `plan_built` + actual cost; builds graph
- [ ] Persist + serve files; turn route returns them
- [ ] Commit `feat(agent): build writes OKF plan files by outcome`

## Group 3 — Studio UI
- [ ] Top strip: status · mode badge (persists) · cost (est → actual)
- [ ] Right column split: Understanding (live) + Artifacts (files: view + download); remove PRD/Plan buttons
- [ ] Build button in conversation, always on, colour follows status
- [ ] Understanding un-gated (live); mode persists on reload
- [ ] Commit `feat(studio): top strip + Understanding/Artifacts split + always-on build`

## Group 4 — Verification
- [ ] Unit: persona rename · OKF render · plan_built files · outcome-drives-files
- [ ] Live: ask-to-enrich → outcome asked → live fields → always-on Build → OKF files by outcome + graph + actual cost; mode visible
- [ ] Full suite green
- [ ] Commit `test(studio-redesign): verified`
