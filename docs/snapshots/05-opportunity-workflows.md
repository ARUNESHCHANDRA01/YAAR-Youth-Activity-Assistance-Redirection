# Snapshot 05 Opportunity and Application Workflows

- Date: 18 November 2026
- Phase: Opportunity and application workflows
- Source paths: `src/App.tsx`, `src/data.ts`, `src/types.ts`
- Implemented: opportunity search, category/location filtering, sort options, detail view, save/unsave, volunteer apply/withdraw, organization applicant review, status badges, duplicate prevention and capacity checks.
- Test status: demo data includes published opportunities and pending/accepted applications so each state is visible without a backend.
- Known limitation: live concurrency and database uniqueness behavior require Supabase integration testing.
