# Sequential: Group 0 → Group 1 → Group 2

**Group 0: Database & Settings (Sequential)**
- **Dependency:** Prisma DB
- Update Prisma Schema to add a `WebhookSettings` table and an `IntentStatus` enum.
- Build the `app/settings/page.tsx` UI to manage the webhook URL.

**Group 1: Dispatch Mechanism (Sequential)**
- **Dependency:** Group 0
- Enhance the Refinement UI to show the "Dispatch" button instead of just downloading.
- Update `/api/export/route.ts` to fetch the configured Webhook URL from the DB and execute the actual `fetch` POST request with the structured JSON.

**Group 2: The Feedback Loop (Sequential)**
- **Dependency:** Group 1
- Create a new API route (`app/api/intents/status/route.ts`) that listens for incoming status updates from the external agent.
- Make the Refinement UI dynamically poll or stream these status updates so the user can see execution progress live.
