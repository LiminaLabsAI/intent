---
type: Phase
status: not-started
tags: [llm, ai-sdk, force-graph, webhooks]
deps: [phase-1-refinement]
---

# Phase 2: LLM Integration & Downstream Workflows

## Goal
Replace the UI placeholders with real LLM integrations using the Vercel AI SDK. Extract Knowledge Graph nodes via structured LLM generation, render them using `react-force-graph-2d`, and wire the final refined intent to a downstream webhook export.

## Key Decisions
| Decision | Rationale |
|----------|-----------|
| AI SDK | The Vercel `ai` SDK provides seamless React hooks for streaming LLM responses and structured object generation, making it the standard choice for Next.js 14 AI apps. |
| react-force-graph-2d | Lightweight, canvas-based, and highly performant for 2D node-edge rendering compared to SVG-based libraries like D3 for simple dashboards. |

## Scope
### In Scope
- Wiring `/api/refine` to real OpenAI API calls (or mock adapter).
- Structured LLM object extraction for Topics, Intents, and Contexts.
- Implementing the Force Graph dashboard.
- Implementing a generic `/api/export` webhook dispatcher.

### Out of Scope
- Full enterprise authentication against external identity providers.
- Advanced clustering or deep multi-level graph traversal.

## Deliverables
- AI-powered chat endpoint with structured generation capability.
- Live Force-Directed Graph UI.
- Webhook export button firing to a mock endpoint.

## Acceptance Criteria
- [ ] Users can receive contextual responses from the LLM based on their intent.
- [ ] The system automatically extracts Topics/Contexts when intent refinement completes.
- [ ] The Knowledge Graph visually renders nodes and edges correctly.
- [ ] Exporting via webhook succeeds with a 200 OK.
