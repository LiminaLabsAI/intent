# Phase 10: Converge the Studio onto `/refine` (invert onto the trunk)

> On `feat/intent-agent`. No merge to `main` until reviewed. Implements the vision's *"invert the Studio onto the trunk"* + *"two-pipeline cleanup"* (product-design §8 step 2, §9).

## Goal
**One Studio.** Keep `/refine`'s shell (auth, sidebar, history, requester binding, PRD/Plan, export, graph) and **swap its engine** to the new agent (perceive→decide→narrate). Retire the old free-chat + post-hoc-scorer backend; redirect `/studio` → `/refine`.

## Why `/refine`, not `/studio`
The cross-cutting plumbing — auth/login, app shell, sidebar + history, `requesterId`, PRD/Plan, export — is already wired into `/refine`. Rebuilding it on `/studio` is wasted effort. Swapping the backend under `/refine` is far less work (user decision, effort table in history).

## Key Decisions
| Decision | Choice |
|---|---|
| Home | `/refine` (reuse cross-cutting); `/studio` redirects to it |
| Data model | `Intent` row = **header** (auth · `requesterId` · INT-XXXXX · audit · history); `IntentEvent`/`SlotValue` = **body** (the agent record). Bound on first turn. |
| Engine | new agent (`/api/agent/turn`) replaces `/refine` + `/evaluate` free-chat |
| Reused | `RefinementChat`, `LiveDocument`, `MiniGraph`, `/expand` — re-pointed, not rebuilt |
| Retired | old `/refine`, `/evaluate` two-brain flow; `/studio` standalone page |

## Scope
**In:** bind agent turn → `Intent` row + `requesterId` from session · history lists agent intents · re-point `RefinementChat` → `/api/agent/turn` · re-point `LiveDocument` → new record view + inline slot edit + evidence · re-point `MiniGraph` (entities/context) · PRD/Plan via `/expand` on the Ready record · export · redirect `/studio` → `/refine`.

**Out (later):** precedent/knowledge graph (next phase) · full governance/approval · streaming SSE (optional polish) · deleting legacy pipeline code (leave dormant).

## Deliverables
| Deliverable | Verification |
|---|---|
| Agent turn creates/uses an `Intent` row with `requesterId` | DB check + API |
| Logged-in user refines an intent via the agent at `/refine` | browser (after login) |
| The intent appears in the sidebar history | browser |
| Live document renders the new record; a slot is editable | browser |
| PRD/Plan + export work on a Ready record | browser |
| `/studio` redirects to `/refine` | curl 307/308 |
| Tests green | `cd intent/nextjs_space && npm test` |

## Acceptance Criteria
1. A turn at `/refine` (authenticated) persists an `Intent` row (requesterId set) + its `IntentEvent` log, and shows in history.
2. The right panel shows the agent's slots · states · readiness (not the legacy fields), with at least one slot editable inline.
3. One Studio: `/studio` redirects to `/refine`; the old free-chat engine is no longer invoked.
4. `npm test` stays green.
