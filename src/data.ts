import type { Application, CashReward, Opportunity, Organization, PerkReward, Profile, RewardRedemption, Store } from './types'

export const categories = ['Environment', 'Education', 'Health', 'Community', 'Technology', 'Animal welfare']

export const demoProfiles: Profile[] = [
  {
    id: 'volunteer-arunesh', name: 'Arunesh Chandra', email: 'arunesh@example.com', role: 'volunteer',
    bio: 'Computer science student who enjoys making small, useful changes in the community.', location: 'Greater Noida',
    interests: ['Education', 'Technology', 'Environment'], skills: ['Web development', 'Teaching', 'Communication'],
    availability: 'Weekends', experience: 'Intermediate', completion: 86,
  },
  {
    id: 'org-greensteps', name: 'GreenSteps Foundation', email: 'hello@greensteps.org', role: 'organization',
    bio: 'Local community organization creating hands-on environmental action.', location: 'Greater Noida',
    interests: ['Environment', 'Community'], skills: ['Project management'], availability: 'Flexible', experience: 'Expert', completion: 92,
  },
  {
    id: 'admin-yaar', name: 'Y.A.A.R. Administrator', email: 'admin@yaar.local', role: 'administrator',
    bio: 'Platform administrator.', location: 'India', interests: [], skills: [], availability: 'Flexible', experience: 'Expert', completion: 100,
  },
]

export const demoOrganizations: Organization[] = [
  { id: 'org-greensteps-record', ownerId: 'org-greensteps', name: 'GreenSteps Foundation', description: 'Local community organization creating hands-on environmental action.', location: 'Greater Noida', verified: true },
  { id: 'org-udaan-record', ownerId: 'org-udaan', name: 'Udaan Learning Centre', description: 'A learning space helping young people build confidence through practical education.', location: 'Noida', verified: true },
]

export const demoOpportunities: Opportunity[] = [
  { id: 'opp-1', title: 'Yamuna Clean-up Drive', organization: 'GreenSteps Foundation', organizationId: 'org-greensteps', description: 'Join a friendly weekend clean-up and help restore a local stretch of the Yamuna. Gloves, safety briefing and refreshments are provided.', category: 'Environment', location: 'Greater Noida', date: '2026-12-06', timeCommitment: '4 hours', deadline: '2026-12-03', skills: ['Teamwork', 'Physical activity'], rewardType: 'cash_and_perks', totalBudget: 12000, budgetCurrency: 'INR', creditReward: 120, perkDescription: 'Gloves, refreshments and a participation certificate', capacity: 24, applicants: 16, status: 'published', featured: true, accent: 'mint' },
  { id: 'opp-2', title: 'Code for Classrooms', organization: 'Udaan Learning Centre', organizationId: 'org-udaan', description: 'Teach middle-school learners the basics of web design through playful, project-based sessions.', category: 'Education', location: 'Noida', date: '2026-12-12', timeCommitment: '3 hours / week', deadline: '2026-12-08', skills: ['Web development', 'Teaching'], rewardType: 'cash_and_perks', totalBudget: 8000, budgetCurrency: 'INR', creditReward: 150, perkDescription: 'Learning materials and a teaching certificate', capacity: 10, applicants: 7, status: 'published', featured: true, accent: 'yellow' },
  { id: 'opp-3', title: 'Digital Help Desk', organization: 'Saksham Senior Care', organizationId: 'org-saksham', description: 'Support older adults with everyday digital tasks like UPI, telemedicine and online safety.', category: 'Technology', location: 'Ghaziabad', date: '2026-12-19', timeCommitment: '2 hours', deadline: '2026-12-15', skills: ['Communication', 'Digital literacy'], rewardType: 'cash', totalBudget: 6000, budgetCurrency: 'INR', capacity: 12, applicants: 4, status: 'published', accent: 'blue' },
  { id: 'opp-4', title: 'Community Health Camp', organization: 'Sehat Saathi', organizationId: 'org-sehat', description: 'Help with registration, wayfinding and outreach at a free health screening camp for local families.', category: 'Health', location: 'Greater Noida', date: '2026-12-27', timeCommitment: '5 hours', deadline: '2026-12-22', skills: ['Communication', 'Organization'], rewardType: 'perks', creditReward: 80, perkDescription: 'Meal and local travel support', capacity: 18, applicants: 11, status: 'published', accent: 'coral' },
  { id: 'opp-5', title: 'Street Animal Care Day', organization: 'Paws & Care', organizationId: 'org-paws', description: 'Assist with feeding, basic care and adoption awareness for rescued street animals.', category: 'Animal welfare', location: 'Delhi NCR', date: '2027-01-03', timeCommitment: '4 hours', deadline: '2026-12-29', skills: ['Animal care'], rewardType: 'cash_and_perks', totalBudget: 7500, budgetCurrency: 'INR', creditReward: 100, perkDescription: 'Certificate and pet-care kit', capacity: 15, applicants: 9, status: 'published', accent: 'purple' },
  { id: 'opp-6', title: 'Neighbourhood Library Setup', organization: 'ReadForward', organizationId: 'org-readforward', description: 'Sort donated books and help a resident-led library create a welcoming reading corner.', category: 'Community', location: 'Noida', date: '2026-12-13', timeCommitment: '3 hours', deadline: '2026-12-10', skills: ['Organization'], rewardType: 'credits', creditReward: 100, perkDescription: 'Community reading certificate', capacity: 14, applicants: 5, status: 'published', accent: 'orange' },
]

export const demoApplications: Application[] = [
  { id: 'app-1', opportunityId: 'opp-2', volunteerId: 'volunteer-arunesh', createdAt: '2026-11-11', status: 'accepted' },
  { id: 'app-2', opportunityId: 'opp-4', volunteerId: 'volunteer-arunesh', createdAt: '2026-11-14', status: 'pending' },
]

export const demoCashRewards: CashReward[] = [
  { id: 'cash-demo-1', volunteerId: 'volunteer-arunesh', opportunityId: 'opp-2', amount: 800, currency: 'INR', status: 'available', note: 'Manual payout arranged with the opportunity coordinator.', createdAt: '2026-11-20' },
  { id: 'cash-demo-2', volunteerId: 'volunteer-arunesh', opportunityId: 'opp-1', amount: 500, currency: 'INR', status: 'paid', note: 'Paid manually by the activity coordinator.', createdAt: '2026-11-18', paidAt: '2026-11-19' },
]

export const demoPerkRewards: PerkReward[] = [
  { id: 'perk-demo-1', volunteerId: 'volunteer-arunesh', opportunityId: 'opp-2', title: 'Teaching credits', description: 'Redeemable credits for your Y.A.A.R. contribution.', credits: 150, status: 'available', createdAt: '2026-11-20' },
  { id: 'perk-demo-2', volunteerId: 'volunteer-arunesh', opportunityId: 'opp-4', title: 'Community health support', description: 'Meal and local travel support from the activity coordinator.', credits: 80, status: 'available', createdAt: '2026-11-20' },
]

export const demoRedemptions: RewardRedemption[] = []

export const initialStore: Store = { profiles: demoProfiles, organizations: demoOrganizations, opportunities: demoOpportunities, applications: demoApplications, saved: ['opp-1', 'opp-5'], cashRewards: demoCashRewards, perkRewards: demoPerkRewards, redemptions: demoRedemptions }

export function loadStore(): Store {
  try {
    const stored = localStorage.getItem('yaar-demo-store')
    if (!stored) return initialStore
    const parsed = JSON.parse(stored) as Partial<Store>
    return { ...initialStore, ...parsed, organizations: parsed.organizations ?? initialStore.organizations, cashRewards: parsed.cashRewards ?? initialStore.cashRewards, perkRewards: parsed.perkRewards ?? initialStore.perkRewards, redemptions: parsed.redemptions ?? initialStore.redemptions }
  } catch { return initialStore }
}
