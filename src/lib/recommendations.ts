import type { Opportunity, Profile } from '../types'
import { supabase } from './supabase'

export type Recommendation = Opportunity & { score: number; reason: string }
export type RecommendationSource = 'openai' | 'fallback' | 'empty' | 'loading'
export type RecommendationResult = { recommendations: Recommendation[]; source: Exclude<RecommendationSource, 'loading'> }

function normalizeMatchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function matchesInterest(query: string, opportunity: Opportunity) {
  const terms = normalizeMatchText(query).split(' ').filter((term) => term.length >= 3)
  const searchable = normalizeMatchText(`${opportunity.title} ${opportunity.category} ${opportunity.description} ${opportunity.skills.join(' ')}`)
  return terms.some((term) => searchable.includes(term))
}

export function hasInterestMatch(interest: string, opportunities: Opportunity[]) {
  return opportunities.some((item) => isEligibleOpportunity(item) && matchesInterest(interest, item))
}

export function isOpportunityNearby(profileLocation: string, opportunityLocation: string) {
  const profileParts = normalizeMatchText(profileLocation).split(' ').filter((part) => part.length >= 3)
  const opportunityParts = normalizeMatchText(opportunityLocation).split(' ').filter((part) => part.length >= 3)
  return Boolean(profileParts.length && opportunityParts.length && profileParts.some((part) => opportunityParts.includes(part)))
}

function isEligibleOpportunity(item: Opportunity) {
  const deadlinePassed = item.deadline ? item.deadline < new Date().toISOString().slice(0, 10) : false
  const isFull = typeof item.capacity === 'number' && typeof item.applicants === 'number' && item.capacity <= item.applicants
  return item.status === 'published' && (item.reviewStatus === undefined || item.reviewStatus === 'approved') && !deadlinePassed && !isFull
}

export function recommend(profile: Profile, opportunities: Opportunity[]): Recommendation[] {
  return opportunities
    .filter(isEligibleOpportunity)
    .map((item) => {
      const interest = profile.interests.some((x) => matchesInterest(x, item))
      const skill = item.skills.some((x) => profile.skills.some((y) => x.toLowerCase().includes(y.toLowerCase()) || y.toLowerCase().includes(x.toLowerCase())))
      const local = isOpportunityNearby(profile.location, item.location)
      const score = (interest ? 45 : 0) + (skill ? 30 : 0) + (local ? 20 : 0) + (profile.availability === 'Flexible' ? 5 : 0)
      const reason = interest && skill ? 'Matches your interests and skills' : interest ? `Aligned with your interest in ${item.category.toLowerCase()}` : skill ? 'Uses skills already on your profile' : local ? 'A practical option near your location' : 'A chance to explore something new'
      return { ...item, score, reason }
    })
    .sort((a, b) => b.score - a.score)
}

export function recommendForInterest(profile: Profile, opportunities: Opportunity[], interest: string): Recommendation[] {
  return recommend({ ...profile, interests: [interest, ...profile.interests] }, opportunities)
}

export function mergeAIRecommendations(opportunities: Opportunity[], payload: unknown): Recommendation[] {
  if (!payload || typeof payload !== 'object') return []
  const raw = (payload as { recommendations?: unknown }).recommendations
  if (!Array.isArray(raw)) return []
  const byId = new Map(opportunities.filter(isEligibleOpportunity).map((item) => [item.id, item]))
  const seen = new Set<string>()
  const merged: Recommendation[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const candidate = item as { opportunity_id?: unknown; score?: unknown; reason?: unknown }
    const id = typeof candidate.opportunity_id === 'string' ? candidate.opportunity_id : ''
    const score = typeof candidate.score === 'number' && Number.isFinite(candidate.score) ? candidate.score : NaN
    const reason = typeof candidate.reason === 'string' ? candidate.reason.trim() : ''
    const opportunity = byId.get(id)
    if (!opportunity || seen.has(id) || !Number.isFinite(score) || !reason) continue
    seen.add(id)
    merged.push({ ...opportunity, score: Math.round(Math.max(0, Math.min(100, score))), reason: reason.slice(0, 100) })
    if (merged.length === 5) break
  }
  return merged
}

export async function recommendWithAI(profile: Profile, opportunities: Opportunity[], interest = ''): Promise<RecommendationResult> {
  const fallback = interest.trim() ? recommendForInterest(profile, opportunities, interest) : recommend(profile, opportunities)
  if (!supabase) return { recommendations: fallback, source: 'fallback' }

  const candidates = opportunities
    .filter(isEligibleOpportunity)
    .slice(0, 40)
    .map((item) => ({ id: item.id, title: item.title, category: item.category, location: item.location, skills: item.skills, date: item.date, deadline: item.deadline, availability: item.availability ?? 'Flexible', capacity: item.capacity, applicants: item.applicants }))
  if (!candidates.length) return { recommendations: [], source: 'empty' }

  try {
    const { data, error } = await supabase.functions.invoke('recommend-opportunities', {
      body: {
        interest: interest.trim(),
        profile: { interests: profile.interests, skills: profile.skills, location: profile.location, availability: profile.availability },
        opportunities: candidates,
      },
    })
    if (error) throw error
    const recommendations = mergeAIRecommendations(opportunities, data)
    return recommendations.length ? { recommendations, source: 'openai' } : { recommendations: fallback, source: 'fallback' }
  } catch {
    return { recommendations: fallback, source: 'fallback' }
  }
}
