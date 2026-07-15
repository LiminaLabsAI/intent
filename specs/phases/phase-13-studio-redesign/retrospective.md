---
type: Retrospective
phase: phase-13-studio-redesign
released: v0.3.0
date: 2026-07-15
---

# Phase 13 Retrospective — Studio Experience Redesign

## What was delivered

Turned the Studio from a black box into a guide, and made Build produce a real deliverable:

- **Ask-to-enrich clarify** — the agent proactively asks grounded questions to enrich intent + context; assumption is the last resort (the `verify` move became a gap-filling question). Plain-language schema labels (no jargon: "Key items", "Outcome", …).
- **Live Understanding** — schema fields fill during the conversation (reverses Phase 12's empty-until-build).
- **Always-on, status-coloured Build** in the conversation → writes **1+ OKF markdown files named by the outcome** (plan.md / diagram.md / …), viewable + downloadable, plus the context graph. "Rebuild" after a build. PRD/Plan buttons removed.
- **Early outcome/format question** (plan / diagram / script / doc) so the files match; generalized for any business use case.
- **Layout** — top strip (status · **mode** · est→actual cost); three distinct right-column cards (Artifacts / Understanding / Context Graph), independently scrollable.
- **Personas** renamed Quick / Balanced / Deep-dive; **real DeepInfra / DeepSeek-V4-Flash** cost values seeded.
- **Config-as-data cost engine** (ADR-0001) + two-phase build flow (ADR-0002) ratified.

## What went well

- **Diagnosing to root cause instead of symptom.** The production "build didn't finish" and "incomplete plan" both traced to real, distinct causes (serverless timeout; a parser regression) — found by calling the real model directly and inspecting `finish_reason` + token counts, not guessing.
- **Config-as-data cost engine** paid off: swapping in real DeepInfra prices was a data change, not a code change.
- **Friendly-error discipline** — raw technical errors never reach the UI; they go to the console with a user-facing message.

## What didn't go well

- **A speculative "fix" caused a worse bug.** The BUG-007 fix added a fence-stripping regex to `extractJson` that then truncated any plan whose body contained ``` code fences (BUG-009) — shipped to production before it was caught. Lesson: don't add speculative input-cleaning; the original first-`{`/last-`}` slice was already correct. Test against **realistic** payloads (a plan body has code fences) before shipping a parser change.
- **Local ≠ production twice.** The 900-token cap and then the serverless timeout only bit on prod. Verifying against the real model + real runtime earlier would have caught both.
- **`loadEnv()` doesn't load `.env.local`**, so standalone smoke scripts silently fell back to the default model — a "live verified" that wasn't hitting DeepSeek. Worth hardening.

## Lessons / follow-ups

- **ENH-003** — the build prompt is persona-agnostic; Deep-Dive should produce a deeper deliverable than Quick. Thread rigor into the build prompt (next phase).
- **BUG-006** (P3) — stale JWT shows a blank identity; harden the user cards to fall back name → email and re-sync from the DB.
- Merge to `main` happened as deployment checkpoints during the phase (user-directed), so this completion formalizes tracking + tag rather than a fresh merge.

## Verification Evidence

Captured fresh at completion (2026-07-15), per Rule 12. `build_command` is `none` in `specs/config.md`.

### `npm test` — exit code 0

```
✔ first turn gates on persona; after selecting, refinement proceeds (9.304959ms)
✔ governance-stop path: blocked intent → governance_stop, no barrage (0.208792ms)
✔ ready intent: after picking a mode, it offers to build (ADR-0002) (0.513958ms)
✔ the record is event-sourced — replay after a turn is stable (0.678375ms)
ℹ tests 82
ℹ suites 0
ℹ pass 82
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 242.092125
```

### `npx tsc --noEmit` — exit code 0

```
(no output — 0 type errors)
```
