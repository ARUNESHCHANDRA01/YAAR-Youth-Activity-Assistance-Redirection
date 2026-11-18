# Y.A.A.R.

## Youth Activity, Assistance & Redirection

Y.A.A.R. is an AI-assisted youth engagement and social volunteering platform. It connects young people with volunteering opportunities, community initiatives, skill-development activities and local organizations so that time and energy can become practical community impact.

> “Youth don't lack potential; they need direction and opportunities to put that potential into action.”

This repository contains the academic mini-project implementation for KCC Institute of Technology and Management (CC 492), Greater Noida, Department of Computer Science and Engineering, academic session 2024–2028.

## Features

- Responsive public landing page and authenticated application shell.
- Volunteer, organization and administrator role experiences.
- Profile management with interests, skills, location, availability and experience.
- Opportunity discovery with search, category/location filters and sorting.
- Opportunity detail pages, save-for-later and application workflow.
- Organization opportunity creation and applicant review.
- Administrator overview with platform statistics and moderation table.
- Rule-based recommendation engine that works without external credentials.
- Optional server-side OpenAI recommendation Edge Function with validated JSON output.
- Supabase PostgreSQL migration with foreign keys, indexes, constraints and Row Level Security.
- Demo mode backed by browser localStorage so the core UI is usable immediately.

## Technology stack

React, Vite, TypeScript, React Router, Lucide React, Supabase Auth/PostgreSQL/RLS, Supabase Edge Functions and OpenAI API (optional).

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite. The landing page links to a demo sign-in screen. Choose a volunteer, organization or administrator account. The demo data is stored in `localStorage`; no credentials are required for the academic preview.

Production verification:

```bash
npm run lint
npm run test
npm run build
npm run preview
```

## Environment variables

Copy `.env.example` to `.env` and configure:

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
```

Only the publishable/anonymous Supabase key may be used in the Vite client. `OPENAI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` must be stored as Supabase Edge Function secrets, never in `.env` exposed to the frontend and never committed.

## Supabase setup

1. Create a Supabase project and enable email/password authentication.
2. Add the project URL and anonymous key to `.env`.
3. Apply `supabase/migrations/20261118000100_initial_yaar.sql` with the Supabase CLI or SQL editor.
4. Configure authentication redirect URLs for the local and deployed origins.
5. Deploy `supabase/functions/recommend-opportunities/index.ts` if OpenAI recommendations are required.
6. Set the Edge Function secret with `supabase secrets set OPENAI_API_KEY=...`.

The frontend continues to work with rule-based recommendations when Supabase or OpenAI is not configured. The current demo store is intentionally separate from production persistence so a reviewer can explore the application without credentials.

## Roles

| Role | Main capabilities |
| --- | --- |
| Volunteer | Manage profile, discover/filter opportunities, save opportunities, apply, withdraw and track status |
| Organization | Create/manage opportunities, view the applicant queue and accept/decline applicants |
| Administrator | View platform summary, opportunity directory and application activity |

## Architecture

The current client uses React Router and a small application context for predictable demo state. The Supabase boundary is isolated in `src/lib/supabase.ts`; the normalized database and RLS model live in `supabase/migrations/`. Recommendation scoring is implemented in `src/lib/recommendations.ts`, while the optional secret-bearing integration is an Edge Function.

See the reproducible Mermaid sources in `docs/diagrams/` for the architecture, use cases, data flow and entity relationships.

## Academic project information

- Project guide: Ms. Sapna Kumari
- Head of Department: Prof. Chetan Khemraj
- Arunesh Chandra — 2404920100099
- Divyansh Vardhan — 2404920100134
- Mukul Saini — 2404920100210
- Abhishek Patni — 2404920100024
- Shivam — 2404920100322

The editable report and PDF are generated under `outputs/` when the documentation workflow is run. The report distinguishes verified implementation evidence from planned or credential-blocked integrations.

## Documentation and evidence

- [Snapshot index](docs/snapshot-index.md)
- [Testing record](docs/testing/testing-record.md)
- [Architecture diagram](docs/diagrams/architecture.mmd)
- [Use case diagram](docs/diagrams/use-case.mmd)
- [Data flow diagram](docs/diagrams/data-flow.mmd)
- [Entity relationship diagram](docs/diagrams/entity-relationship.mmd)
- [Database overview](docs/diagrams/database-overview.mmd)

## Repository information

Intended GitHub repository name: `YAAR-Youth-Activity-Assistance-Redirection`. A local Git repository and initial commit exist; no remote has been configured because GitHub CLI/authentication is unavailable and repository visibility was not specified.

## Known limitations

- The browser demo store is local-only until Supabase credentials and migrations are configured.
- Password reset and production email verification are delegated to Supabase Auth configuration and are not exercised in demo mode.
- AI recommendations are optional; deterministic scoring is the guaranteed fallback.
- GitHub publication and deployment are not claimed unless credentials and a remote are available and verified.

## Future scope

Notifications, richer organization verification, volunteer impact history, calendar sync, map-based discovery, automated moderation and analytics can be added after the academic submission baseline.
