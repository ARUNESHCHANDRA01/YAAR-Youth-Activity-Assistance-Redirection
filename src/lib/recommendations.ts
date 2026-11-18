import type { Opportunity, Profile } from '../types'

export type Recommendation = Opportunity & { score: number; reason: string }

export function recommend(profile: Profile, opportunities: Opportunity[]): Recommendation[] {
  return opportunities
    .filter((item) => item.status === 'published')
    .map((item) => {
      const interest = profile.interests.some((x) => item.category.toLowerCase().includes(x.toLowerCase()) || x.toLowerCase().includes(item.category.toLowerCase()))
      const skill = item.skills.some((x) => profile.skills.some((y) => x.toLowerCase().includes(y.toLowerCase()) || y.toLowerCase().includes(x.toLowerCase())))
      const local = item.location.toLowerCase().includes(profile.location.split(',')[0].toLowerCase()) || profile.location.toLowerCase().includes(item.location.split(',')[0].toLowerCase())
      const score = (interest ? 45 : 0) + (skill ? 30 : 0) + (local ? 20 : 0) + (profile.availability === 'Flexible' ? 5 : 0)
      const reason = interest && skill ? 'Matches your interests and skills' : interest ? `Aligned with your interest in ${item.category.toLowerCase()}` : skill ? 'Uses skills already on your profile' : local ? 'A practical option near your location' : 'A chance to explore something new'
      return { ...item, score, reason }
    })
    .sort((a, b) => b.score - a.score)
}
