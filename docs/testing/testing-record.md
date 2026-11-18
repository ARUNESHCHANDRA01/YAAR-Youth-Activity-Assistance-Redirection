# Y.A.A.R. Testing Record

Date: 18 November 2026

## Automated checks

| Check | Result | Evidence |
| --- | --- | --- |
| TypeScript lint | Passed | `npm run lint` |
| Recommendation smoke test | Passed | `npm run test` |
| Production build | Passed after Supabase Vite typing fix | `npm run build` |
| Supabase REST connectivity | Passed for profiles, organizations, opportunities and applications | Read-only anonymous-key check; no secret values printed |
| Dependency audit | 4 high severity advisories reported by npm | `npm install` output; review before public deployment |

## Functional coverage

| Area | Status | Notes |
| --- | --- | --- |
| Demo volunteer sign-in and session persistence | Passed in local demo | localStorage session |
| Demo organization and administrator access | Passed in local demo | role-aware navigation |
| Search, filtering and sorting | Implemented | browser verification recommended before submission |
| Duplicate application prevention | Implemented and guarded in state layer | production uniqueness is also in SQL |
| Application status updates | Implemented | organization accepts/declines in demo |
| Rule-based recommendations | Passed | deterministic smoke test |
| Missing AI key fallback | Implemented | Edge Function returns fallback source |
| Supabase Auth and RLS | Schema reachable; live session/RLS flows pending | Tables responded; authenticated role matrix still requires test accounts |
| Responsive layout and keyboard navigation | Implemented in CSS/semantic controls | manual browser pass pending |

## Known limitations

Real authentication, password reset, authenticated RLS enforcement, OpenAI response success, browser console inspection and deployment still require live test accounts, Edge Function deployment and a deployment target.
