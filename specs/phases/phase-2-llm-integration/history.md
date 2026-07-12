| Type | Meaning |
|---|---|
| `[DECISION]` | Architectural or design choice and its rationale |
| `[SCOPE_CHANGE]` | Addition or removal of phase scope |
| `[DISCOVERY]` | Note about a bug, tech debt, or unexpected constraint |
| `[FEATURE]` | Notable implementation detail |
| `[ARCH_CHANGE]` | Change affecting `specs/architecture/` |
| `[NOTE]` | Anything else worth a future reader's time |

---

### [DECISION] 2026-07-12 — AI SDK and Force Graph Selection
Topics: llm, ai-sdk, force-graph
Affects-phases: phase-2-llm-integration
Detail: Selected Vercel's `ai` SDK for handling SSE streams and structured object generation, and `react-force-graph-2d` for the UI visualizer based on performance and ecosystem fit.
