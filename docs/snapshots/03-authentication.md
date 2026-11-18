# Snapshot 03 Authentication and Roles

- Date: 18 November 2026
- Phase: Authentication and authorization
- Source paths: `src/App.tsx`, `src/data.ts`, `src/lib/supabase.ts`, `supabase/migrations/20261118000100_initial_yaar.sql`
- Implemented: volunteer, organization and administrator role-aware routes; demo sign-in; Supabase email/password sign-in and registration; session hydration; profile creation; protected application shell; database RLS policies for the production path.
- Test status: all three demo role entry points remain available, and the configured Supabase REST endpoint responds. Authenticated session and role-matrix tests remain pending.
- Known limitation: email/password reset and real Auth persistence require test accounts and confirmation settings in the Supabase project.
