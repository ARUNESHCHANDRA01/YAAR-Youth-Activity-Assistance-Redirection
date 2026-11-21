# Browser Evidence Record

Date: 21 November 2026

The local Vite application was opened at `http://127.0.0.1:5173/` and inspected in the in-app browser. The following real states were observed:

| Route or state | Evidence observed |
| --- | --- |
| `/` | Public landing page with Y.A.A.R. identity, value proposition, featured opportunity, how-it-works section and call to action |
| `/login` | Demo sign-in with volunteer, organization and administrator role buttons |
| `/dashboard` as volunteer | Profile completion, active applications, impact points, smart-match recommendations and application snapshot |
| `/opportunities` | Six opportunity cards with search, category/location filters and sort control |
| `/opportunities/opp-2` | Code for Classrooms detail view with facts, skills and accepted application state |
| `/dashboard` as organization | Published opportunity count, applicant count, review queue and create-opportunity action |
| `/admin` as administrator | Platform metrics, activity list, category bars and moderation table |

The observed UI states are genuine local application output. No production users, credentials, external accounts or screenshots from an unrelated source were used.

## Follow-up verification required

The current implementation also includes organization detail editing, opportunity edit/publish/unpublish/archive/reopen/delete controls, and skill/availability/date filters. These follow-up states are not claimed as browser evidence until the latest Supabase migration is applied and the three live role accounts are tested.
