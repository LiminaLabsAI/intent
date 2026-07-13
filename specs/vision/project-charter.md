---
type: Vision
---

# Project Charter

> **Project**: Flow
> **Created**: 2026-07-08
> **Last Updated**: 2026-07-13

## Problem Statement
Capturing, parsing, refining, and authorizing user intents for downstream automation is currently fragmented and lacks accountability. Teams need a structured, auditable lifecycle to process intents with automatic quality checks, role-based reviews, and real-time progress feedback.

## Solution Architecture
Flow is a full-featured Intent Lifecycle Management system implementing a 7-stage workflow:
1. Capture → 2. Parsing → 3. Semantic Understanding → 4. Normalization → 5. Quality Gate → 6. Approval Decision Engine → 7. Intent ID Creation & Dispatch.

### Key Capabilities (Evolved July 9–13)
- **The Intent Studio**: A powerful split-screen interface where users converse with the AI on the left and see real-time state and context graph linkages on the right.
- **AI Artifact Expansion**: Live streaming generation of Product Requirements Documents (PRDs) and Implementation Plans directly into the Studio's Live Document viewer.
- **Strict Quality Gates**: LLMs evaluate intents on a 1-100 scale, strictly extracting the Business Objective, Scope, and Entities. Intents scoring < 80 are blocked from approval.
- **Agentic Dispatch (Webhooks)**: An agnostic execution pipeline that fires webhooks to user-configured downstream agents/services and tracks asynchronous execution status.
- **Real-time Engine**: SSE-based streaming pipeline for instant UI feedback on generation and state changes.

## Stakeholders
| Role | Name / Team | Responsibility |
|------|-------------|----------------|
| Owner | Sarah Chen (admin@flow.com) | Final decisions, user management, and stats review |
| Reviewer | Marcus Rivera (reviewer@flow.com) | Queue management, intent verification, and decision-making |
| End User | Alex Johnson (user@flow.com) | Intent submission and tracking own intents |

## Scope
### In
- 7-stage intent processing with database persistence.
- NextAuth role-based access control (ADMIN, REVIEWER, END_USER).
- Live processing progress streamed using Server-Sent Events (SSE).
- Intent Registry with search/filter and CSV export.
- Automatic Intent ID generation (INT-XXXXX) for approved intents.
- Version history and audit logs for all transitions.

### Out
- Execution of intents on external systems (Flow delegates this via Webhooks).
- Third-party OAuth providers (strictly Credentials-based for now).
- Multi-organization/tenant partition isolation.

## Success
Success is verified when 100% of status changes are logged, role boundaries are strictly enforced at the API layer, and the SSE pipeline is robust against connection dropouts.

## Future Vision & Ongoing Brainstorming
*As of July 13th, the following roadmap items have been identified for future evolution:*

1. **Semantic Search via `pgvector`**: Migrate the database to PostgreSQL with `pgvector`. By generating vector embeddings for every intent, we will unlock advanced capabilities like auto-detecting duplicate intents during creation and finding conceptually similar past requests.
2. **Date-Grouped Navigation**: Refactor the Studio sidebar to intelligently group historical intents by relative dates ("Today", "Yesterday", "Last 7 Days") to drastically improve UX for power users.
3. **Immersive PRD Experience**: Optimize the layout of AI-generated artifacts (PRDs/Plans) within the Live Document, debating between inline streaming versus dedicated full-screen modals for distraction-free reading.
4. **Brand Cohesion**: Standardize all UI elements (like the "New Intent" button and artifact actions) to align strictly with the core brand palette (deep blue/indigo), moving away from default utility colors.
