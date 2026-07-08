---
description: Cross-session control transfer with a structured context block. Writes a handoff artifact to the target repo's .momentum/inbox/ so the receiving session can pick up where this one left off. Use when the work must continue in a different repo or after a session boundary.
---

# handoff

### 1. Resolve target

Identify the target repo (ecosystem member id or path) and the handoff summary from the user's input. The summary should be 1–3 sentences describing what the receiver should continue.

### 2. Build the context block

Compose a handoff message with these sections:

- **From**: this repo id
- **To**: target repo id
- **Why**: 1–3 sentence summary (the user's input)
- **State at handoff**: active phase, last meaningful action, any open decisions
- **What's next**: what the receiver should do first
- **References**: file paths the receiver should read first (status.md, the active phase tasks.md, any open initiative)

### 3. Write the handoff artifact

Write the composed handoff to `<target-repo>/.momentum/inbox/handoff-<NNN>.md` where N is the next sequential number. Create the inbox directory if missing.

### 4. Log to session log

Append a one-line entry to the ecosystem session log noting `handoff: from <source> → <target>` so cross-repo coordination is visible.

### 5. Confirm to user

Tell the user the handoff was written, name the artifact path, and remind them to acknowledge in the receiving session via `/continue`.

## Constraints

- Handoffs are write-once — never overwrite an existing `handoff-<NNN>.md`. Increment N.
- The target repo's `.momentum/inbox/` must exist (create if missing).
- A handoff is NOT a synchronous transfer — the receiver picks it up on next session start (via the SessionStart hook) or by explicit `/continue`.
