# Phase 3: Validation & Quality Gates

## Goal
Ensure that only well-defined, actionable, and unambiguous intents can be exported to downstream execution agents. We will implement an automated Quality Gate that intercepts export requests, scores the intent against a rubric, and either formats it for export or rejects it with feedback.

## Scope
- Update RefinementChat.tsx to intercept exports and query a new evaluation endpoint.
- Create `/api/evaluate/route.ts` to score the chat transcript using an LLM.
- Add strict grading prompts in `lib/llm/prompts.ts` with a passing threshold of 80/100.
- Append rejection reasons to the chat interface so users can iteratively improve their intents.

## Acceptance Criteria
- [ ] Users can trigger an export (e.g. typing "download as md").
- [ ] Good intents (Score >= 80) successfully download formatted output.
- [ ] Poor intents (Score < 80) trigger an agent message explaining what is missing.
- [ ] No poorly-formed intents can bypass the gate to export.
