### [SCOPE_CHANGE] 2026-07-12 — Pivot Phase 1 to Intent Refinement Engine & Knowledge Graph
Topics: refinement, UI, guardrails, pgvector, knowledge-graph, sse, pii-scrubbing
Affects-phases: phase-1-refinement
Detail: Redefined Phase 1 to build a frontend-focused Intent Refinement Engine. Decisions include: using a WhatsApp/ChatGPT-style UI with real-time SSE streaming and a 3-stage discussion flow; enforcing enterprise context guardrails with an escalation path; scrubbing PII; using `pgvector` for semantic historical matching; and adding a Knowledge Graph UI to visualize contexts, intents, and emerging organizational topics.

### [NOTE] 2026-07-12 — Added pgvector and Knowledge Graph models
Topics: schema, pgvector, knowledge-graph
Affects-phases: phase-1-refinement
Detail: Added pgvector extension and `embedding` column to Intent model. Added `Topic`, `ContextNode`, and relationship tables for Knowledge Graph visualization.

### [NOTE] 2026-07-12 — Built Refinement UI Foundation
Topics: ui, chat, knowledge-graph
Affects-phases: phase-1-refinement
Detail: Built the RefinementChat, KnowledgeGraph dashboard, ExportOptions, FlagReview, and PreviousSolutionAlert components. Wired them together in the `/refine` page route.

### [NOTE] 2026-07-12 — Implemented Refinement API Engine
Topics: ai, sse, guardrails, pgvector, knowledge-graph
Affects-phases: phase-1-refinement
Detail: Built the Next.js API route (`/api/refine/route.ts`) which acts as the core Refinement Engine. Implemented the SSE streaming response, PII regex scrubbing, the 3-stage LLM prompt chain configuration, simulated Enterprise Guardrails, and stubs for `pgvector` semantic search and Knowledge Graph node extraction.

### [NOTE] 2026-07-12 — Integrated Chat UI and Refinement Engine
Topics: integration, sse
Affects-phases: phase-1-refinement
Detail: Wired the frontend `RefinementChat` component to the backend `/api/refine` endpoint. The chat now dynamically streams Server-Sent Events (SSE) into the message bubbles and correctly handles 403 blocks from the Enterprise Guardrails.
