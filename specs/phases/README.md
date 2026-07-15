---
type: Guide
---

# Phases Index

| Phase | Name | Status | Directory |
|-------|------|--------|-----------|
| 0 | Bootstrap | Complete | [phase-0-bootstrap](phase-0-bootstrap/) |
| 1 | Intent Refinement Engine | Complete | [phase-1-refinement](phase-1-refinement/) |
| 2 | LLM Integration | Complete | [phase-2-llm-integration](phase-2-llm-integration/) |
| 3 | Validation & Quality Gates | Complete | [phase-3-quality-gates](phase-3-quality-gates/) |
| 5 | Agentic Dispatch | Paused | [phase-5-agentic-dispatch](phase-5-agentic-dispatch/) |
| 6 | Studio Experience | Complete | [phase-6-studio-experience](phase-6-studio-experience/) |
| 7 | Deterministic Trunk (rails) | Complete | [phase-7-record-trunk](phase-7-record-trunk/) |
| 8 | The Agent Loop (driver) | Complete | [phase-8-agent-loop](phase-8-agent-loop/) |
| 9 | Studio on the Trunk | Complete | [phase-9-studio-on-trunk](phase-9-studio-on-trunk/) |
| 10 | Studio Convergence | Complete | [phase-10-studio-convergence](phase-10-studio-convergence/) |
| 11 | Behavior & Cost | Complete | [phase-11-behavior-cost](phase-11-behavior-cost/) |
| 12 | Working-Memory Build Flow & Cost Engine | Complete (v0.3.0) | [phase-12-working-memory-build](phase-12-working-memory-build/) |
| 13 | Studio Experience Redesign (ask-to-enrich · OKF build) | Complete (v0.3.0) | [phase-13-studio-redesign](phase-13-studio-redesign/) |
| 14 | Knowledge Bundle Registry & Cyclic Refinement | In Progress | [phase-14-knowledge-bundle-registry](phase-14-knowledge-bundle-registry/) |

> **Note:** Phase 4 (SSE Optimizations) was planned but never scaffolded — it has no directory (see `roadmap.md` / `status.md`). Phases 5 (paused) and 6 (in progress) are separate lanes. Directory links are now relative (were previously absolute paths to a contributor's local machine).

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
