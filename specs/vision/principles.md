---
type: Vision
---

# Principles

> Guiding decisions throughout the project. When trade-offs arise, these resolve them.

## Core Principles
1. **Traceability First** — Every lifecycle transition, modification, and comment must be captured in the audit trail.
2. **Minimal and Elegant UI** — Maintain a grayscale layout with blue/indigo accents, utilizing modern typography and clean layouts.
3. **Role-Driven Security** — API endpoints and UI sections must strictly filter data and controls based on current session roles.
4. **Progressive SSE Streams** — Never block the main thread; stream long-running LLM evaluations progressively to ensure client responsiveness.
5. **Clarify, Don't Execute** — Flow captures, clarifies, and qualifies intent; it hands off to downstream agents and never performs the execution itself.
6. **Cheap to Refine, Expensive to Execute** — Use fast/cheap models for the clarifying loop; reserve large models for downstream work so refinement never burns the tokens it is meant to save.
7. **Never Promise Certainty** — User-facing readiness is shown as semantic states (Vague → Actionable → Ready), never a hard score that implies a guarantee.
8. **Transparency Over Magic** — Reused context is cited and confirmed with the user (opt-in), never silently auto-applied.
9. **Guardrails With a Release Valve** — Keep intent in-scope, but always offer a human-escalation path instead of a dead end.
10. **Scrub Before Storing** — Redact PII and secrets before any intent is embedded or persisted for search.
