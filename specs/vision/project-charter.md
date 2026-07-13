---
type: Vision
---

# Project Charter

> **Project**: Flow
> **Created**: 2026-07-08
> **Last Updated**: 2026-07-13

## Vision Statement
Flow turns vague human intent into a precise, governed, execution-ready brief — **before** a single expensive AI agent runs. It is the clarity-and-control layer that sits between a person's rough idea and the autonomous agents (or developers) who execute it.

Flow's job in the workflow is deliberately bounded: **capture → clarify → qualify.** It produces the spec; it does not perform the execution. That boundary is the product's discipline and the reason enterprises can trust it as a control point.

## Problem Statement
Every enterprise now has LLMs and is beginning to deploy autonomous agents that can touch real databases, APIs, and infrastructure. But the input to those agents is still a vague human sentence — *"I need a report for Q2"*, *"clean up the old user data."* That ambiguity creates three compounding costs:

- **Hallucination & rework** — agents guess, produce the wrong thing, and humans step in to fix it.
- **Wasted compute & money** — vague prompts drive expensive models into loops and retries that burn credits and hours.
- **Uncontrolled risk** — a non-technical employee can trigger a catastrophic action because nothing forced the intent to be scoped, bounded, and audited first.

The missing piece is not a better model. It is the **structured middleware that makes existing models safe and efficient to use at scale** — the "last mile" of AI adoption for non-technical staff.

## Target Users & Positioning
Flow is an **enterprise tool**, sold not to individual developers but to a **Director of Engineering / VP of IT** as an *AI governance and dispatch layer*. It assumes real software-engineering rigor: defined roles, user management, an auditable lifecycle, and strict guardrails that keep intent inside the enterprise context ("I cannot do that") — with a human-escalation path rather than a dead end.

## Core Value Proposition
Enterprises buy software to make money, save money, or mitigate risk. Flow targets the latter two directly:

1. **Governance / compliance firewall** — before any agent executes, the intent has been scoped, its environment defined, and its actionability audited at a central control point. This de-risks autonomous action.
2. **Compute waste prevented (in dollars)** — every vague intent the Quality Gate blocks is avoided spend. This is surfaced both org-wide (admin dashboard) and *personally* to each user ("you saved ~$12.50 by clarifying this first") to build the habit.
3. **The last mile of AI adoption** — it lets PMs, QA, ops, and marketing safely trigger complex AI workflows, digitizing the *Requirements Analyst / Technical PM* role. Flow is a co-pilot for writing **specs**, not code.

## Solution Architecture
Flow is an **Intent Refinement Studio** built on an auditable lifecycle backbone.

### The refinement experience
- **A discussion, not a chatbot.** A guided, three-stage session — **High-Level → Details → Deep Discussion** — drives structured requirements gathering rather than open-ended rambling.
- **The Studio (split-screen).** Conversation on the left; a **live-structuring document** on the right that builds itself as the user talks (Objective, Scope, Out-of-Scope, Context, Entities, Acceptance Criteria), plus a personalized context graph.
- **Fast to refine, expensive to execute.** Cheap/fast models run the clarifying loop; large models are reserved strictly for downstream work, so refinement never burns the tokens it is trying to save.

### The auditable backbone (7 stages)
Capture → Parsing → Semantic Understanding → Normalization → Quality Gate → Approval Decision → Intent ID Creation & Dispatch. Every transition is logged, giving reviewers full accountability and enterprises a defensible record of how each intent was qualified.

### Intelligence & memory
- **Knowledge Graph** — a visual map of the organization's intents by topic and context, personalized per user/role (a local neighborhood for end-users, a global view for reviewers/admins). It surfaces redundancy and emerging trends ("three teams are all building Q2 sales reports").
- **Semantic memory (`pgvector`)** — meaning-based matching of past intents, injected as *cited, opt-in* context so users reach clarity faster and duplicate work is avoided.

### Handoff
- **Export** as Markdown or OKF, or **dispatch** to an external execution agent via a decoupled, webhook-based pipeline with an execution-status feedback loop. Flow stays agnostic to the execution engine.
- **Artifact expansion** — once an intent is ready, optionally generate a **PRD** or **Implementation Plan** from it, as output artifacts.

## Guiding Product Principles
1. **Never lie about certainty.** No user-facing "100/100" score that implies a guarantee. An internal 0–100 score drives the approval gate (threshold 80); the user sees **Readiness states** — 🔴 Vague → 🟡 Actionable → 🟢 Ready for Dispatch — so a downstream question later never feels like a broken promise.
2. **Transparency over magic.** When Flow reuses prior context, it *cites its source and asks permission* ("In your last intent [User Auth Setup] we used NextAuth — apply that here?") rather than silently auto-applying.
3. **Guardrails with a release valve.** Intent is strictly kept in-scope, but a rejected user always gets a *"Flag for Human Review"* escalation path.
4. **Don't repeat solved work.** Semantic history surfaces prior intents and their solutions so the same exercise is not run twice.
5. **Protect the enterprise before storing.** PII and secrets are scrubbed before any intent is embedded or stored for search.

## Stakeholders
| Role | Name / Team | Responsibility |
|------|-------------|----------------|
| Owner | Sarah Chen (admin@flow.com) | Final decisions, user management, and stats review |
| Reviewer | Marcus Rivera (reviewer@flow.com) | Queue management, intent verification, and decision-making |
| End User | Alex Johnson (user@flow.com) | Intent submission, refinement, and tracking own intents |

## Scope
### In
- Guided 3-stage intent refinement with a split-screen Studio and streaming responses (SSE).
- 7-stage auditable lifecycle with database persistence and version history.
- LLM Quality Gate that scores, blocks, and explains what is missing; extracts Objective, Scope, and Entities.
- Personalized, role-scoped Knowledge Graph and `pgvector` semantic history.
- User-facing trust metrics: Readiness state and estimated compute saved.
- Export to Markdown / OKF and webhook-based dispatch to downstream agents.
- Role-based access control (ADMIN, REVIEWER, END_USER) enforced at the API layer.
- Intent Registry with search/filter and Intent ID generation (INT-XXXXX) for approved intents.

### Out
- **Execution** of intents on external systems — Flow qualifies and hands off; it does not run the work.
- Multi-organization / multi-tenant partition isolation.
- Multi-user real-time collaborative editing of the live document.

## Success
The product succeeds when: 100% of state-changing operations are recorded in the audit trail; role boundaries are strictly enforced at the API layer; the streaming pipeline is robust against connection dropouts; refined intents export cleanly to `.md`/OKF and are accepted by a downstream agent without further clarifying questions; and the compute-saved metric gives buyers a defensible, dollar-denominated ROI.

## Future Vision & Ongoing Brainstorming
*As of July 13th, the following items have been identified for future evolution:*

1. **Deeper semantic search via `pgvector`** — vector embeddings for every intent to auto-detect duplicates at creation and find conceptually similar past requests.
2. **Speed-to-clarity accelerators** — intent templates, cited auto-context from the Knowledge Graph, and interactive click-to-answer widgets so a vague thought reaches "Ready" in under a minute.
3. **Date-grouped navigation** — group historical intents by relative dates ("Today", "Yesterday", "Last 7 Days", "Older") in the Studio sidebar.
4. **Immersive artifact experience** — refine how generated PRDs/Plans render (inline streaming vs. dedicated full-screen viewer).
5. **Agentic dispatch, matured** — finalize the operational model for how execution agents consume dispatched payloads and report status before re-enabling the dispatch action in the UI.
6. **Brand cohesion** — standardize UI elements (e.g., the "New Intent" button) to the core brand palette (deep blue/indigo), away from default utility colors.
