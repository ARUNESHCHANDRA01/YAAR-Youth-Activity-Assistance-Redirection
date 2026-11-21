# Y.A.A.R. Testing Record

Date: 18 November 2026

## Automated checks

| Check | Result | Evidence |
| --- | --- | --- |
| TypeScript lint | Passed | `npm run lint` |
| Recommendation smoke test | Passed | `npm run test` |
| Production build | Passed after Supabase Vite typing fix | `npm run build` |
| Supabase REST connectivity | Passed for profiles, organizations, opportunities, applications and saved opportunities | Read-only anonymous-key check; no secret values printed |
| Dependency audit | 4 high severity advisories reported by npm | `npm install` output; review before public deployment |

## Functional coverage

| Area | Status | Notes |
| --- | --- | --- |
| Demo volunteer sign-in and session persistence | Passed in local demo | localStorage session |
| Demo organization and administrator access | Passed in local demo | role-aware navigation |
| Search, filtering and sorting | Implemented | browser verification recommended before submission |
| Duplicate application prevention | Implemented and guarded in state layer | production uniqueness is also in SQL |
| Application status updates | Implemented | organization accepts/declines in demo |
| Recommendation ranking and AI response validation | Passed | deterministic smoke test covers ranking, published-only filtering and malformed/unknown AI records |
| Missing AI key fallback | Implemented | Edge Function returns fallback source and the client uses deterministic ranking |
| Supabase Auth and RLS | Schema reachable; live session/RLS flows pending | Tables responded; authenticated role matrix still requires test accounts |
| Responsive layout and keyboard navigation | Implemented in CSS/semantic controls | manual browser pass pending |

## Known limitations

Real authentication, password reset, authenticated RLS enforcement, live OpenAI response success, browser console inspection and deployment still require live test accounts, the Edge Function secret and a deployment target. The local client path validates AI recommendation IDs, scores and reasons before display.
