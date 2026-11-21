import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { ApplicationStatus, Opportunity, OpportunityReviewStatus, Organization, Profile, Store } from '../types'

type OpportunityRow = {
  id: string
  organization_id: string | null
  title: string
  description: string
  category: string
  location: string
  activity_date: string
  time_commitment: string
  application_deadline: string
  required_skills: string[] | null
  availability?: string | null
  volunteer_capacity: number
  contact_email?: string | null
  image_urls?: string[] | null
  status: Opportunity['status']
  review_status?: OpportunityReviewStatus
  created_by?: string | null
  partner_name?: string | null
  featured?: boolean | null
  organizations?: { name?: string; owner_id?: string } | { name?: string; owner_id?: string }[] | null
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  return supabase
}

function completion(profile: Pick<Profile, 'name' | 'bio' | 'location' | 'interests' | 'skills' | 'availability'>) {
  const filled = [profile.name, profile.bio, profile.location, profile.interests.length, profile.skills.length, profile.availability].filter(Boolean).length
  return Math.min(100, Math.round((filled / 6) * 100))
}

function normalizeRole(value: unknown): Profile['role'] {
  return value === 'organization' || value === 'administrator' ? value : 'volunteer'
}

export function profileFromRow(row: Record<string, unknown>, emailFallback = ''): Profile {
  const profile = {
    id: String(row.id), name: String(row.name ?? 'Y.A.A.R. user'), email: String(row.email ?? emailFallback), role: normalizeRole(row.role),
    bio: String(row.bio ?? ''), location: String(row.location ?? ''), interests: Array.isArray(row.interests) ? row.interests.map(String) : [],
    skills: Array.isArray(row.skills) ? row.skills.map(String) : [], availability: String(row.availability ?? 'Flexible'), experience: String(row.experience ?? 'Beginner'), completion: 0,
  }
  return { ...profile, completion: completion(profile) }
}

export async function profileForSession(session: Session): Promise<Profile> {
  const client = requireClient()
  const { data, error } = await client.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
  if (error) throw error
  if (data) return profileFromRow(data as Record<string, unknown>, session.user.email ?? '')
  const fallback = { id: session.user.id, name: String(session.user.user_metadata?.full_name ?? session.user.email?.split('@')[0] ?? 'Y.A.A.R. user'), email: session.user.email ?? '', role: 'volunteer' as const, bio: '', location: '', interests: [], skills: [], availability: 'Flexible', experience: 'Beginner', completion: 0 }
  const { data: created, error: createError } = await client.from('profiles').insert({ id: fallback.id, name: fallback.name, email: fallback.email, role: fallback.role }).select('*').single()
  if (createError) throw createError
  return profileFromRow(created as Record<string, unknown>, fallback.email)
}

function opportunityFromRow(row: OpportunityRow): Opportunity {
  const organization = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations
  return { id: row.id, title: row.title, organization: row.partner_name ?? organization?.name ?? 'Volunteer proposal', organizationId: organization?.owner_id ?? row.organization_id ?? '', description: row.description, category: row.category, location: row.location, date: row.activity_date, timeCommitment: row.time_commitment, deadline: row.application_deadline, skills: row.required_skills ?? [], availability: row.availability ?? 'Flexible', contactEmail: row.contact_email ?? undefined, imageUrls: row.image_urls ?? [], capacity: row.volunteer_capacity, applicants: 0, status: row.status, reviewStatus: row.review_status ?? (row.status === 'published' ? 'approved' : 'pending'), createdBy: row.created_by ?? undefined, featured: Boolean(row.featured), accent: accentForCategory(row.category) }
}

function accentForCategory(category: string) {
  const value = category.toLowerCase()
  if (value.includes('education')) return 'yellow'
  if (value.includes('technology')) return 'blue'
  if (value.includes('health')) return 'coral'
  if (value.includes('animal')) return 'purple'
  if (value.includes('community')) return 'orange'
  return 'green'
}

export async function loadLiveStore(profile: Profile | null): Promise<Store> {
  const client = requireClient()
  const { data: organizationRows, error: organizationError } = await client.from('organizations').select('id, owner_id, name, description, location, verified')
  if (organizationError) throw organizationError
  const organizations: Organization[] = (organizationRows ?? []).map((row) => ({ id: String(row.id), ownerId: String(row.owner_id), name: String(row.name), description: String(row.description ?? ''), location: String(row.location ?? ''), verified: Boolean(row.verified) }))
  const { data: opportunityRows, error: opportunityError } = await client.from('opportunities').select('*, organizations(name, owner_id)').order('activity_date', { ascending: true })
  if (opportunityError) throw opportunityError
  const opportunities = ((opportunityRows ?? []) as OpportunityRow[]).map(opportunityFromRow)
  const applications: Store['applications'] = []
  const profiles: Profile[] = profile ? [profile] : []
  if (profile) {
    const { data: applicationRows, error: applicationError } = await client.from('applications').select('id, opportunity_id, volunteer_id, created_at, status')
    if (applicationError) throw applicationError
    for (const row of (applicationRows ?? []) as Array<Record<string, unknown>>) applications.push({ id: String(row.id), opportunityId: String(row.opportunity_id), volunteerId: String(row.volunteer_id), createdAt: String(row.created_at).slice(0, 10), status: row.status as ApplicationStatus })
    const applicantIds = [...new Set(applications.map((application) => application.volunteerId).filter((id) => id !== profile.id))]
    if (applicantIds.length && (profile.role === 'organization' || profile.role === 'administrator')) {
      const { data: applicantRows } = await client.from('profiles').select('*').in('id', applicantIds)
      for (const row of (applicantRows ?? []) as Array<Record<string, unknown>>) profiles.push(profileFromRow(row))
    }
    const creatorIds = [...new Set(opportunities.map((opportunity) => opportunity.createdBy).filter((id): id is string => Boolean(id)))]
    if (creatorIds.length && profile.role === 'administrator') {
      const { data: creatorRows } = await client.from('profiles').select('*').in('id', creatorIds)
      for (const row of (creatorRows ?? []) as Array<Record<string, unknown>>) profiles.push(profileFromRow(row))
      const creatorNames = new Map(profiles.map((item) => [item.id, item.name]))
      for (const opportunity of opportunities) if (!opportunity.organizationId && opportunity.createdBy) opportunity.organization = creatorNames.get(opportunity.createdBy) ?? 'Volunteer proposal'
    }
    const counts = new Map<string, number>()
    for (const application of applications) if (application.status !== 'withdrawn') counts.set(application.opportunityId, (counts.get(application.opportunityId) ?? 0) + 1)
    for (const opportunity of opportunities) opportunity.applicants = counts.get(opportunity.id) ?? 0
  }
  let saved: string[] = []
  if (profile?.role === 'volunteer') {
    const { data: savedRows, error: savedError } = await client.from('saved_opportunities').select('opportunity_id')
    if (savedError) throw savedError
    saved = (savedRows ?? []).map((row) => String((row as Record<string, unknown>).opportunity_id))
  }
  return { profiles, organizations, opportunities, applications, saved }
}

export async function updateLiveProfile(userId: string, data: Partial<Profile>) {
  const client = requireClient()
  const { data: row, error } = await client.from('profiles').update({ name: data.name, bio: data.bio, location: data.location, interests: data.interests, skills: data.skills, availability: data.availability, experience: data.experience }).eq('id', userId).select('*').single()
  if (error) throw error
  return profileFromRow(row as Record<string, unknown>)
}

export async function createLiveApplication(opportunityId: string, volunteerId: string) {
  const client = requireClient()
  const { error } = await client.from('applications').insert({ opportunity_id: opportunityId, volunteer_id: volunteerId })
  if (error) throw error
}

export async function updateLiveApplication(applicationId: string, status: ApplicationStatus) {
  const client = requireClient()
  const { error } = await client.from('applications').update({ status }).eq('id', applicationId)
  if (error) throw error
}

export async function saveLiveOpportunity(opportunityId: string, volunteerId: string, saved: boolean) {
  const client = requireClient()
  if (saved) {
    const { error } = await client.from('saved_opportunities').delete().eq('opportunity_id', opportunityId).eq('volunteer_id', volunteerId)
    if (error) throw error
  } else {
    const { error } = await client.from('saved_opportunities').insert({ opportunity_id: opportunityId, volunteer_id: volunteerId })
    if (error) throw error
  }
}

export async function createLiveOpportunity(opportunity: Opportunity, ownerId: string, ownerRole: Profile['role']) {
  const client = requireClient()
  let organizationId: string | null = null
  if (ownerRole === 'organization') {
    const { data: organization, error: organizationError } = await client.from('organizations').select('id').eq('owner_id', ownerId).single()
    if (organizationError) throw organizationError
    organizationId = organization.id
  }
  const { data: row, error } = await client.from('opportunities').insert({ organization_id: organizationId, created_by: ownerId, title: opportunity.title, description: opportunity.description, category: opportunity.category, location: opportunity.location, activity_date: opportunity.date, time_commitment: opportunity.timeCommitment, application_deadline: opportunity.deadline, required_skills: opportunity.skills, availability: opportunity.availability ?? 'Flexible', contact_email: opportunity.contactEmail ?? null, image_urls: [], volunteer_capacity: opportunity.capacity, status: ownerRole === 'volunteer' ? 'draft' : opportunity.status, review_status: ownerRole === 'volunteer' ? 'pending' : 'approved' }).select('id').single()
  if (error) throw error
  return String(row.id)
}

export async function updateLiveOpportunity(opportunity: Opportunity, ownerId: string, ownerRole: Profile['role']) {
  const client = requireClient()
  let query = client.from('opportunities').update({ title: opportunity.title, description: opportunity.description, category: opportunity.category, location: opportunity.location, activity_date: opportunity.date, time_commitment: opportunity.timeCommitment, application_deadline: opportunity.deadline, required_skills: opportunity.skills, availability: opportunity.availability ?? 'Flexible', contact_email: opportunity.contactEmail ?? null, image_urls: opportunity.imageUrls ?? [], volunteer_capacity: opportunity.capacity, status: ownerRole === 'volunteer' ? 'draft' : opportunity.status, review_status: ownerRole === 'volunteer' ? 'pending' : (opportunity.reviewStatus ?? 'approved') }).eq('id', opportunity.id)
  if (ownerRole !== 'administrator') query = query.eq('created_by', ownerId)
  const { error } = await query
  if (error) throw error
}

export async function uploadLiveOpportunityImages(opportunityId: string, ownerId: string, ownerRole: Profile['role'], files: File[], existingUrls: string[]) {
  if (!files.length) return existingUrls
  const client = requireClient()
  const uploadedUrls: string[] = []
  for (const file of files) {
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-')
    const path = `${ownerId}/${opportunityId}/${crypto.randomUUID()}-${safeName}`
    const { error: uploadError } = await client.storage.from('opportunity-media').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || 'image/*' })
    if (uploadError) throw uploadError
    uploadedUrls.push(client.storage.from('opportunity-media').getPublicUrl(path).data.publicUrl)
  }
  const imageUrls = [...existingUrls, ...uploadedUrls]
  let query = client.from('opportunities').update({ image_urls: imageUrls }).eq('id', opportunityId)
  if (ownerRole !== 'administrator') query = query.eq('created_by', ownerId)
  const { error } = await query
  if (error) throw error
  return imageUrls
}

export async function deleteLiveOpportunity(opportunityId: string, ownerId: string, ownerRole: Profile['role']) {
  const client = requireClient()
  let query = client.from('opportunities').delete().eq('id', opportunityId)
  if (ownerRole !== 'administrator') query = query.eq('created_by', ownerId)
  const { error } = await query
  if (error) throw error
}

export async function updateLiveOrganization(ownerId: string, data: Pick<Organization, 'name' | 'description' | 'location'>) {
  const client = requireClient()
  const { data: row, error } = await client.from('organizations').update(data).eq('owner_id', ownerId).select('id, owner_id, name, description, location, verified').single()
  if (error) throw error
  return { id: String(row.id), ownerId: String(row.owner_id), name: String(row.name), description: String(row.description ?? ''), location: String(row.location ?? ''), verified: Boolean(row.verified) } satisfies Organization
}

export async function reviewLiveOpportunity(opportunityId: string, reviewStatus: OpportunityReviewStatus) {
  const client = requireClient()
  const { error } = await client.from('opportunities').update({ review_status: reviewStatus, status: reviewStatus === 'approved' ? 'published' : 'draft' }).eq('id', opportunityId)
  if (error) throw error
}
