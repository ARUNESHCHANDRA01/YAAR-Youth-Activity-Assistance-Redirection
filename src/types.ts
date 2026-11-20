export type Role = 'volunteer' | 'organization' | 'administrator'
export type OpportunityStatus = 'published' | 'draft' | 'closed'
export type OpportunityReviewStatus = 'pending' | 'approved' | 'rejected'
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'completed'

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

export type Store = {
  profiles: Profile[]
  opportunities: Opportunity[]
  applications: Application[]
  saved: string[]
}
