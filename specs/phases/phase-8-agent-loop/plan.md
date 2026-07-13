# Phase 8 Plan — The Agent Loop

```
# Execution: Group 0 → (Group 1 + Group 2 parallel) → Group 3 → Group 4
```

All work on `feat/intent-agent`, in `intent/nextjs_space/lib/agent/`. Verify: `cd intent/nextjs_space && npm test` (+ real-model smoke).

## Group 0 — LLM boundary, adapter, env, contracts
**Sequential. Blocks all.**
- `LLM` interface: `generateStructured<T>(prompt, schema)` + `generateText(prompt)`.
- `HfLLM` adapter — HF router (OpenAI-compatible) via `@ai-sdk/openai` + `HF_TOKEN`; model from `AGENT_MODEL` (cheap default). Load repo-root `.env`.
- `FakeLLM` — deterministic scripted impl for unit tests.
- Contracts: `Perception` (slot deltas + assessments + classification), `Move` (kind + target + rationale), `TurnResult`.
- Commit: `feat(agent): LLM boundary + HF adapter + turn contracts`

## Group 1 — Perceive (LLM edge)
**Parallel with Group 2.** Deps: Group 0.
- `perceive(record, message, llm)`: extract slot values from the message + judge strength against rubrics (the LLM `StrengthJudge`, replacing Phase 7's rule-based one); classify intent-type on turn 1.
- Emits events (slot_valued, slot_assessed, classified) — deterministic given the LLM output.
- Unit tests with `FakeLLM`: extraction → events; judged states applied.
- Commit: `feat(agent): perceive — fold + LLM strength judge`

## Group 2 — DECIDE (deterministic policy)
**Parallel with Group 1.** Deps: Phase 7 core.
- `decide(record, risk): Move[]` — priority order (§3.5): governance-stop (stub) → conflict → split → highest-risk gap (rank by requiredness + risk, prefer infer-then-ask) → close. 1–2 moves max.
- Pure, no LLM. Gap ranking is deterministic; the *number/phrasing* is the agent's (Narrate).
- Unit tests: each priority branch, ordering, close-only-when-ready, ≤2 moves.
- Commit: `feat(agent): DECIDE policy — deterministic move selection`

## Group 3 — Narrate + orchestrator
**Sequential.** Deps: Groups 1 + 2.
- `narrate(record, moves, llm)`: voice the chosen move(s) humanely, speaking from the record (not inventing structure).
- `runTurn(store, id, message, llm, risk)`: load → perceive (append events) → decide → narrate → append narration → return `TurnResult` (record view + moves + reply).
- Unit tests with `FakeLLM`: full turn is deterministic; readiness advances.
- Commit: `feat(agent): narrate + turn orchestrator`

## Group 4 — Verification
**Sequential. Last.**
- Full `node --test` suite green (Phase 7 + Phase 8).
- Real-model integration smoke `scripts/agent-turn-smoke.ts`: a real HF turn on a vague CHANGE intent; asserts classification + a single highest-risk question (skips gracefully if `HF_TOKEN` absent).
- Commit: `test(agent): loop unit suite + real-model smoke`
