# Snapshot 04 Database and RLS

- Date: 18 November 2026
- Phase: Database and migrations
- Source paths: `supabase/migrations/20261118000100_initial_yaar.sql`, `docs/diagrams/entity-relationship.mmd`, `docs/diagrams/database-overview.mmd`
- Implemented: profiles, organizations, opportunities, applications and saved opportunities with UUIDs, status enums, foreign keys, timestamps, indexes, uniqueness constraints and RLS policies.
- Technical note: helper functions restrict organization actions to the owning profile and allow administrator oversight. Public opportunity reads are limited to published records.
- Test status: read-only REST checks confirmed the configured project exposes the migration tables. Authenticated RLS execution still needs separate test accounts.
