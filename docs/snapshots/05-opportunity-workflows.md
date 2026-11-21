# Snapshot 05 Opportunity and Application Workflows

- Date: 18 November 2026
- Phase: Opportunity and application workflows
- Source paths: `src/App.tsx`, `src/data.ts`, `src/types.ts`
- Implemented: opportunity search, category/location/skill/availability/date filtering, sort options, detail view, save/unsave, volunteer apply/withdraw, organization applicant review, status badges, duplicate prevention, capacity checks and owner/admin edit, publish, unpublish, archive, reopen and delete controls.
- Test status: demo data includes published opportunities and pending/accepted applications; live CRUD functions call Supabase when a session is active. Remote migration application and RLS enforcement still require the user's Supabase CLI session.
- Known limitation: live concurrency and organization applicant visibility require authenticated integration testing and seeded organization data.
