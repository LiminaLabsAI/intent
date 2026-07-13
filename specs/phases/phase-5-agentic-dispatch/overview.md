# Phase 5: Agentic Dispatch

## Goal
Build a Webhook-based Agentic Dispatch Pipeline that decouples Flow from the execution layer, allowing finalized intents to be sent to external downstream sub-agents for execution.

## Scope
- A Settings UI to configure the Webhook URL for the downstream execution agent.
- A "Dispatch to Agent" button in the Refinement UI that becomes available once an intent passes the Quality Gate.
- A robust `POST /api/export` payload that delivers the intent payload.
- An inbound webhook (`POST /api/intents/status`) allowing the downstream agent to report execution status back to Flow.

## Acceptance Criteria
- [ ] User can configure and save a Webhook destination in Settings.
- [ ] Intent Refinement UI correctly shows a "Dispatch" button upon scoring >= 80.
- [ ] Clicking Dispatch fires the webhook and creates a "Dispatched" event in the DB.
- [ ] The downstream agent can hit the status endpoint to update the UI (e.g. from "Pending" to "Success").
