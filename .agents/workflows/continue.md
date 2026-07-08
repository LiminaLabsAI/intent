---
description: Pick up a pending handoff in this repo. Reads .momentum/inbox/handoff-NNN.md, parses the structured context, acknowledges, moves the artifact to inbox/read/. Use when the user mentions a handoff or when the SessionStart hook indicates one is pending.
---

# continue

### 1. Find the handoff

List files in `.momentum/inbox/` matching `handoff-*.md`. If none, tell the user "no pending handoff" and stop.

If multiple, pick the oldest (lowest N) unless the user named a specific one.

### 2. Read and parse

Read the chosen handoff file. Extract:

- **From**: source repo
- **Why**: the handoff reason
- **State at handoff**: phase + last action
- **What's next**: first action to take
- **References**: files to read first

### 3. Acknowledge to user

Print a one-line acknowledgement: `picking up handoff-NNN from <source>` followed by the "What's next" content. Read the referenced files before proceeding.

### 4. Move the artifact

Move the file from `.momentum/inbox/handoff-NNN.md` to `.momentum/inbox/read/handoff-NNN.md` so the next session doesn't re-pick-up the same handoff. Create the `read/` subdir if missing.

### 5. Proceed with the work

Continue with the action described in "What's next". Honor the project's Rule 1 — read `specs/status.md` before any work, even after a handoff.

## Constraints

- Never delete a handoff — move to `read/` for audit history.
- If the handoff references files that don't exist, surface the gap to the user; don't silently proceed.
- If the source repo's "What's next" conflicts with the active phase here, ask the user before acting.
