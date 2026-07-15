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
| BUG-003 | Download exported `intent.md` (understanding) instead of the plan file | P2 | resolved | 13 | The Artifacts header "MD" button exported the understanding fields as `intent.md`, mistaken for the file download. The real files (`plan.md`, OKF) download correctly by their own name. Removed the export button + dead `exportMd`; the only download path is now the actual file. 2026-07-15. |
| BUG-004 | OKF front-matter renders as a run-on heading in the file viewer | P2 | resolved | 13 | Opening `plan.md` showed the YAML front-matter (`okf_version`, `id`, `type`…) as one bold run-on blob — ReactMarkdown mis-parsed `--- … ---` as a setext heading. Fixed: `splitOkf()` parses the front-matter into a clean key/value metadata header, body rendered separately. 2026-07-15. |
| BUG-005 | Build button disappears after a build (must always be visible) | P2 | resolved | 13 | The in-conversation Build was gated on `!record.built`, so it vanished once built — but the user wants it always available (their call whether context is full). Fixed: pinned above the input, always visible when a mode is chosen; after a build it becomes "Rebuild" (force-regenerate). 2026-07-15. |
| BUG-006 | Stale JWT session shows a blank identity ("User"/"U") | P3 | open | — | Sessions are stateless JWT; `auth-options` callbacks inject only `id`+`role` on sign-in and never re-read the DB, so a stale/ghost token renders with no name until re-login (hit live 2026-07-15; a refresh/re-login fixed it). Recommended hardening: fall back `name → email → "User"` in the user cards (global-app-shell, dashboard/sidebar, chat-interface) so identity is never generic; optionally re-sync `name`/`role` from the DB in the jwt/session callbacks so tokens self-heal. |

## Features

| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| FEAT-001 | Persist the chat transcript (not just the record) | P2 | resolved | — | Persisted `ChatTurn[]` on the Intent header (`transcript` Json). Turn route saves the full history each turn; `/refine` restores it on navigation (prefers transcript, falls back to opening line). Verified round-trip against Neon. 2026-07-14. |
| FEAT-002 | Budget auto-pick ("$X → best mode") | P3 | open | 12 (V1.1) | ADR-0002 deferral. Given a max-$ cap, auto-select the highest-quality mode that fits (senior's `auto_pick_profile_by_budget`). Additive to the persona picker. |
| FEAT-003 | Deeper background verification of the working memory | P2 | open | 12+ | Phase-12 clarify does confirm-the-inference (surface inferred slots). Deeper: background cross-checks / consistency validation to further cut hallucination before build. The product's core differentiator — worth expanding once the build flow lands. |
| FEAT-004 | Top strip: lift status + cost out of Artifacts | P3 | resolved | 13 | Resolved: status · mode · cost (est→actual) now live in a bar at the top of the conversation column (next to Build), out of Artifacts; top-right status badge removed. 2026-07-15. |
| FEAT-005 | Publish a built artifact as a versioned v1 (registry) | P2 | deferred | next phase | Once a plan is built, let the user PUBLISH it as v1 — versioning + a registry so artifacts are addressable/shareable. User-requested; explicitly deferred to a future phase (not this one). "Think about it tomorrow." |
| FEAT-006 | Cyclical artifact refinement — review → ask the agent to update (another run) | P2 | deferred | next phase | After the artifact is created, the user reviews it and asks the agent to modify/update it → a fresh build run, making the studio interactive + cyclical (review ⇄ refine). User-requested; deferred to a future phase. NOTE: the always-on **Rebuild** button (BUG-005) already regenerates from edited Understanding fields; FEAT-006 is the richer *conversational* "change X" loop. |

## Tech Debt

| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| _(none)_ | | | | | |

## Enhancements

| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| ENH-001 | Cost display clarity — max estimate + labeled Est./Actual | P2 | resolved | 13 | The top bar showed a cryptic `$0.000–$0.001 · $0.00021`. Changed to `Est. $0.001` (the max estimate, not a range) and `· Actual $0.00021` shown only once the build has run — both labeled + tooltipped so a non-technical user reads them. 2026-07-15. |
| ENH-002 | Split Artifacts / Understanding / Context into distinct cards | P2 | resolved | 13 | Files + Understanding were clubbed into one Artifacts box (crumbled). Now three separate cards in the right column: Artifacts (deliverable files), Understanding (live reasoning behind it), Context Graph — spacious, each with its own scroll. 2026-07-15. |
