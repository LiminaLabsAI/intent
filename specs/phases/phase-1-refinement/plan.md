# Sequential: Group 0 → Group 1 → Group 2 → Group 3

## Group 0: Schema & Vector DB
**Sequential.**
- Dependencies: Database setup.
- Commit: `feat(db): add pgvector schema and knowledge graph models`
- Update PostgreSQL/Prisma schema to enable the `pgvector` extension.
- Add vector embedding columns to the Intent models.
- Define schema tables/relations for Knowledge Graph nodes (Context, Topic, Intent).

## Group 1: UI / UX Foundation
**Sequential.**
- Dependencies: Frontend tooling (Next.js, Radix/Tailwind).
- Commit: `feat(ui): build chat interface and knowledge graph view`
- Build the main Chat interface in Next.js, including SSE streaming client logic.
- Integrate a graph visualization library to render the Knowledge Graph dashboard.

## Group 2: The Refinement Engine & AI
**Sequential.**
- Dependencies: LLM API, `pgvector` operations.
- Commit: `feat(ai): implement refinement logic, guardrails, and pgvector search`
- Implement the embedding generation pipeline and the `pgvector` similarity search.
- Build the PII scrubbing pipeline.
- Implement the 3-stage flow state machine and Enterprise Guardrail prompt (with escalation flag).
- Add an "Extraction" prompt step that runs at the end to pull out Nodes and Edges for the Knowledge Graph.

## Group 3: Integration & Testing
**Sequential.**
- Dependencies: All previous groups.
- Commit: `test(integration): wire UI to AI engine and add tests`
- Wire the Chat UI to the Refinement Engine API and SSE endpoints.
- Connect the Knowledge Graph UI to the real-time node database.
- Write integration tests for guardrails, scrubbing, and flow transitions.
