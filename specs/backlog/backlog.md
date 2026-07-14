---
type: Backlog
---

# Backlog

> **Last Updated**: YYYY-MM-DD

---

## Priority Levels

| Level | Meaning |
|-------|---------|
| **P0** | Critical — blocks current phase |
| **P1** | High — address in current/next phase |
| **P2** | Medium — within 2 phases |
| **P3** | Low — nice to have |

**Status**: `open` | `in-progress` | `resolved` | `deferred` | `deprecated`

---

## Bugs

| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| BUG-001 | `/refine` UI is broken | P0 | resolved | Phase 9–10 | Root cause: server component awaited Prisma + NextAuth at render. Fixed: guarded render (P9) + `/refine` converged onto the agent Studio (P10), browser-verified logged in. |
| BUG-002 | `ask_outcome` gate not firing in live dev | P2 | open | 13 | Unit test confirms the outcome gate; live dev showed offer_build instead — the recurring Next-dev deep-lib hot-reload staleness. Re-verify on a clean server + authed browser; the logic is correct. |

## Features

| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| FEAT-001 | Persist the chat transcript (not just the record) | P2 | resolved | — | Persisted `ChatTurn[]` on the Intent header (`transcript` Json). Turn route saves the full history each turn; `/refine` restores it on navigation (prefers transcript, falls back to opening line). Verified round-trip against Neon. 2026-07-14. |
| FEAT-002 | Budget auto-pick ("$X → best mode") | P3 | open | 12 (V1.1) | ADR-0002 deferral. Given a max-$ cap, auto-select the highest-quality mode that fits (senior's `auto_pick_profile_by_budget`). Additive to the persona picker. |
| FEAT-003 | Deeper background verification of the working memory | P2 | open | 12+ | Phase-12 clarify does confirm-the-inference (surface inferred slots). Deeper: background cross-checks / consistency validation to further cut hallucination before build. The product's core differentiator — worth expanding once the build flow lands. |
| FEAT-004 | Top strip: lift status + cost out of Artifacts | P3 | resolved | 13 | Resolved: status · mode · cost (est→actual) now live in a bar at the top of the conversation column (next to Build), out of Artifacts; top-right status badge removed. 2026-07-15. |

## Tech Debt

| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| _(none)_ | | | | | |

## Enhancements

| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| _(none)_ | | | | | |
