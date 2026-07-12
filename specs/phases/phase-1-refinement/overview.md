---
type: Phase
status: in-progress
tags: [pgvector, knowledge-graph, sse, refinement]
---

# Phase 1: Intent Refinement Engine

## Goal
Build the Intent Refinement Engine. This includes a chat-based UI (3-stage discussion), enterprise guardrails, semantic intent matching using `pgvector`, a Knowledge Graph visualization of organizational intents, and dynamic export mechanisms.

## Key Decisions
| Decision | Rationale |
|----------|-----------|
| **pgvector for Search** | Using Postgres vector embeddings allows the LLM to find semantically similar past intents, even if the wording is completely different. |
| **Knowledge Graph UI** | Visualizing intents by context and emerging topics helps enterprises spot redundancies and trends. |
| **Simple Chat UI** | Must feel as intuitive as WhatsApp/ChatGPT, utilizing SSE (Server-Sent Events) for real-time streaming to maintain responsiveness. |
| **3-Stage Flow** | Forces structured thinking (High Level → Details → Deep Discussion). |
| **Enterprise Guardrails** | Strictly reject intents outside the enterprise context, with a "Break Glass" override for human review. |
| **PII Scrubbing** | Redact sensitive data via regex/LLM before saving to the vector database or knowledge graph. |

## Scope
- **In:** Chat UI component (with SSE streaming), 3-stage LLM prompt chain, enterprise guardrail system with escalation path, historical intent database matching (`pgvector`), Knowledge Graph UI, dynamic export selector, and PII scrubbing.
- **Out:** Actual execution of the intent by downstream agents, multi-tenant data isolation.

## Deliverables
- Fully functional chat UI for intent refinement.
- Configured PostgreSQL with `pgvector` for intent storage and retrieval.
- Interactive Knowledge Graph visualization component.

## Acceptance Criteria
- User can interact with the agent in a 3-stage flow to refine an intent.
- Responses from the LLM stream in real-time.
- Intents clearly out of bounds are blocked by the guardrail.
- Blocked intents can be flagged for human review.
- PII is scrubbed before saving to the database.
- Past intents are semantically matched and presented to the user.
- The Knowledge Graph correctly displays saved intents by topic/context.
