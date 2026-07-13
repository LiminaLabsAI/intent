# Phase 8 Tasks — The Agent Loop

> `[ ]` todo · `[/]` in-progress · `[x]` done. Verify: `cd intent/nextjs_space && npm test`.

## Group 0 — LLM boundary, adapter, env, contracts
- [ ] `LLM` interface (`generateStructured`, `generateText`)
- [ ] `HfLLM` adapter (HF router + `HF_TOKEN`, `AGENT_MODEL` cheap default) + repo-root `.env` loading
- [ ] `FakeLLM` deterministic test double
- [ ] Contracts: `Perception`, `Move`, `TurnResult`
- [ ] Commit `feat(agent): LLM boundary + HF adapter + turn contracts`

## Group 1 — Perceive
- [ ] `perceive(record, message, llm)` — extract slot values + classify (turn 1)
- [ ] LLM `StrengthJudge` (replaces rule-based) judging against rubrics
- [ ] Emits slot_valued / slot_assessed / classified events
- [ ] Unit tests with `FakeLLM`
- [ ] Commit `feat(agent): perceive — fold + LLM strength judge`

## Group 2 — DECIDE (deterministic)
- [ ] `decide(record, risk): Move[]` — governance-stop → conflict → split → highest-risk gap → close
- [ ] Deterministic gap ranking (requiredness + risk), ≤2 moves, prefer infer→ask
- [ ] Unit tests: each branch, ordering, close-only-when-ready
- [ ] Commit `feat(agent): DECIDE policy — deterministic move selection`

## Group 3 — Narrate + orchestrator
- [ ] `narrate(record, moves, llm)` — voice the move from the record
- [ ] `runTurn(store, id, message, llm, risk)` — perceive→decide→narrate over the store
- [ ] Unit tests with `FakeLLM`: full turn deterministic, readiness advances
- [ ] Commit `feat(agent): narrate + turn orchestrator`

## Group 4 — Verification
- [ ] Full suite green (Phase 7 + Phase 8)
- [ ] Real-model smoke `scripts/agent-turn-smoke.ts` (skips w/o `HF_TOKEN`)
- [ ] `cd intent/nextjs_space && npm test` verified green
- [ ] Commit `test(agent): loop unit suite + real-model smoke`
