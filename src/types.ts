export type Role = 'volunteer' | 'organization' | 'administrator'
export type OpportunityStatus = 'published' | 'draft' | 'closed'
export type OpportunityReviewStatus = 'pending' | 'approved' | 'rejected'
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'completed'
export type RewardType = 'none' | 'cash' | 'credits' | 'perks' | 'cash_and_perks'
export type CashRewardStatus = 'available' | 'requested' | 'paid'
export type PerkRewardStatus = 'available' | 'redeemed'
export type RedemptionKind = 'cash' | 'perk'
export type RedemptionStatus = 'requested' | 'approved' | 'completed'

export type Profile = {
  id: string
  name: string
  email: string
  role: Role
  bio: string
  location: string
  interests: string[]
  skills: string[]
  availability: string
  experience: string
  completion: number
}

export type Organization = {
  id: string
  ownerId: string
  name: string
  description: string
  location: string
  verified: boolean
}

export type Opportunity = {
  id: string
  title: string
  organization: string
  organizationId: string
  description: string
  category: string
  location: string
  date: string
  timeCommitment: string
  deadline: string
  skills: string[]
  availability?: string
  contactEmail?: string
  imageUrls?: string[]
  rewardType?: RewardType
  totalBudget?: number
  budgetCurrency?: string
  creditReward?: number
  perkDescription?: string
  capacity: number
  applicants: number
  status: OpportunityStatus
  reviewStatus?: OpportunityReviewStatus
  createdBy?: string
  featured?: boolean
  accent: string
}

export type Application = {
  id: string
  opportunityId: string
  volunteerId: string
  createdAt: string
  status: ApplicationStatus
}

export type CashReward = {
  id: string
  volunteerId: string
  opportunityId: string
  amount: number
  currency: string
  status: CashRewardStatus
  note: string
  createdAt: string
  paidAt?: string
}

export type PerkReward = {
  id: string
  volunteerId: string
  opportunityId: string
  title: string
  description: string
  credits: number
  status: PerkRewardStatus
  createdAt: string
  redeemedAt?: string
}

export type RewardRedemption = {
  id: string
  volunteerId: string
  rewardId: string
  kind: RedemptionKind
  status: RedemptionStatus
  note: string
  createdAt: string
}

export type Store = {
  profiles: Profile[]
  organizations: Organization[]
  opportunities: Opportunity[]
  applications: Application[]
  saved: string[]
  cashRewards: CashReward[]
  perkRewards: PerkReward[]
  redemptions: RewardRedemption[]
}
