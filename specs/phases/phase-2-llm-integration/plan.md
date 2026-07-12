# Sequential: Group 0 → Group 1 → (Groups 2 + 3 in parallel)

## Reference Specs
- `specs/architecture/data-model.md` (Node/Edge schemas)

## Implementation Plan

### Group 0: Architecture & Tooling
**Sequential.**
- Install dependencies: `npm install ai @ai-sdk/openai react-force-graph-2d`.
- Add `lib/llm/prompts.ts` to store the 3-stage flow and extraction prompts.
- Commit message: `feat(ai): setup ai sdk and graph dependencies`

### Group 1: The Refinement Engine (Backend)
**Sequential.**
- Update `app/api/refine/route.ts` to use `streamText` from the AI SDK for standard chat, and `generateObject` for the final stage extraction.
- Store the extracted `Topic` and `ContextNode` elements in the Prisma database.
- Commit message: `feat(api): implement actual LLM integration and extraction`

### Group 2: Knowledge Graph UI (Frontend)
**Parallel with Group 3.**
- Create `app/api/graph/route.ts` to fetch all graph data (nodes and links) from Prisma.
- Update `KnowledgeGraph.tsx` to use `ForceGraph2D` with the fetched data.
- Commit message: `feat(ui): implement dynamic force-directed knowledge graph`

### Group 3: Downstream Webhooks & Export (Frontend/Backend)
**Parallel with Group 2.**
- Update `ExportOptions.tsx` to handle the export logic via `fetch`.
- Create `app/api/export/route.ts` to handle webhook dispatches.
- Commit message: `feat(integration): implement downstream webhook export`
