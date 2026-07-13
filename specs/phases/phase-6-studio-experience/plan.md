# Sequential: Group 0 → Group 1 → Group 2

### Group 0: Database & Expansion APIs
**Sequential.**
- Update `schema.prisma` to add an `Artifacts` model (or a JSON field on `Intent`) to store generated PRDs and Plans.
- Create `/api/expand/route.ts` which takes a qualified Intent and an artifact type ('PRD' or 'PLAN') and streams an LLM-generated comprehensive markdown document.

### Group 1: The Artifact & Graph View (Right Panel)
**Sequential.**
- Build `LiveDocument.tsx`: A component that parses the raw intent JSON into a beautiful, read-only markdown-style view (Objective, Scope, Context).
- Build `MiniGraph.tsx`: A visualization widget (using your existing graph libraries) showing the intent's linked topics.

### Group 2: The Studio Assembly (Left Panel & Layout)
**Sequential.**
- Refactor `RefinementChat.tsx` layout into a two-column CSS grid.
- Add the "Generate PRD" and "Generate Implementation Plan" buttons to the Readiness header.
- Wire the expansion buttons to the `/api/expand` endpoint and stream the output directly into the `LiveDocument` panel.
