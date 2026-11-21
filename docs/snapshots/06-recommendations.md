# Snapshot 06 Recommendation Engine

- Date: 18 November 2026
- Phase: Recommendation engine
- Source paths: `src/lib/recommendations.ts`, `supabase/functions/recommend-opportunities/index.ts`, `scripts/test-recommendations.mjs`
- Implemented: deterministic scoring across interests, skills, location and availability; secure OpenAI Edge Function invocation from the volunteer dashboard; published-only filtering; validated opportunity IDs, scores and reasons; and automatic fallback response.
- Test status: `npm run test` validates ranking, exclusion of closed opportunities, and rejection of malformed/unknown AI records.
- Known limitation: the live OpenAI response path still requires `OPENAI_API_KEY` to be configured as an Edge Function secret and the function to be deployed.
