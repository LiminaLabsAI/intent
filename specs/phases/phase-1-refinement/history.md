### [SCOPE_CHANGE] 2026-07-12 — Pivot Phase 1 to Intent Refinement Engine & Knowledge Graph
Topics: refinement, UI, guardrails, pgvector, knowledge-graph, sse, pii-scrubbing
Affects-phases: phase-1-refinement
Detail: Redefined Phase 1 to build a frontend-focused Intent Refinement Engine. Decisions include: using a WhatsApp/ChatGPT-style UI with real-time SSE streaming and a 3-stage discussion flow; enforcing enterprise context guardrails with an escalation path; scrubbing PII; using `pgvector` for semantic historical matching; and adding a Knowledge Graph UI to visualize contexts, intents, and emerging organizational topics.
