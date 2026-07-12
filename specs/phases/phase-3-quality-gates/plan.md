# Execution Plan: Phase 3

## Group 1: Evaluation Backend
1. Modify `lib/llm/prompts.ts` to include an evaluation rubric and prompt (`EVALUATION_PROMPT`).
2. Create `app/api/evaluate/route.ts` that receives a chat history, passes it to the LLM for evaluation using `generateObject` with a strict Zod schema (`{ score: number, reasoning: string, missingDetails: string[], formattedExport: string }`).

## Group 2: Frontend Integration
1. Update `RefinementChat.tsx` to intercept the download intent.
2. Replace local file creation with a `fetch("/api/evaluate")`.
3. Handle the response:
   - If success, download `formattedExport` using the `blob` method.
   - If fail, append a new agent message detailing `reasoning` and `missingDetails`.
