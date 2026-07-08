---
description: Read-only context fetch from one ecosystem member repo. Returns a structured summary, writes a scout artifact to .momentum/runs/. Use when you need to understand another repo's state before planning cross-repo work.
---

# scout

### 1. Resolve target

Identify the ecosystem member to scout from the user's input (member id or path). Look up `ecosystem.json` to confirm the member exists. If the user did not specify a target, ask for one and stop until they answer.

### 2. Read the target's status

From the target repo, read these in order (skip silently if any is missing):

1. `specs/status.md`
2. `specs/backlog/backlog.md` (just the open P0/P1 lines)
3. `specs/phases/<active-phase>/tasks.md` (just the in-flight rows)
4. `AGENTS.md` (only if the user asked about rules)

### 3. Synthesize the scout result

Produce a structured summary with these sections in this order:

- **Repo**: <member id>
- **Active phase**: <phase name> + status
- **Blockers / P0s**: bullet list or "(none)"
- **Recent decisions**: top 3 history entries by recency
- **Relevance to current task**: 1–2 sentences explaining how the scouted state affects what we're trying to do

### 4. Write the scout artifact

Append a scout entry to `.momentum/runs/scout-<NNN>.md` with the same structured summary so the result is durable across sessions.

### 5. Return to user

Present the synthesis as the response. Do not propose follow-up work — scout is read-only. If follow-up is needed, the user invokes `/handoff` or `/dispatch` next.

## Constraints

- READ-ONLY. Do not modify any files in the target repo.
- Do not invoke other slash commands as a side effect.
- Stay under ~500 tokens in the response unless the user asks for a deeper read.
