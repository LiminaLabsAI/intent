# Phase 12 Plan — Working-Memory Build Flow & Cost Engine

> Execution order: **Group 0 → (Group 1 + Group 2) → Group 3 → Group 4**
> Verify: `cd intent/nextjs_space && npm test`. Refs: ADR-0001, ADR-0002.

Much of the foundation is already on `feat/intent-agent` (cost engine, persona picker). This phase adds the **build run** around it. A parked head-start on Group 0/1 exists in the ADR-0002 write-up and this plan — rebuild from here.

---

## Group 0 — Contracts *(Sequential. Blocks everything.)*
External deps: none. Commit: `feat(agent): build-flow contracts (Phase 12 G0)`.

- `lib/agent/types.ts`: add `record.built: boolean` + `record.actualCost: number | null`; add event `{ kind: 'built'; actualCost: number; currency: string }`.
- `lib/agent/events.ts`: `emptyRecord` → `built: false, actualCost: null`; `apply` `case 'built'` → set both.
- `lib/agent/decide.ts`: add `offer_build` to `MoveKind`. At `readiness === 'ready'`: if `!record.built` → `offer_build`; else `close`.
- `lib/agent/llm.ts`: add `interface Usage { inputTokens; outputTokens }` and `generateStructuredWithUsage<T>(system, user) → { data: T; usage: Usage }` on the `LLM` interface; implement in `HfLLM` (parse `usage.prompt_tokens`/`completion_tokens`) and `FakeLLM` (fixed usage).

## Group 1 — Backend build run + actual cost *(Parallel with Group 2.)*
External deps: DeepSeek via HF router (live check only). Commit: `feat(agent): build run + actual-cost capture (Phase 12 G1)`.

- `lib/agent/build.ts` (new) — `runBuild(store, id, llm, catalog)`:
  1. load record; guard it's at readiness=ready and not already built.
  2. **one** `generateStructuredWithUsage` pass over (intent + full conversation + current slots) that composes/confirms the final working memory (structured slots).
  3. fold the finalized slot values (`slot_valued`/`slot_assessed`), then emit `built` with `actualCost = usage.inputTokens×priceIn + usage.outputTokens×priceOut` (the selected persona's model from the catalog).
- `lib/agent/turn.ts`: export `runBuild` path (or a thin wrapper) reusing store/llm.
- `app/api/agent/turn/route.ts`: accept `{ build: true }` → run the build → persist transcript line ("Built the working memory.") + return the view.
- `lib/agent/materialize.ts`: `RecordView` already returns `cost`; ensure `record.built`/`actualCost` flow through (they're on the record) and add nothing new unless a derived field helps the UI.

## Group 2 — Clarify: verify assumptions *(Parallel with Group 1.)*
External deps: none. Commit: `feat(agent): verify assumptions in clarify (Phase 12 G2)`.

- `lib/agent/narrate.ts`: when gaps include slots that are **strong but `inferred`**, narrate them as confirm/edit prompts ("I'm assuming *scope* = X — confirm or correct"), distinct from asking empty gaps. Keep it in the same single batch message.
- `lib/agent/decide.ts` (light): ensure inferred-strong slots surface as a verify signal to Narrate (either a `verify` move or a flag on the batch) without blocking readiness.

## Group 3 — Studio UI *(Sequential. After Groups 1 + 2.)*
External deps: dev server. Commit: `feat(studio): build gate + actual-vs-estimate (Phase 12 G3)`.

- `components/refinement/RefinementChat.tsx`:
  - **Hide the working-memory panel until `view.record.built`** — during clarify show the readiness status prominently + the conversation (+ optionally a compact "what I still need / assumptions to confirm").
  - Render the **"Build working memory"** button when the last turn's moves include `offer_build` (and not built).
  - On click → POST `{ id, build: true }` → on response, **reveal** the working-memory panel + graph and show **actual cost next to the estimate**.
  - Keep the persona picker (Phase-11 follow-up) unchanged.

## Group 4 — Verification *(Sequential. Last.)*
External deps: dev server + DeepSeek. Commit: `test(build-flow): verified (Phase 12 G4)`.

- Unit: `decide` offer_build gate (ready+!built → offer_build; ready+built → close); `built` event replay; `runBuild` actual-cost math with FakeLLM usage.
- Live (DeepSeek): intent → pick → clarify (panel empty, readiness 🔴→🟢, assumptions verified) → 🟢 → Build → working memory + graph materialized + actual vs estimate.
- Full suite green.
