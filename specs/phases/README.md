---
type: Guide
---

# Phases Index

| Phase | Name | Status | Directory |
|-------|------|--------|-----------|
| 0 | Bootstrap | Complete | [phase-0-bootstrap](file:///Users/sarang/hustle/intent/specs/phases/phase-0-bootstrap/) |
| 1 | Intent Refinement Engine | Complete | [phase-1-refinement](file:///Users/sarang/hustle/intent/specs/phases/phase-1-refinement/) |
| 2 | LLM Integration | Complete | [phase-2-llm-integration](file:///Users/sarang/hustle/intent/specs/phases/phase-2-llm-integration/) |
| 3 | Validation & Quality Gates | Complete | [phase-3-quality-gates](file:///Users/sarang/hustle/intent/specs/phases/phase-3-quality-gates/) |
| 12 | Working-Memory Build Flow & Cost Engine | Complete | [phase-12-working-memory-build](phase-12-working-memory-build/) |
| 13 | Studio Experience Redesign (ask-to-enrich · OKF build) | Complete | [phase-13-studio-redesign](phase-13-studio-redesign/) |

> **Note:** rows for Phases 4–11 are not yet listed here (pre-existing index drift on the `feat/intent-agent` line; the agent phases 7–11 completed on branch). Tracked for a later index cleanup.

## Phase Structure

Each phase directory contains:

| File | Purpose |
|------|---------|
| `overview.md` | Goal, scope, deliverables, acceptance criteria |
| `plan.md` | Group execution pattern with tasks |
| `tasks.md` | Checklist `[ ]` / `[x]` |
| `history.md` | Append-only log |
| `retrospective.md` | Post-completion review (created by /complete-phase) |

## Swarm-member briefs (optional)

When a phase is driven by a swarm conductor (Phase 17+), `overview.md`
MAY carry an optional YAML frontmatter block declaring its swarm
context. Solo briefs omit this entirely — they remain plain markdown.

```yaml
---
swarm: 0007-user-auth
wave: 2
initiative: user-auth
claimed_by_session: <session-uuid>
---
```

`/start-phase` populates these when invoked from a swarm context.
`/validate` checks that `swarm:` resolves to a real swarm manifest,
that `wave:` matches the wave the swarm has assigned this repo, and
that `initiative:` matches the swarm's initiative.
