# Phase 8 Tasks — The Agent Loop

> `[ ]` todo · `[/]` in-progress · `[x]` done. Verify: `cd intent/nextjs_space && npm test`.
> Status: **complete — 46/46 tests green; live HF turn behaves like an agent** (classify → judge → deterministic move → natural narration, one move not a barrage).

## Group 0 — LLM boundary, adapter, env, contracts
- [x] `LLM` interface (`generateText`, `generateStructured`) — `lib/agent/llm.ts`
- [x] `HfLLM` adapter (HF router + `HF_TOKEN`, `AGENT_MODEL` default Qwen2.5-7B-Instruct) + `.env` walk-up loader `lib/agent/env.ts`
- [x] `FakeLLM` deterministic test double
- [x] Contracts: `PerceptionOut`, `Move`, `TurnResult`
- [x] Commit `feat(agent): LLM boundary + HF adapter + turn contracts`

## Group 1 — Perceive
- [x] `perceive(record, message, llm)` — extract slot values + classify (turn 1) — `lib/agent/perceive.ts`
- [x] LLM strength judgment against rubrics (strict: prefer weak over strong)
- [x] Emits classified / slot_valued / slot_assessed events
- [x] Unit tests with `FakeLLM`
- [x] Commit `feat(agent): perceive — fold + LLM strength judge`

## Group 2 — DECIDE (deterministic)
- [x] `decide(record, risk): Move[]` — governance-stop → conflict → close → highest-risk gap — `lib/agent/decide.ts`
- [x] Deterministic gap ranking (objective-first, spine, template), 1 move (not a barrage)
- [x] Unit tests: each branch, ordering, close-only-when-ready, pure function
- [x] Commit `feat(agent): DECIDE policy — deterministic move selection`

## Group 3 — Narrate + orchestrator
- [x] `narrate(record, moves, llm)` — plain-language voicing, no jargon leak — `lib/agent/narrate.ts`
- [x] `runTurn(store, id, message, llm, risk)` — perceive→decide→narrate — `lib/agent/turn.ts`
- [x] Unit tests with `FakeLLM`: full turn deterministic, readiness advances, event-sourced
- [x] Commit `feat(agent): narrate + turn orchestrator`

## Group 4 — Verification
- [x] Full suite green (46 tests: Phase 7 + Phase 8)
- [x] Real-model smoke `scripts/agent-turn-smoke.ts` — classifies CHANGE, infer_confirm on objective, natural reply
- [x] `cd intent/nextjs_space && npm test` verified green
- [x] Commit `test(agent): loop unit suite + real-model smoke`
