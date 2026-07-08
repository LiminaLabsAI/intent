# Sequential: Group 0 → Group 1 → Group 2

## Group 0: Database & Schema Verification
- **Sequential.**
- Dependencies: Postgres/SQLite connection
- Commit: `infra: verify database schema and run prisma generation`
- Files:
  - `intent/nextjs_space/prisma/schema.prisma`

## Group 1: Routing & Authentication Checks
- **Sequential.**
- Dependencies: NextAuth configuration
- Commit: `feat(auth): verify page routing and NextAuth middleware`
- Files:
  - `intent/nextjs_space/middleware.ts`
  - `intent/nextjs_space/app/api/auth/[...nextauth]/route.ts`

## Group 2: Compilation & Bundling
- **Sequential.**
- Dependencies: Build steps
- Commit: `chore: verify production build completeness`
- Files:
  - `intent/nextjs_space/package.json`
