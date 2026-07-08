---
type: Vision
---

# Project Charter

> **Project**: Flow
> **Created**: 2026-07-08

## Problem Statement
Capturing, parsing, refining, and authorizing user intents for downstream automation is currently fragmented and lacks accountability. Teams need a structured, auditable lifecycle to process intents with automatic quality checks, role-based reviews, and real-time progress feedback.

## Solution
Flow is a full-featured Intent Lifecycle Management system implementing a 7-stage workflow:
1. Capture → 2. Parsing → 3. Semantic Understanding → 4. Normalization → 5. Quality Gate → 6. Approval Decision Engine → 7. Intent ID Creation.
It features a collapsible sidebar (ChatGPT-style), NextAuth credentials provider, SQLite/PostgreSQL with Prisma, and an SSE-based streaming LLM processing pipeline.

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
- Execution of intents on external systems.
- Third-party OAuth providers (strictly Credentials-based for now).
- Multi-organization/tenant partition isolation.

## Success
Success is verified when 100% of status changes are logged, role boundaries are strictly enforced at the API layer, and the SSE pipeline is robust against connection dropouts.
