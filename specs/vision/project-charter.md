---
type: Vision
---

# Project Charter

> **Project**: Flow
> **Created**: 2026-07-08
> **Last Updated**: 2026-07-14
> **Companion**: [`product-design.md`](./product-design.md) — full feature-level design, build-status, and gap analysis.

## Vision Statement
Flow turns vague human-or-machine intent into a precise, governed, execution-ready **working memory** — **before** a single expensive AI agent runs. It is the clarity-and-control layer that sits between a rough idea and the autonomous agents (or developers) who execute it.

Flow's job is deliberately bounded: **capture → clarify → qualify → hand off.** It produces the spec and hands it over; it never presses "Execute." That line — *Flow prepares the payload; the agent runs it* — is the product's discipline and the reason an enterprise can trust it as a control point.

Everything Flow does rests on three pillars, inherited from the Intent Lifecycle:
- **Evidence First** — every decision is backed by verifiable, linked evidence.
- **Governance Always** — org-level policy applies to every intent, whoever raised it; the Quality Gate never bypasses.
- **Progressive Autonomy** — automation is *earned, measured, and widened over time* as outcomes prove out.

## Problem Statement
Every enterprise now has LLMs and is beginning to deploy autonomous agents that can touch real databases, APIs, and infrastructure. But the input to those agents is still a vague sentence — from a person *("I need a report for Q2")* or from another system — with no forcing function to scope, bound, and audit it first. That ambiguity creates three compounding costs:

- **Hallucination & rework** — agents guess, produce the wrong thing, and humans step in to fix it.
- **Wasted compute & money** — vague prompts drive expensive models into loops and retries that burn credits and hours.
- **Uncontrolled risk** — a non-technical employee can trigger a catastrophic action because nothing forced the intent to be scoped, bounded, and audited first.

The missing piece is not a better model. It is the **structured middleware that makes existing models safe and efficient to use at scale** — the "last mile" of AI adoption for non-technical staff.

## Target Users & Positioning
Flow is an **enterprise tool**, sold not to individual developers but to a **Director of Engineering / VP of IT** as an *AI governance and dispatch layer*. It assumes real software-engineering rigor: defined roles, user management, an auditable lifecycle, and strict guardrails that keep intent inside the enterprise context ("I cannot do that") — with a human-escalation path rather than a dead end. The person *in the chair* can be anyone (PM, engineer, ops, marketing); governance is applied at the org level regardless of who they are.

## Core Value Proposition
Enterprises buy software to make money, save money, or mitigate risk. Flow targets the latter two directly:

1. **Governance / compliance firewall** — before any agent executes, the intent has been scoped, its environment defined, and its actionability audited at a central control point. This de-risks autonomous action.
2. **Compute waste prevented (in dollars)** — every vague intent the Quality Gate blocks is avoided spend. A **pre-execution advisory** estimates what a run would cost and shows the savings from refining first — surfaced both org-wide (admin dashboard) and *personally* ("you saved ~$12.50 by clarifying this first") to build the habit.
3. **The last mile of AI adoption** — it lets PMs, QA, ops, and marketing safely trigger complex AI workflows, digitizing the *Requirements Analyst / Technical PM* role. Flow is a co-pilot for writing **specs**, not code.

## Solution Architecture
Flow is an **Intent Refinement Studio** built on an auditable, governed lifecycle backbone. The load-bearing element is a **canonical intent record** — versioned, immutable, event-sourced — that every capture surface writes to and every stage enriches. The record *is* the product; the conversation is how it gets filled. Capture is multi-source: the Studio (human), plus Applications/APIs, Agents/Automation, and Documents/Emails.

### The refinement experience (the Studio)
- **Record-first, not chat-first.** The structured record is the source of truth from the first message; the conversation is one way to *edit* it (typing directly in the doc is another). Every change — user- or model-made — is a versioned event, so the audit trail and version history fall out for free.
- **A critic, not a form.** The Studio pairs an explicit slot-structured record (Objective, Scope, Out-of-Scope, Context, Entities, Acceptance Criteria + intent-type-specific slots) with an **adversarial critic** that detects missing context, ambiguity, and scope conflicts and turns them into targeted, humane questions. Completeness is deterministic — are the required slots strong? — not a hope that the chat wandered far enough.
- **Split-screen.** Conversation on the left; the live *editable* record + a personalized context graph on the right.
- **Fast to refine, expensive to execute.** Cheap/fast models run the clarifying loop; large models are reserved strictly for downstream work. A single-pass "fast lane" serves users who just want it.
- **Evidence as a by-product.** The critic's reasoning ("flagged Scope as ambiguous because …") is captured as first-class linked evidence on the record.

> The interim build (Phase 1/6) extracts structure *from* the chat transcript and only persists at score ≥ 80. The converged design **inverts** this: the record leads, the chat edits it, and it exists from message one. See the companion design doc for the migration.

### The governed backbone (7 stages + state machine)
Capture → Parsing → Semantic Understanding → Normalization → Quality Gate → Approval Decision → Intent ID Creation & Hand-off. Intents move through an explicit state machine (Draft → In Progress → Needs Clarification → Under Review → Approved / Rejected / Archived); every transition is logged. **Invariant: no intent proceeds to execution without passing the Quality Gate and Approval Decision Engine.**

- **Quality Gate** — Completeness, Clarity, Unambiguous Scope, Valid Domain, Sufficient Context, plus a confidence score. Below threshold → clarification. User sees Readiness states (🔴 Vague → 🟡 Actionable → 🟢 Ready), never a raw number.
- **Approval Decision Engine** — evaluates Evidence Quality, Policy & Compliance, Semantic Conflicts, Risk & Impact, Delegation (EACI), and Autonomy Eligibility → one of five outcomes: Auto-Approved · Needs Clarification · Human Review Required · **Conditional Approval** (approve with conditions + monitor compliance) · Rejected.
- **Human Review Workflow** — escalations route to an owner/SME with context, evidence, and an SLA; the reviewer approves, requests changes, or rejects with reason, conditions, and constraints.
- *(Open: **EACI** — the delegation/authority index that decides who may approve/execute which intents — is not yet defined.)*

### Intelligence & memory
- **Knowledge Graph** — a visual map of the organization's intents by topic and context, personalized per user/role (local neighborhood for end-users, global view for reviewers/admins). It surfaces redundancy and emerging trends ("three teams are all building Q2 sales reports") and feeds **Semantic Conflict** detection in the Approval Engine.
- **Semantic memory (`pgvector`)** — meaning-based matching of past intents, injected as *cited, opt-in* context so users reach clarity faster and duplicate work is avoided.

### Handoff & pre-execution advisory
- **Working-memory export** as Markdown / OKF / other target formats. The canonical record is always the full source of truth; **compression is a derived, provenance-tagged projection** sized to a target model's context window — never a mutation of the record. Full or compressed is the user's choice.
- **Pre-execution advisory** — before hand-off, Flow *estimates* (never runs) what downstream execution would cost under each **persona** (a pre-set of model tier, prompt style, temperature, and retrieval strategy), recommends one within a budget, and shows the **refine-to-save** delta. Costs are directional ranges with stated assumptions — Flow estimates, it does not bill.
- **Artifact expansion** — once an intent is ready, optionally generate a **PRD** or **Implementation Plan** as output artifacts.

### Progressive autonomy & continuous learning
Captured outcomes feed a learning loop — Intent Outcomes → Patterns & Insights → Quality & Process → Models & Policies → Autonomy — that gradually widens the auto-approve envelope. Autonomy is earned from a proven track record, not granted by default. This is the long-game moat.

## Guiding Product Principles
1. **Never lie about certainty.** No user-facing "100/100" that implies a guarantee. An internal 0–100 score drives the gate (threshold 80); the user sees **Readiness states** — 🔴 Vague → 🟡 Actionable → 🟢 Ready — so a later downstream question never feels like a broken promise.
2. **Transparency over magic.** When Flow reuses prior context, it *cites its source and asks permission* rather than silently auto-applying.
3. **Guardrails with a release valve.** Intent is kept in-scope, but a rejected user always gets a *"Flag for Human Review"* escalation path.
4. **Don't repeat solved work.** Semantic history surfaces prior intents and solutions so the same exercise is not run twice.
5. **Protect the enterprise before storing.** PII and secrets are scrubbed before any intent is embedded or stored for search.
6. **Estimate, never bill.** Pre-execution cost figures are directional ranges with visible assumptions — decision support at the gate, not an operational invoice.

## Stakeholders
| Role | Name / Team | Responsibility |
|------|-------------|----------------|
| Owner | Sarah Chen (admin@flow.com) | Final decisions, user management, and stats review |
| Reviewer | Marcus Rivera (reviewer@flow.com) | Queue management, intent verification, and decision-making |
| End User | Alex Johnson (user@flow.com) | Intent submission, refinement, and tracking own intents |

## Scope
### In
- Guided intent refinement in a record-first, split-screen Studio with streaming responses (SSE).
- A canonical, versioned, event-sourced intent record + a governed 7-stage lifecycle with an explicit state machine and full audit trail.
- LLM Quality Gate that scores, blocks, and explains what is missing; maintains Objective, Scope, Entities, and linked Evidence.
- Approval Decision Engine with five outcomes (incl. Conditional Approval) and a human review workflow with SME routing and SLAs.
- Personalized, role-scoped Knowledge Graph and `pgvector` semantic history with duplicate/conflict detection.
- User-facing trust metrics: Readiness state and pre-execution cost/compute-saved advisory.
- Working-memory export to Markdown / OKF (with optional target-sized compression) and webhook-based dispatch to downstream agents.
- Role-based access control (ADMIN, REVIEWER, END_USER) enforced at the API layer.
- Intent Registry with search/filter and Intent ID generation (INT-XXXXX) for approved intents.

### Out
- **Task execution** on external systems — Flow stops at "Execute." The task-execution runtime (temperature, provider/API routing, retries, run-cost) belongs to the downstream agent, not Flow. *(Reversible: could be revisited via a separate scope decision.)*
- Multi-organization / multi-tenant partition isolation.
- Multi-user real-time collaborative editing of the live document.

## Success
The product succeeds when: 100% of state-changing operations are recorded in the audit trail; role boundaries are strictly enforced at the API layer; the streaming pipeline is robust against connection dropouts; refined intents export cleanly to `.md`/OKF and are accepted by a downstream agent without further clarifying questions; and the pre-execution advisory gives buyers a defensible, dollar-denominated ROI.

## Future Vision & Ongoing Brainstorming
*Converged 2026-07-14 (see the companion design doc). Earlier items retained below.*

1. **Deeper semantic search via `pgvector`** — auto-detect duplicates at creation and find conceptually similar past requests.
2. **Speed-to-clarity accelerators** — intent templates, cited auto-context from the Knowledge Graph, click-to-answer widgets so a vague thought reaches "Ready" in under a minute.
3. **Date-grouped navigation** — group historical intents by relative dates in the Studio sidebar.
4. **Immersive artifact experience** — inline streaming vs. dedicated full-screen viewer for generated PRDs/Plans.
5. **Agentic dispatch, matured** — finalize how execution agents consume dispatched payloads and report status.
6. **Brand cohesion** — standardize UI to the core brand palette.
7. **Define EACI** — the delegation/authority index for who may approve/execute which intents.
8. **Progressive-autonomy engine** — turn the feedback flywheel into a real mechanism that widens the auto-approve envelope from evidence.
