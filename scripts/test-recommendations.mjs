import assert from 'node:assert/strict'

const profile = { interests: ['Education', 'Technology'], skills: ['Teaching', 'Web development'], location: 'Greater Noida', availability: 'Weekends' }
const opportunities = [
  { id: 'education-local', title: 'Code for Classrooms', category: 'Education', location: 'Greater Noida', skills: ['Teaching'], status: 'published' },
  { id: 'unrelated', title: 'Animal Care', category: 'Animal welfare', location: 'Delhi', skills: ['Animal care'], status: 'published' },
  { id: 'closed', title: 'Closed project', category: 'Technology', location: 'Greater Noida', skills: ['Web development'], status: 'closed' },
]

function score(item) {
  const interest = profile.interests.some((x) => item.category.toLowerCase().includes(x.toLowerCase()) || x.toLowerCase().includes(item.category.toLowerCase()))
  const skill = item.skills.some((x) => profile.skills.some((y) => x.toLowerCase().includes(y.toLowerCase()) || y.toLowerCase().includes(x.toLowerCase())))
  const local = item.location.toLowerCase().includes(profile.location.toLowerCase())
  return (interest ? 45 : 0) + (skill ? 30 : 0) + (local ? 20 : 0) + 5
}
const result = opportunities.filter((item) => item.status === 'published').map((item) => ({ ...item, score: score(item) })).sort((a, b) => b.score - a.score)
assert.equal(result[0].id, 'education-local')
assert.equal(result.length, 2)
assert.ok(result[0].score > result[1].score)
console.log('PASS rule-based recommendation ranking')
console.log('PASS unpublished opportunities are excluded')

function mergeAIRecommendations(items, payload) {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.recommendations)) return []
  const byId = new Map(items.filter((item) => item.status === 'published').map((item) => [item.id, item]))
  const seen = new Set()
  return payload.recommendations.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return []
    const opportunity = byId.get(candidate.opportunity_id)
    const score = candidate.score
    const reason = typeof candidate.reason === 'string' ? candidate.reason.trim() : ''
    if (!opportunity || seen.has(candidate.opportunity_id) || typeof score !== 'number' || !Number.isFinite(score) || !reason) return []
    seen.add(candidate.opportunity_id)
    return [{ id: opportunity.id, score: Math.round(Math.max(0, Math.min(100, score))), reason: reason.slice(0, 100) }]
  }).slice(0, 5)
}

const aiResult = mergeAIRecommendations(opportunities, {
  recommendations: [
    { opportunity_id: 'education-local', score: 87, reason: 'Matches your education interests.' },
    { opportunity_id: 'unknown', score: 99, reason: 'Must be rejected.' },
    { opportunity_id: 'education-local', score: 'bad', reason: 'Must be rejected.' },
    { opportunity_id: 'unrelated', score: 74, reason: 'A valid alternative.' },
  ],
})
assert.deepEqual(aiResult.map((item) => item.id), ['education-local', 'unrelated'])
console.log('PASS AI response validation rejects unknown and malformed records')
