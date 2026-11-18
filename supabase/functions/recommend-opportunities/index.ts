// Deploy with: supabase functions deploy recommend-opportunities
// Configure with: supabase secrets set OPENAI_API_KEY=...
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers })
  try {
    const body = await request.json()
    const profile = body?.profile
    const opportunities = Array.isArray(body?.opportunities) ? body.opportunities : []
    if (!profile || opportunities.length === 0) return new Response(JSON.stringify({ source: 'fallback', recommendations: [] }), { headers, status: 200 })
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) return new Response(JSON.stringify({ source: 'fallback', recommendations: [] }), { headers, status: 200 })
    const response = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { ...headers, Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0.2, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: 'Return JSON only with a recommendations array. Each item must contain opportunity_id, score from 0 to 100, and reason under 100 characters.' }, { role: 'user', content: JSON.stringify({ profile: { interests: profile.interests, skills: profile.skills, location: profile.location, availability: profile.availability }, opportunities: opportunities.map((item: Record<string, unknown>) => ({ opportunity_id: item.id, title: item.title, category: item.category, location: item.location, skills: item.skills, date: item.date })) }) }] }) })
    if (!response.ok) return new Response(JSON.stringify({ source: 'fallback', recommendations: [] }), { headers, status: 200 })
    const payload = await response.json()
    const parsed = JSON.parse(payload?.choices?.[0]?.message?.content ?? '{}')
    const recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations.filter((item: Record<string, unknown>) => typeof item.opportunity_id === 'string' && typeof item.score === 'number' && typeof item.reason === 'string').slice(0, 5) : []
    return new Response(JSON.stringify({ source: 'openai', recommendations }), { headers, status: 200 })
  } catch (_error) {
    return new Response(JSON.stringify({ source: 'fallback', recommendations: [] }), { headers, status: 200 })
  }
})
