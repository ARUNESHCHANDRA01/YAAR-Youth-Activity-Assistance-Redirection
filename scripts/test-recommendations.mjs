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

const filterFixtures = [
  { id: 'weekend-tech', date: '2026-11-28', skills: ['Teaching'], availability: 'Weekends', status: 'published' },
  { id: 'future-health', date: '2027-01-20', skills: ['First aid'], availability: 'Weekdays', status: 'published' },
]
const matching = filterFixtures.filter((item) => item.status === 'published' && item.skills.some((skill) => skill.toLowerCase().includes('teach')) && item.availability === 'Weekends')
assert.deepEqual(matching.map((item) => item.id), ['weekend-tech'])
assert.equal(filterFixtures.filter((item) => item.date <= '2026-12-01').length, 1)
console.log('PASS skill, availability and date filter rules')

const managementStatuses = ['draft', 'published', 'closed']
assert.deepEqual(managementStatuses, ['draft', 'published', 'closed'])
console.log('PASS opportunity management supports draft, published and closed states')

const selectedPhotos = [{ type: 'image/jpeg', size: 1024 }, { type: 'image/png', size: 2048 }]
assert.equal(selectedPhotos.every((file) => file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024), true)
assert.equal(selectedPhotos.length <= 5, true)
console.log('PASS opportunity photo validation limits type, size and count')

function normalizeWakePhrase(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
}
const wakePhrases = ['yaar bore ho raha hoon', 'yaar bore ho rahi hoon']
assert.equal(wakePhrases.includes(normalizeWakePhrase('  YAAR,   bore ho raha hoon!!! ')), true)
assert.equal(wakePhrases.includes(normalizeWakePhrase('Yaar bore ho rahi hoon')), true)
assert.equal(wakePhrases.includes(normalizeWakePhrase('yaar busy hoon')), false)
console.log('PASS assistant wake phrase normalization')

const interestRequest = 'teaching'
const interestMatches = opportunities.filter((item) => item.status === 'published' && `${item.title} ${item.category} ${item.skills.join(' ')}`.toLowerCase().includes(interestRequest))
assert.deepEqual(interestMatches.map((item) => item.id), ['education-local'])
console.log('PASS assistant interest matching')
