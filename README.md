# Y.A.A.R.

## Youth Activity, Assistance & Redirection

Y.A.A.R. is an AI-assisted youth engagement and social volunteering platform. It connects young people with volunteering opportunities, community initiatives, skill-development activities and local organizations so that time and energy can become practical community impact.

> “Youth don't lack potential; they need direction and opportunities to put that potential into action.”

This repository contains the academic mini-project implementation for KCC Institute of Technology and Management (CC 492), Greater Noida, Department of Computer Science and Engineering, academic session 2024–2028.

## Features

- Responsive public landing page and authenticated application shell.
- Volunteer, organization and administrator role experiences.
- Profile management with interests, skills, location, availability and experience.
- Opportunity discovery with search, category/location/skill/availability/date filters and sorting.
- Opportunity detail pages, save-for-later and application workflow.
- Opportunity photo uploads with local previews and Supabase Storage-backed galleries.
- Organization opportunity creation, editing, publishing, archiving, deletion and applicant review.
- Organization profile details with verified status and coordination contact information.
- Administrator overview with platform statistics and moderation table.
- Rule-based recommendation engine that works without external credentials.
- Server-side OpenAI recommendation Edge Function with validated JSON output and automatic fallback.
- Conversational Y.A.A.R. Personal Opportunity Assistant triggered by “yaar bore ho raha hoon” or “yaar bore ho rahi hoon”.
- Browser voice mode with microphone permission, spoken prompts, wake-phrase listening and spoken recommendation summaries.
- Supabase PostgreSQL migration with foreign keys, indexes, constraints and Row Level Security.
- Demo mode backed by browser localStorage so the core UI is usable immediately.

## Technology stack

React, Vite, TypeScript, React Router, Lucide React, Supabase Auth/PostgreSQL/RLS, Supabase Edge Functions and OpenAI API (optional).

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite. With Supabase configured, the app loads live sessions and database records. The prepared demo roles remain available as a local fallback so the academic preview can still be explored without creating accounts.

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
2. Enable the Google provider under **Authentication → Providers → Google** and enter the Google OAuth client ID and secret.
3. In Google Cloud Console, add `https://<project-ref>.supabase.co/auth/v1/callback` as an authorized redirect URI.
4. Add the project URL and anonymous key to `.env`.
5. Apply all migrations, including `20261121000300_opportunity_management_enhancements.sql`, with the Supabase CLI or SQL editor. This creates the `opportunity-media` public bucket and its owner upload policies.
6. Configure authentication redirect URLs for `http://localhost:5173/login` and the deployed `/login` route.
7. Deploy `supabase/functions/recommend-opportunities/index.ts` through the Supabase API with `npx supabase functions deploy recommend-opportunities --use-api --project-ref hddfdwhrromcxxyupymt` so Docker is not required.
8. Set the Edge Function secret with `supabase secrets set OPENAI_API_KEY=...`.

The volunteer dashboard calls the `recommend-opportunities` Edge Function when a live Supabase session exists. The Edge Function keeps `OPENAI_API_KEY` server-side, accepts the assistant’s current interest request, returns validated opportunity IDs, scores and explanations, and the client merges only eligible published opportunities. The frontend continues to work with rule-based recommendations when Supabase, the Edge Function or OpenAI is unavailable. When Supabase is configured, `src/lib/supabaseData.ts` loads sessions, profiles, opportunities, applications and saved opportunities from PostgreSQL. The demo store remains intentionally separate so a reviewer can explore the application without credentials.

## Roles

| Role | Main capabilities |
| --- | --- |
| Volunteer | Manage profile, discover/filter opportunities, save opportunities, apply, withdraw and track status |
| Organization | Maintain organization details, create/edit/publish/archive opportunities, view the applicant queue and accept/decline applicants |
| Administrator | View platform summary, opportunity directory and application activity |

## Architecture

The current client uses React Router and a small application context for predictable local state and live Supabase refreshes. The Supabase client boundary is isolated in `src/lib/supabase.ts`; live row mapping and mutations are in `src/lib/supabaseData.ts`; the normalized database and RLS model live in `supabase/migrations/`. Recommendation scoring and AI response merging are implemented in `src/lib/recommendations.ts`, while the secret-bearing OpenAI integration runs in the `recommend-opportunities` Edge Function.

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

- The browser demo store remains available as a fallback; live tables must contain organization/opportunity records before the live directory has content.
- Password reset and production email verification are delegated to Supabase Auth configuration and require a live Auth test.
- AI recommendations require the deployed Edge Function and `OPENAI_API_KEY`; deterministic scoring is the guaranteed fallback when either is unavailable.
- The final production verification still requires a live organization, volunteer and administrator test pass after the latest database migrations are applied.
- GitHub publication and deployment are not claimed unless credentials and a remote are available and verified.

## Future scope

Notifications, richer organization verification, volunteer impact history, calendar sync, map-based discovery, automated moderation and analytics can be added after the academic submission baseline.
