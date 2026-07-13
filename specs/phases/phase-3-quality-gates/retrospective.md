# Phase 3 Retrospective

## What Went Well
- Quick interception of client-side requests and rerouting to a new API endpoint.
- Structured LLM responses successfully integrated with a Zod schema using AI SDK's `generateObject`.
- The evaluation rubric successfully rejected overly broad intents (e.g., "I want to build an app") with a strict but helpful 0/100 score and actionable questions.

## What Didn't Go Well
- Browser testing via Playwright CDP broke, requiring a fallback to `curl` testing for API validation.

## Lessons Learned
- Moving export validation to the backend provides far more control and opens the door for logging/analytics of dropped intents.
- Zod schema validations for LLMs significantly reduce the manual string parsing previously required.

## Verification Evidence

```bash
npm run build
```

```
> build
> next build

  ▲ Next.js 14.2.35
  - Environments: .env

   Creating an optimized production build ...
 ✓ Compiled successfully
   Skipping linting
   Checking validity of types ...
   Collecting page data ...
 ⚠ Using edge runtime on a page currently disables static generation for that page
Warning: Cannot access the `require` function: "TypeError: process.getBuiltinModule is not a function".
   Generating static pages (0/16) ...
   Generating static pages (4/16) 
   Generating static pages (8/16) 
Warning: Cannot access the `require` function: "TypeError: process.getBuiltinModule is not a function".
   Generating static pages (12/16) 
 ✓ Generating static pages (16/16)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                      Size     First Load JS
┌ ƒ /                            145 B          87.5 kB
├ ƒ /_not-found                  873 B          88.2 kB
├ ƒ /api/evaluate                0 B                0 B
├ ƒ /api/export                  0 B                0 B
├ ƒ /api/graph                   0 B                0 B
├ ƒ /refine                      3.29 kB        90.7 kB
└ ƒ /settings                    2.29 kB        89.6 kB

EXIT_CODE: 0
```
