# Snapshot 06 Recommendation Engine

- Date: 18 November 2026
- Phase: Recommendation engine
- Source paths: `src/lib/recommendations.ts`, `supabase/functions/recommend-opportunities/index.ts`, `scripts/test-recommendations.mjs`
- Implemented: deterministic scoring across interests, skills, location and availability; reason text; published-only filtering; secure optional OpenAI Edge Function with JSON response validation and fallback response.
- Test status: `npm run test` validates ranking and exclusion of closed opportunities.
- Known limitation: OpenAI path is not live-tested until `OPENAI_API_KEY` is configured as an Edge Function secret.
