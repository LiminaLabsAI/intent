# Phase 6: The Studio Experience & Artifact Expansion

## Goal
Evolve the Flow Refinement page from a simple chat interface into a premium, split-screen "Studio" where the user can watch their structured intent document build itself in real-time, visualize its context via a Knowledge Graph, and expand the intent into full Execution Artifacts (PRDs, Implementation Plans).

## Key Deliverables
1. **Split-Screen Studio UI:** Chat on the left; Live Document and Graph on the right.
2. **Context Graph Widget:** A visual node map showing the topics/contexts associated with the active intent.
3. **Artifact Expansion Engine:** Buttons unlocking at 80+ score to "Generate PRD" and "Generate Implementation Plan", powered by a new `/api/expand` endpoint.

## Acceptance Criteria
- User can chat to refine intent on the left panel.
- Right panel updates in real-time or via manual refresh with the structured intent.
- Hitting 80+ score unlocks PRD and Plan generation.
- Expanded artifacts are generated via LLM and displayed in the UI.

## Out of Scope
- Multi-user real-time collaboration (e.g. Google Docs style editing).
- Execution of the generated Implementation Plans (we just generate the plan).
