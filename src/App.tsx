import { createContext, useContext, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Archive, ArrowRight, Award, BarChart3, Bell, BookOpen, BriefcaseBusiness, CalendarDays, Check, ChevronRight, Gift,
  CircleHelp, Clock3, Compass, Edit3, Filter, Heart, ImagePlus, Leaf, LogOut, MapPin, Menu, MessageCircle, Plus, Search,
  RotateCcw, Settings, ShieldCheck, Sparkles, Target, Trash2, TrendingUp, UserRound, Users, WalletCards, X, Zap,
} from 'lucide-react'
import { categories, initialStore, loadStore } from './data'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { createLiveApplication, createLiveCashReward, createLiveOpportunity, createLivePerkReward, createLiveRewardRedemption, deleteLiveOpportunity, loadLiveStore, profileForSession, reviewLiveOpportunity, saveLiveOpportunity, updateLiveApplication, updateLiveOpportunity, updateLiveOrganization, updateLiveProfile, uploadLiveOpportunityImages } from './lib/supabaseData'
import { hasInterestMatch, isOpportunityNearby, recommend, recommendWithAI, type Recommendation, type RecommendationSource } from './lib/recommendations'
import { formatCurrency, hasCashReward, hasPerkReward, rewardPerVolunteer, rewardTypeLabel } from './lib/rewards'
import type { ApplicationStatus, CashReward, Opportunity, PerkReward, Profile, RedemptionKind, RewardRedemption, RewardType, Role, Store } from './types'

type AppContextValue = {
  user: Profile | null
  store: Store
  login: (profile: Profile) => void
  logout: () => void
  showToast: (message: string, tone?: 'success' | 'error') => void
  apply: (opportunityId: string) => Promise<void>
  withdraw: (applicationId: string) => Promise<void>
  save: (opportunityId: string) => Promise<void>
  updateProfile: (data: Partial<Profile>) => Promise<void>
  addProfile: (profile: Profile) => void
  addOpportunity: (opportunity: Opportunity, files?: File[]) => Promise<void>
  updateOpportunity: (opportunityId: string, data: Partial<Opportunity>, files?: File[]) => Promise<void>
  deleteOpportunity: (opportunityId: string) => Promise<void>
  updateOrganization: (data: { name: string; description: string; location: string }) => Promise<void>
  updateApplication: (applicationId: string, status: ApplicationStatus) => Promise<void>
  reviewOpportunity: (opportunityId: string, reviewStatus: 'approved' | 'rejected') => Promise<void>
  requestRewardRedemption: (rewardId: string, kind: RedemptionKind) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)
const useApp = () => useContext(AppContext)!

function rewardCreatedAt() {
  return new Date().toISOString().slice(0, 10)
}

function rewardsForOpportunity(opportunity: Opportunity, volunteerId: string) {
  const createdAt = rewardCreatedAt()
  const cash: Omit<CashReward, 'id'> | null = hasCashReward(opportunity) ? { volunteerId, opportunityId: opportunity.id, amount: rewardPerVolunteer(opportunity), currency: opportunity.budgetCurrency ?? 'INR', status: 'available', note: 'Manual payout is coordinated directly with the opportunity coordinator.', createdAt } : null
  const perk: Omit<PerkReward, 'id'> | null = hasPerkReward(opportunity) ? { volunteerId, opportunityId: opportunity.id, title: opportunity.perkDescription?.trim() || `${opportunity.category} contribution perks`, description: opportunity.perkDescription?.trim() || 'Redeemable Y.A.A.R. contribution perks.', credits: opportunity.creditReward ?? 0, status: 'available', createdAt } : null
  return { cash, perk }
}

function App() {
  const [store, setStore] = useState<Store>(() => loadStore())
  const [user, setUser] = useState<Profile | null>(() => {
    if (isSupabaseConfigured) return null
    const id = localStorage.getItem('yaar-demo-session')
    return id ? loadStore().profiles.find((profile) => profile.id === id) ?? null : null
  })
  const [liveSession, setLiveSession] = useState(false)
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured)
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)

  useEffect(() => { if (!isSupabaseConfigured || !liveSession) localStorage.setItem('yaar-demo-store', JSON.stringify(store)) }, [store, liveSession])
  useEffect(() => { if (!isSupabaseConfigured || !liveSession) user ? localStorage.setItem('yaar-demo-session', user.id) : localStorage.removeItem('yaar-demo-session') }, [user, liveSession])
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(null), 3500); return () => window.clearTimeout(timer) }, [toast])

  useEffect(() => {
    if (!supabase) { setIsLoading(false); return }
    let cancelled = false
    const hydrate = async (session: Session | null) => {
      if (!session) {
        setLiveSession(false); setUser(null)
        try { const publicStore = await loadLiveStore(null); if (!cancelled) setStore(publicStore) } catch { /* public browsing can fall back to demo data */ }
        if (!cancelled) setIsLoading(false)
        return
      }
      try {
        const profile = await profileForSession(session)
        const nextStore = await loadLiveStore(profile)
        if (!cancelled) { setLiveSession(true); setUser(profile); setStore(nextStore); setIsLoading(false) }
      } catch (error) {
        if (!cancelled) { setLiveSession(false); setUser(null); setIsLoading(false); setToast({ message: friendlyError(error), tone: 'error' }) }
      }
    }
    void supabase.auth.getSession().then(({ data }) => hydrate(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { window.setTimeout(() => { void hydrate(session) }, 0) })
    return () => { cancelled = true; listener.subscription.unsubscribe() }
  }, [])

  const refreshLive = async (activeUser = user) => {
    if (!isSupabaseConfigured || !liveSession || !activeUser) return
    const nextStore = await loadLiveStore(activeUser)
    setStore(nextStore)
  }

  const value: AppContextValue = {
    user, store,
    login: (profile) => { setLiveSession(false); setStore(initialStore); setUser(profile) },
    logout: () => { if (supabase && liveSession) void supabase.auth.signOut(); setLiveSession(false); setUser(null) },
    showToast: (message, tone = 'success') => setToast({ message, tone }),
    apply: async (opportunityId) => {
      if (!user) return
      if (isSupabaseConfigured && liveSession) {
        try { await createLiveApplication(opportunityId, user.id); await refreshLive(); setToast({ message: 'Application sent. The organization will review it soon.', tone: 'success' }) } catch (error) { setToast({ message: friendlyError(error), tone: 'error' }) }
        return
      }
      setStore((current) => {
        const opportunity = current.opportunities.find((item) => item.id === opportunityId)
        const exists = current.applications.some((item) => item.opportunityId === opportunityId && item.volunteerId === user.id && item.status !== 'withdrawn')
        if (!opportunity || opportunity.status !== 'published' || exists) return current
        setToast({ message: 'Application sent. The organization will review it soon.', tone: 'success' })
        return { ...current, applications: [...current.applications, { id: `app-${Date.now()}`, opportunityId, volunteerId: user.id, createdAt: new Date().toISOString().slice(0, 10), status: 'pending' }], opportunities: current.opportunities.map((item) => item.id === opportunityId ? { ...item, applicants: item.applicants + 1 } : item) }
      })
    },
    withdraw: async (applicationId) => {
      if (isSupabaseConfigured && liveSession) { try { await updateLiveApplication(applicationId, 'withdrawn'); await refreshLive() } catch (error) { setToast({ message: friendlyError(error), tone: 'error' }) }; return }
      setStore((current) => ({ ...current, applications: current.applications.map((item) => item.id === applicationId ? { ...item, status: 'withdrawn' } : item) }))
    },
    save: async (opportunityId) => {
      if (!user) return
      if (isSupabaseConfigured && liveSession) { try { await saveLiveOpportunity(opportunityId, user.id, store.saved.includes(opportunityId)); await refreshLive() } catch (error) { setToast({ message: friendlyError(error), tone: 'error' }) }; return }
      setStore((current) => ({ ...current, saved: current.saved.includes(opportunityId) ? current.saved.filter((id) => id !== opportunityId) : [...current.saved, opportunityId] }))
    },
    updateProfile: async (data) => {
      if (!user) return
      if (isSupabaseConfigured && liveSession) { try { const next = await updateLiveProfile(user.id, data); setUser(next); await refreshLive(next); setToast({ message: 'Profile updated successfully.', tone: 'success' }) } catch (error) { setToast({ message: friendlyError(error), tone: 'error' }) }; return }
      const next = { ...user, ...data }; setStore((current) => ({ ...current, profiles: current.profiles.map((item) => item.id === user.id ? next : item) })); setUser(next); setToast({ message: 'Profile updated successfully.', tone: 'success' })
    },
    addProfile: (profile) => { setLiveSession(false); setStore((current) => ({ ...current, profiles: [...current.profiles, profile] })); setUser(profile) },
    addOpportunity: async (opportunity, files = []) => {
      if (user && isSupabaseConfigured && liveSession) { try { const createdId = await createLiveOpportunity(opportunity, user.id, user.role); if (files.length) await uploadLiveOpportunityImages(createdId, user.id, user.role, files, []); await refreshLive(); setToast({ message: user.role === 'volunteer' ? 'Opportunity submitted for administrator review.' : 'Opportunity saved as a draft.', tone: 'success' }) } catch (error) { setToast({ message: friendlyError(error), tone: 'error' }) }; return }
      try { const imageUrls = files.length ? await filesToDataUrls(files) : (opportunity.imageUrls ?? []); setStore((current) => ({ ...current, opportunities: [{ ...opportunity, imageUrls }, ...current.opportunities] })); setToast({ message: 'Opportunity saved as a draft.', tone: 'success' }) } catch (error) { setToast({ message: friendlyError(error), tone: 'error' }) }
    },
    updateOpportunity: async (opportunityId, data, files = []) => {
      if (!user) return
      const current = store.opportunities.find((item) => item.id === opportunityId)
      if (!current) return
      const next = { ...current, ...data }
      if (isSupabaseConfigured && liveSession) { try { await updateLiveOpportunity(next, user.id, user.role); if (files.length) await uploadLiveOpportunityImages(next.id, user.id, user.role, files, next.imageUrls ?? []); await refreshLive(); setToast({ message: next.status === 'published' ? 'Opportunity published.' : 'Opportunity updated.', tone: 'success' }) } catch (error) { setToast({ message: friendlyError(error), tone: 'error' }) }; return }
      try { const imageUrls = files.length ? [...(next.imageUrls ?? []), ...await filesToDataUrls(files)] : (next.imageUrls ?? []); setStore((state) => ({ ...state, opportunities: state.opportunities.map((item) => item.id === opportunityId ? { ...next, imageUrls } : item) })); setToast({ message: next.status === 'published' ? 'Opportunity published.' : 'Opportunity updated.', tone: 'success' }) } catch (error) { setToast({ message: friendlyError(error), tone: 'error' }) }
    },
    deleteOpportunity: async (opportunityId) => {
      if (!user) return
      if (isSupabaseConfigured && liveSession) { try { await deleteLiveOpportunity(opportunityId, user.id, user.role); await refreshLive(); setToast({ message: 'Opportunity deleted.', tone: 'success' }) } catch (error) { setToast({ message: friendlyError(error), tone: 'error' }) }; return }
      setStore((state) => ({ ...state, opportunities: state.opportunities.filter((item) => item.id !== opportunityId) })); setToast({ message: 'Opportunity deleted.', tone: 'success' })
    },
    updateOrganization: async (data) => {
      if (!user || user.role !== 'organization') return
      if (isSupabaseConfigured && liveSession) { try { const next = await updateLiveOrganization(user.id, data); await refreshLive(); setToast({ message: 'Organization details updated.', tone: 'success' }); void next } catch (error) { setToast({ message: friendlyError(error), tone: 'error' }) }; return }
      setStore((state) => { const exists = state.organizations.some((item) => item.ownerId === user.id); return { ...state, organizations: exists ? state.organizations.map((item) => item.ownerId === user.id ? { ...item, ...data } : item) : [...state.organizations, { id: `local-${user.id}`, ownerId: user.id, ...data, verified: false }], opportunities: state.opportunities.map((item) => item.organizationId === user.id ? { ...item, organization: data.name } : item) } }); setToast({ message: 'Organization details updated.', tone: 'success' })
    },
    updateApplication: async (applicationId, status) => {
      const application = store.applications.find((item) => item.id === applicationId)
      const opportunity = application ? store.opportunities.find((item) => item.id === application.opportunityId) : undefined
      const rewards = status === 'accepted' && opportunity && application ? rewardsForOpportunity(opportunity, application.volunteerId) : { cash: null, perk: null }
      if (isSupabaseConfigured && liveSession) { try { await updateLiveApplication(applicationId, status); if (rewards.cash) await createLiveCashReward(rewards.cash); if (rewards.perk) await createLivePerkReward(rewards.perk); await refreshLive(); setToast({ message: rewards.cash || rewards.perk ? `Application ${status}. Reward details are now available.` : `Application ${status}.`, tone: 'success' }) } catch (error) { setToast({ message: friendlyError(error), tone: 'error' }) }; return }
      setStore((current) => {
        const cashExists = rewards.cash && current.cashRewards.some((item) => item.volunteerId === rewards.cash?.volunteerId && item.opportunityId === rewards.cash?.opportunityId)
        const perkExists = rewards.perk && current.perkRewards.some((item) => item.volunteerId === rewards.perk?.volunteerId && item.opportunityId === rewards.perk?.opportunityId)
        return { ...current, applications: current.applications.map((item) => item.id === applicationId ? { ...item, status } : item), cashRewards: rewards.cash && !cashExists ? [...current.cashRewards, { ...rewards.cash, id: `cash-${Date.now()}` }] : current.cashRewards, perkRewards: rewards.perk && !perkExists ? [...current.perkRewards, { ...rewards.perk, id: `perk-${Date.now()}` }] : current.perkRewards }
      })
      setToast({ message: rewards.cash || rewards.perk ? `Application ${status}. Reward details are now available.` : `Application ${status}.`, tone: 'success' })
    },
    requestRewardRedemption: async (rewardId, kind) => {
      if (!user || user.role !== 'volunteer') return
      if (store.redemptions.some((item) => item.rewardId === rewardId && item.kind === kind && item.status !== 'completed')) { setToast({ message: 'This redemption request is already recorded.', tone: 'success' }); return }
      const redemption: Omit<RewardRedemption, 'id'> = { volunteerId: user.id, rewardId, kind, status: 'requested', note: kind === 'cash' ? 'Manual payout request. Coordinate directly with the opportunity coordinator.' : 'Perk redemption request recorded in Y.A.A.R.', createdAt: rewardCreatedAt() }
      if (isSupabaseConfigured && liveSession) { try { await createLiveRewardRedemption(redemption); await refreshLive(); setToast({ message: kind === 'cash' ? 'Cash redemption request sent to the opportunity coordinator.' : 'Perk redemption request recorded.', tone: 'success' }) } catch (error) { setToast({ message: friendlyError(error), tone: 'error' }) }; return }
      setStore((current) => ({ ...current, redemptions: [...current.redemptions, { ...redemption, id: `redemption-${Date.now()}` }] }))
      setToast({ message: kind === 'cash' ? 'Cash redemption request recorded for manual coordination.' : 'Perk redemption request recorded.', tone: 'success' })
    },
    reviewOpportunity: async (opportunityId, reviewStatus) => {
      if (isSupabaseConfigured && liveSession) { try { await reviewLiveOpportunity(opportunityId, reviewStatus); await refreshLive(); setToast({ message: reviewStatus === 'approved' ? 'Opportunity approved and published.' : 'Opportunity returned to the volunteer.', tone: 'success' }) } catch (error) { setToast({ message: friendlyError(error), tone: 'error' }) }; return }
      setStore((current) => ({ ...current, opportunities: current.opportunities.map((item) => item.id === opportunityId ? { ...item, reviewStatus, status: reviewStatus === 'approved' ? 'published' : 'draft' } : item) }))
    },
  }

  if (isLoading) return <div className="app-loading"><span className="brand-mark">Y</span><strong>Loading Y.A.A.R.</strong><small>Checking your session and opportunities...</small></div>

  return <AppContext.Provider value={value}>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <AuthScreen />} />
      <Route element={user ? <AppShell /> : <Navigate to="/login" replace />}>
        <Route path="/dashboard" element={<WorkspaceDashboard />} />
        <Route path="/opportunities" element={<OpportunityBrowserManaged />} />
        <Route path="/opportunities/:id/edit" element={<CreateOpportunityWithImages />} />
        <Route path="/opportunities/:id" element={<OpportunityDetailWithImages />} />
        <Route path="/applications" element={<ApplicationsPage />} />
        <Route path="/rewards" element={<RewardsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/create-opportunity" element={<CreateOpportunityWithImages />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/review" element={<AdminReviewPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
    {toast && <div className={`toast ${toast.tone}`} role="status"><Check size={16} />{toast.message}<button aria-label="Dismiss" onClick={() => setToast(null)}><X size={15} /></button></div>}
  </AppContext.Provider>
}

function Landing() {
  const { user, store } = useApp()
  return <div className="marketing-page">
    <header className="marketing-nav container"><Link className="brand" to="/"><span className="brand-mark">Y</span><span>Y.A.A.R.</span></Link><nav className="marketing-links"><a href="#how-it-works">How it works</a><a href="#why-yaar">Why Y.A.A.R.</a><Link to={user ? '/dashboard' : '/login'} className="button button-dark button-small">{user ? 'Open dashboard' : 'Sign in'} <ArrowRight size={15} /></Link></nav></header>
    <main>
      <section className="hero container">
        <div className="hero-copy"><div className="eyebrow"><span className="pulse-dot" /> MAKING PURPOSE PRACTICAL</div><h1>Turn your time into <em>real change.</em></h1><p className="hero-lede">Y.A.A.R. connects young people with volunteering, learning and community opportunities that make every hour count.</p><div className="hero-actions"><Link to="/login" className="button button-primary">Find your next opportunity <ArrowRight size={17} /></Link><a href="#how-it-works" className="text-link">See how it works <ChevronRight size={16} /></a></div><div className="hero-proof"><div className="avatar-stack"><span>AC</span><span>DV</span><span>MS</span><span>+</span></div><div><strong>Built for young changemakers</strong><small>Start small. Show up. Grow together.</small></div></div></div>
        <div className="hero-art"><div className="sun-circle" /><div className="hero-card main"><div className="hero-card-top"><span className="tag tag-green">FEATURED</span><Heart size={18} fill="currentColor" /></div><div className="illustration"><Leaf size={50} strokeWidth={1.4} /><div className="illustration-lines"><i /><i /><i /></div></div><h3>Yamuna Clean-up Drive</h3><p><MapPin size={14} /> Greater Noida <span>•</span> <CalendarDays size={14} /> Dec 06</p><div className="progress-row"><span>16 joined</span><span>24 spots</span></div><div className="progress"><i style={{ width: '67%' }} /></div></div><div className="floating-card top"><div className="floating-icon yellow"><Sparkles size={19} /></div><div><strong>+24 impact points</strong><small>Your actions add up</small></div></div><div className="floating-card bottom"><div className="floating-icon blue"><Users size={19} /></div><div><strong>2,840 young people</strong><small>are making a difference</small></div></div><div className="scribble">✳</div></div>
      </section>
      <section className="ticker"><div className="container ticker-inner"><span><Zap size={16} /> FIND YOUR DIRECTION</span><span><Heart size={16} /> HELP YOUR COMMUNITY</span><span><Target size={16} /> BUILD YOUR SKILLS</span><span><TrendingUp size={16} /> GROW WITH PURPOSE</span></div></section>
      <section className="section container" id="how-it-works"><div className="section-heading centered"><div className="eyebrow">A SIMPLE START</div><h2>One place for your <em>next good thing.</em></h2><p>From a first volunteer experience to a long-term community project, Y.A.A.R. helps you move from “I should” to “I did.”</p></div><div className="steps"><Step number="01" icon={<Compass />} title="Discover" text="Explore opportunities shaped around your interests, skills and availability." /><Step number="02" icon={<MessageCircle />} title="Connect" text="Apply directly to organizations doing work that matters locally." /><Step number="03" icon={<Award />} title="Grow" text="Build confidence, practical experience and a record of impact." /></div></section>
      <section className="why-section" id="why-yaar"><div className="container why-grid"><div><div className="eyebrow">WHY Y.A.A.R.</div><h2>Potential is everywhere.<br /><em>Direction makes it visible.</em></h2><p>Young people do not lack energy or ambition. They need accessible ways to put both into action — with people who make showing up feel possible.</p><Link to="/login" className="text-link">Join the movement <ArrowRight size={16} /></Link></div><div className="stat-grid"><div className="stat-tile large"><span className="tile-icon green"><Leaf /></span><strong>Meaningful</strong><p>community-led projects</p><div className="tile-doodle">↗</div></div><div className="stat-tile"><strong>6</strong><p>activity categories</p></div><div className="stat-tile dark"><strong>1</strong><p>clear next step</p></div></div></div></section>
      <section className="section container"><div className="section-heading split"><div><div className="eyebrow">A FEW PLACES TO START</div><h2>Opportunities with <em>momentum.</em></h2></div><Link to="/login" className="text-link">Browse all opportunities <ArrowRight size={16} /></Link></div><div className="opportunity-preview">{store.opportunities.slice(0, 3).map((item) => <OpportunityCard key={item.id} opportunity={item} />)}</div></section>
      <section className="cta-band"><div className="container cta-content"><span className="eyebrow">YOUR NEXT CHAPTER CAN START SMALL</span><h2>Ready to put your energy<br /><em>somewhere meaningful?</em></h2><Link to="/login" className="button button-dark">Create your free profile <ArrowRight size={17} /></Link></div></section>
    </main><footer className="footer container"><Link className="brand" to="/"><span className="brand-mark">Y</span><span>Y.A.A.R.</span></Link><span>© 2026 Youth Activity, Assistance & Redirection</span></footer>
  </div>
}

function Step({ number, icon, title, text }: { number: string; icon: ReactNode; title: string; text: string }) { return <div className="step"><div className="step-top"><span>{number}</span><span className="step-icon">{icon}</span></div><h3>{title}</h3><p>{text}</p></div> }

function AuthScreen() {
  const { addProfile } = useApp()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const live = Boolean(isSupabaseConfigured && supabase)
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setMessage('')
    if (!email.includes('@') || password.length < 6) { setError('Enter a valid email and a password with at least 6 characters.'); return }
    if (live && supabase) {
      if (mode === 'register') {
        if (!name.trim()) { setError('Enter your name to create a profile.'); return }
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name.trim() } } })
        if (signUpError) { setError(friendlyError(signUpError)); return }
        if (data.session) { setMessage('Account created. Loading your Y.A.A.R. profile...'); navigate('/dashboard', { replace: true }) }
        else setMessage('Account created. Check your email (including your Spam folder) to confirm your account, then sign in.')
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) setError(friendlyError(signInError))
        else navigate('/dashboard', { replace: true })
      }
      return
    }
    if (mode === 'register') {
      if (!name.trim()) { setError('Enter your name and a valid email address.'); return }
      const profile: Profile = { id: `volunteer-${Date.now()}`, name, email, role: 'volunteer', bio: '', location: 'Greater Noida', interests: ['Community'], skills: [], availability: 'Weekends', experience: 'Beginner', completion: 38 }
      addProfile(profile)
    }
  }

  const resetPassword = async () => {
    setError(''); setMessage('')
    if (!live || !supabase) { setError('Password reset requires Supabase authentication.'); return }
    if (!email.includes('@')) { setError('Enter your email address first.'); return }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` })
    if (resetError) setError(friendlyError(resetError)); else setMessage('Password reset instructions have been sent if the account exists.')
  }

  const signInWithGoogle = async () => {
    setError(''); setMessage('')
    if (!live || !supabase) { setError('Google sign-in requires Supabase authentication.'); return }
    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (googleError) setError(friendlyError(googleError))
  }

  return <div className="auth-page"><Link to="/" className="brand auth-brand"><span className="brand-mark">Y</span><span>Y.A.A.R.</span></Link><div className="auth-layout"><div className="auth-intro"><div className="eyebrow">WELCOME TO Y.A.A.R.</div><h1>Your next good thing is closer than you think.</h1><p>Sign in to discover opportunities, track your applications and keep growing with purpose.</p></div><div className="auth-card"><div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); setMessage('') }}>Sign in</button><button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(''); setMessage('') }}>Create profile</button></div><form onSubmit={submit}><div className="form-heading"><h2>{mode === 'login' ? 'Welcome back' : 'Create your profile'}</h2><p>{mode === 'login' ? 'Sign in with your Y.A.A.R. account.' : 'Create a volunteer account with Y.A.A.R.'}</p></div>{mode === 'register' && <label>Full name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" /></label>}<label>Email address<input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" /></label><label>Password<input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" type="password" /></label>{error && <p className="form-error">{error}</p>}{message && <p className="form-success">{message}</p>}<button className="button button-primary full" type="submit">{mode === 'login' ? 'Sign in securely' : 'Create volunteer account'} <ArrowRight size={16} /></button>{mode === 'login' && <button type="button" className="text-link auth-reset" onClick={() => void resetPassword()}>Forgot password?</button>}</form><div className="form-divider"><span>or continue with</span></div><button type="button" className="button button-light full google-button" onClick={() => void signInWithGoogle()}><span className="google-mark">G</span> Continue with Google</button></div></div><p className="auth-footer">Y.A.A.R. • Youth Activity, Assistance & Redirection</p></div>
}

function AppShell() {
  const { user, logout } = useApp(); const [mobileNav, setMobileNav] = useState(false); const navigate = useNavigate()
  const nav = user?.role === 'volunteer' ? [{ to: '/dashboard', label: 'Overview', icon: <BarChart3 /> }, { to: '/opportunities', label: 'Discover', icon: <Compass /> }, { to: '/create-opportunity', label: 'Submit opportunity', icon: <Plus /> }, { to: '/applications', label: 'My applications', icon: <BriefcaseBusiness /> }, { to: '/rewards', label: 'Your rewards', icon: <Award /> }, { to: '/profile', label: 'My profile', icon: <UserRound /> }] : user?.role === 'organization' ? [{ to: '/dashboard', label: 'Overview', icon: <BarChart3 /> }, { to: '/opportunities', label: 'My opportunities', icon: <BriefcaseBusiness /> }, { to: '/applications', label: 'Applicants', icon: <Users /> }, { to: '/create-opportunity', label: 'Create opportunity', icon: <Plus /> }] : [{ to: '/admin', label: 'Overview', icon: <BarChart3 /> }, { to: '/admin/review', label: 'Review submissions', icon: <Check /> }, { to: '/opportunities', label: 'All opportunities', icon: <Compass /> }, { to: '/applications', label: 'Applications', icon: <BriefcaseBusiness /> }]
  return <div className="app-shell"><aside className={`sidebar ${mobileNav ? 'open' : ''}`}><div className="sidebar-top"><Link className="brand" to="/dashboard"><span className="brand-mark">Y</span><span>Y.A.A.R.</span></Link><button className="close-mobile" onClick={() => setMobileNav(false)}><X /></button></div><div className="workspace-label">{user?.role === 'volunteer' ? 'VOLUNTEER SPACE' : user?.role === 'organization' ? 'ORGANIZATION SPACE' : 'ADMIN SPACE'}</div><nav className="side-nav">{nav.map((item) => <NavLink key={item.to} to={item.to} onClick={() => setMobileNav(false)} className={({ isActive }) => isActive ? 'active' : ''}>{item.icon}<span>{item.label}</span></NavLink>)}</nav><div className="sidebar-bottom"><div className="help-box"><CircleHelp size={17} /><div><strong>Need a hand?</strong><small>We’re here to help.</small></div></div><button className="side-logout" onClick={() => { logout(); navigate('/') }}><LogOut size={17} /> Sign out</button></div></aside><div className="main-area"><header className="app-header"><button className="mobile-menu" onClick={() => setMobileNav(true)}><Menu /></button><div className="header-title"><span className="mobile-brand">Y.A.A.R.</span><span className="header-date">Tuesday, 18 November 2026</span></div><div className="header-actions"><button aria-label="Notifications" className="icon-button"><Bell size={19} /><i /></button><div className="user-chip"><span className={`role-avatar ${user?.role}`}>{user?.name.slice(0, 1)}</span><span><strong>{user?.name.split(' ')[0]}</strong><small>{user?.role}</small></span></div></div></header><div className="page-content"><Outlet /></div></div></div>
}

function Dashboard() {
  const { user, store } = useApp(); const navigate = useNavigate(); const profile = user!; const apps = store.applications.filter((app) => app.volunteerId === profile.id && app.status !== 'withdrawn'); const fallbackRecommendations = recommend(profile, store.opportunities); const [recommendations, setRecommendations] = useState(fallbackRecommendations); const [recommendationSource, setRecommendationSource] = useState<RecommendationSource>(isSupabaseConfigured && profile.role === 'volunteer' ? 'loading' : 'fallback'); const ownOpps = store.opportunities.filter((item) => item.organizationId === profile.id); const myApplicants = store.applications.filter((app) => ownOpps.some((item) => item.id === app.opportunityId));
  useEffect(() => {
    setRecommendations(fallbackRecommendations)
    if (!isSupabaseConfigured || profile.role !== 'volunteer') { setRecommendationSource('fallback'); return }
    let cancelled = false
    setRecommendationSource('loading')
    void recommendWithAI(profile, store.opportunities).then((result) => {
      if (!cancelled) { setRecommendations(result.recommendations); setRecommendationSource(result.source) }
    })
    return () => { cancelled = true }
  }, [profile.id, profile.role, profile.location, profile.availability, profile.interests.join('|'), profile.skills.join('|'), store.opportunities])
  if (profile.role === 'administrator') return <AdminPage />
  if (profile.role === 'organization') return <div className="dashboard-page"><PageIntro eyebrow="ORGANIZATION OVERVIEW" title={`Good morning, ${profile.name.split(' ')[0]}.`} text="Keep your community moving with clear opportunities and thoughtful follow-through." action={<Link to="/create-opportunity" className="button button-primary"><Plus size={17} /> Create opportunity</Link>} /><div className="stat-cards"><StatCard icon={<BriefcaseBusiness />} label="Published opportunities" value={String(ownOpps.filter((o) => o.status === 'published').length || 4)} note="+2 this month" tone="green" /><StatCard icon={<Users />} label="Total applicants" value={String(myApplicants.length + 18)} note="Across your projects" tone="yellow" /><StatCard icon={<Clock3 />} label="Awaiting review" value={String(myApplicants.filter((a) => a.status === 'pending').length + 3)} note="Needs your attention" tone="blue" /></div><div className="dashboard-grid"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">YOUR WORK</span><h2>Active opportunities</h2></div><Link to="/opportunities" className="text-link">View all <ArrowRight size={15} /></Link></div><div className="compact-list">{(ownOpps.length ? ownOpps : store.opportunities.slice(0, 3)).slice(0, 3).map((item) => <div className="compact-row" key={item.id}><span className={`opportunity-icon ${item.accent}`}><Leaf size={17} /></span><div><strong>{item.title}</strong><small>{item.date} • {item.applicants} applicants</small></div><span className={`status-pill ${item.status}`}>{item.status}</span></div>)}</div></section><section className="panel highlight-panel"><span className="panel-kicker"><Sparkles size={15} /> KEEP THE MOMENTUM</span><h2>Good opportunities<br /><em>make good communities.</em></h2><p>Review applications promptly so volunteers can plan their time with confidence.</p><Link to="/applications" className="button button-dark">Review applicants <ArrowRight size={16} /></Link></section></div></div>
  const recommendationLabel = recommendationSource === 'openai' ? 'AI recommendations are active.' : recommendationSource === 'loading' ? 'Personalizing your matches...' : recommendationSource === 'empty' ? 'Publish an opportunity to start receiving matches.' : isSupabaseConfigured ? 'Using the safe fallback while AI is unavailable.' : 'Rule-based recommendations are active in demo mode.'
  const recommendationBadge = recommendationSource === 'openai' ? 'AI match' : recommendationSource === 'loading' ? 'Matching...' : recommendationSource === 'empty' ? 'Awaiting opportunities' : 'Safe fallback'
  return <div className="dashboard-page"><PageIntro eyebrow="YOUR VOLUNTEER SPACE" title={`Good morning, ${profile.name.split(' ')[0]}.`} text="A little direction can turn a free hour into something that stays with you." action={<Link to="/opportunities" className="button button-primary"><Compass size={17} /> Find an opportunity</Link>} /><div className="stat-cards"><StatCard icon={<Target />} label="Profile completion" value={`${profile.completion}%`} note="Almost there — add availability" tone="green" progress={profile.completion} /><StatCard icon={<BriefcaseBusiness />} label="Active applications" value={String(apps.length)} note="1 accepted recently" tone="yellow" /><StatCard icon={<Award />} label="Impact points" value="124" note="Top 18% this month" tone="blue" /></div><div className="dashboard-grid"><section className="panel recommendations-panel"><div className="panel-heading"><div><span className="eyebrow">MADE FOR YOU</span><h2>Recommended next steps</h2></div><span className={`ai-badge ${recommendationSource === 'fallback' ? 'fallback' : recommendationSource === 'empty' ? 'empty' : ''}`}><Sparkles size={14} /> {recommendationBadge}</span></div><p className="panel-subtext">{recommendationLabel} Based on your interests, skills and location.</p><div className="recommendation-list">{recommendations.slice(0, 3).map((item) => <RecommendationRow key={item.id} recommendation={item} />)}</div><Link to="/opportunities" className="button button-light full">Explore all opportunities <ArrowRight size={16} /></Link></section><section className="panel upcoming-panel"><div className="panel-heading"><div><span className="eyebrow">ON YOUR RADAR</span><h2>Application snapshot</h2></div><Link to="/applications" className="icon-link"><ArrowRight size={17} /></Link></div><div className="ring-wrap"><div className="progress-ring" style={{ '--progress': `${Math.min(apps.length * 25 + 25, 100)}%` } as React.CSSProperties}><strong>{apps.length}</strong><small>active</small></div><div><strong>Keep showing up</strong><p>Every application is a step toward the right kind of experience.</p></div></div><div className="mini-timeline">{apps.slice(0, 2).map((app) => { const op = store.opportunities.find((o) => o.id === app.opportunityId); return <div key={app.id}><span className={`timeline-dot ${app.status}`} /><div><strong>{op?.title}</strong><small><span className={`status-text ${app.status}`}>{app.status}</span> • {app.createdAt}</small></div></div> })}</div></section></div></div>
}

function PageIntro({ eyebrow, title, text, action }: { eyebrow: string; title: string; text: string; action?: ReactNode }) { const location = useLocation(); const { user, store } = useApp(); const showAssistant = location.pathname === '/dashboard' && user?.role === 'volunteer'; return <><div className="page-intro"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{text}</p></div>{action}</div>{showAssistant && <OpportunityAssistant profile={user} opportunities={store.opportunities} />}</> }
type AssistantMessage = { id: number; role: 'assistant' | 'volunteer'; text: string; recommendations?: Recommendation[] }
const NO_INTEREST_MESSAGE = 'Sorry, I couldn’t find anything relevant to your interests right now. Please try again later, and I’ll search for a suitable opportunity when one becomes available.'
type SpeechRecognitionAlternativeLike = { transcript: string }
type SpeechRecognitionResultLike = { isFinal: boolean; [index: number]: SpeechRecognitionAlternativeLike }
type SpeechRecognitionEventLike = { resultIndex: number; results: ArrayLike<SpeechRecognitionResultLike> }
type SpeechRecognitionLike = { continuous: boolean; interimResults: boolean; lang: string; onresult: ((event: SpeechRecognitionEventLike) => void) | null; onerror: ((event: { error?: string }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void }
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike
type VoiceCapableWindow = Window & typeof globalThis & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }

function normalizeWakePhrase(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
}

function isAssistantWakePhrase(value: string) {
  const normalized = normalizeWakePhrase(value)
  if (['yaar bore ho raha hoon', 'yaar bore ho rahi hoon'].some((phrase) => normalized === phrase || normalized.includes(phrase))) return true
  const words = new Set(normalized.split(' '))
  return (words.has('yaar') || words.has('yar')) && (words.has('bore') || words.has('bor')) && words.has('ho') && (words.has('raha') || words.has('rahi')) && (words.has('hoon') || words.has('hun'))
}

function speechRecognitionConstructor() {
  const voiceWindow = window as VoiceCapableWindow
  return voiceWindow.SpeechRecognition ?? voiceWindow.webkitSpeechRecognition
}

function OpportunityAssistant({ profile, opportunities }: { profile: Profile; opportunities: Opportunity[] }) {
  const { apply } = useApp()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [interest, setInterest] = useState('')
  const [phase, setPhase] = useState<'wake' | 'interest' | 'location'>('wake')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [voiceActive, setVoiceActive] = useState(false)
  const [voiceMessage, setVoiceMessage] = useState('')
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const voiceActiveRef = useRef(false)
  const suppressRecognitionRestartRef = useRef(false)
  const phaseRef = useRef(phase)
  const interestRef = useRef('')

  const addMessage = (message: Omit<AssistantMessage, 'id'>) => setMessages((current) => [...current, { ...message, id: Date.now() + Math.random() }])
  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => () => { voiceActiveRef.current = false; recognitionRef.current?.stop(); window.speechSynthesis?.cancel() }, [])
  const speak = (text: string) => { if (!('speechSynthesis' in window)) return; const recognition = recognitionRef.current; const resumeListening = voiceActiveRef.current; if (resumeListening && recognition) { suppressRecognitionRestartRef.current = true; recognition.stop() }; window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'en-IN'; utterance.rate = 0.95; utterance.onend = () => { if (resumeListening && voiceActiveRef.current && recognition) { suppressRecognitionRestartRef.current = false; try { recognition.start() } catch { /* already listening */ } } }; window.speechSynthesis.speak(utterance) }
  const stopVoiceAssistant = () => { voiceActiveRef.current = false; setVoiceActive(false); setVoiceMessage('Voice assistant paused.'); recognitionRef.current?.stop(); recognitionRef.current = null; window.speechSynthesis?.cancel() }
  const closeAssistant = () => { stopVoiceAssistant(); setOpen(false); phaseRef.current = 'wake'; setPhase('wake'); interestRef.current = ''; setInterest(''); setInput(''); setMessages([]) }
  const resetAssistant = () => { phaseRef.current = 'wake'; setPhase('wake'); interestRef.current = ''; setInterest(''); setInput(''); setMessages([]); setOpen(true) }
  const startConversation = (value: string) => { phaseRef.current = 'interest'; setOpen(true); setPhase('interest'); setInput(''); addMessage({ role: 'volunteer', text: value }); addMessage({ role: 'assistant', text: 'What are your interests?' }) }
  const handleInputChange = (value: string) => { setInput(value); if (!open && phase === 'wake' && isAssistantWakePhrase(value)) startConversation(value.trim()) }
  const finishNoInterest = () => { addMessage({ role: 'assistant', text: NO_INTEREST_MESSAGE }); speak(NO_INTEREST_MESSAGE); phaseRef.current = 'wake'; setPhase('wake'); setLoading(false) }

  const handleVoiceTranscript = async (transcript: string) => {
    const value = transcript.trim()
    if (!value || loading) return
    setVoiceMessage(`Heard: ${value}`)
    if (phaseRef.current === 'wake') {
      if (isAssistantWakePhrase(value)) { startConversation(value); speak('What are your interests?') }
      return
    }
    if (phaseRef.current === 'interest') {
      interestRef.current = value; setInterest(value); addMessage({ role: 'volunteer', text: value })
      if (!hasInterestMatch(value, opportunities)) { finishNoInterest(); return }
      if (!profile.location.trim()) { phaseRef.current = 'location'; setPhase('location'); addMessage({ role: 'assistant', text: 'What location should I use to find nearby opportunities?' }); speak('What location should I use to find nearby opportunities?'); return }
      await findRecommendations(value, profile.location)
      return
    }
    addMessage({ role: 'volunteer', text: value }); await findRecommendations(interestRef.current, value)
  }

  const startVoiceAssistant = () => {
    const Recognition = speechRecognitionConstructor()
    if (!Recognition) { setVoiceMessage('Voice recognition is not supported in this browser. Try Google Chrome or use the text input.'); return }
    if (voiceActiveRef.current) return
    const recognition = new Recognition()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = 'en-IN'
    recognition.onresult = (event) => { for (let index = event.resultIndex; index < event.results.length; index += 1) if (event.results[index].isFinal) void handleVoiceTranscript(event.results[index][0].transcript) }
    recognition.onerror = (event) => { if (event.error === 'not-allowed' || event.error === 'service-not-allowed') { voiceActiveRef.current = false; setVoiceActive(false); setVoiceMessage('Microphone permission is required. Allow microphone access and try again.') } else if (event.error !== 'no-speech') setVoiceMessage('I could not hear that clearly. Please try again.') }
    recognition.onend = () => { if (voiceActiveRef.current && !suppressRecognitionRestartRef.current) { try { recognition.start() } catch { /* recognition is already restarting */ } } }
    recognitionRef.current = recognition
    voiceActiveRef.current = true
    setVoiceActive(true); setOpen(true); setVoiceMessage('Listening for “yaar bore ho raha hoon”…')
    try { recognition.start() } catch { voiceActiveRef.current = false; setVoiceActive(false); setVoiceMessage('Unable to start the microphone. Please try again.') }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => startVoiceAssistant(), 0)
    const startAfterInteraction = () => { if (!voiceActiveRef.current) startVoiceAssistant() }
    window.addEventListener('pointerdown', startAfterInteraction, { once: true })
    return () => { window.clearTimeout(timer); window.removeEventListener('pointerdown', startAfterInteraction) }
  }, [])

  const findRecommendations = async (requestedInterest: string, requestedLocation: string) => {
    if (!hasInterestMatch(requestedInterest, opportunities)) { finishNoInterest(); return }
    setLoading(true)
    addMessage({ role: 'assistant', text: `I’m looking for ${requestedInterest.toLowerCase()} opportunities near ${requestedLocation}.` })
    const result = await recommendWithAI({ ...profile, location: requestedLocation }, opportunities, requestedInterest)
    const nearby = result.recommendations.filter((item) => isOpportunityNearby(requestedLocation, item.location))
    const recommendations = (nearby.length ? nearby : result.recommendations).slice(0, 5)
    const text = recommendations.length
      ? nearby.length ? `Here are the best matches near ${requestedLocation}.` : 'I couldn’t find an exact match nearby, but these related opportunities may interest you.'
      : 'I couldn’t find a suitable published opportunity nearby yet. Try another interest or a broader location.'
    addMessage({ role: 'assistant', text, recommendations })
    speak(recommendations.length ? `${text} ${recommendations.slice(0, 3).map((item) => item.title).join('. ')}.` : text)
    phaseRef.current = 'wake'
    setPhase('wake')
    setLoading(false)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const value = input.trim()
    if (!value || loading) return
    setInput('')
    if (phase === 'wake') {
      if (!isAssistantWakePhrase(value)) { setOpen(true); addMessage({ role: 'assistant', text: 'I’m ready to help. Start by typing “yaar bore ho raha hoon” or “yaar bore ho rahi hoon”.' }); return }
      startConversation(value); return
    }
    if (phase === 'interest') {
      interestRef.current = value; setInterest(value); addMessage({ role: 'volunteer', text: value })
      if (!hasInterestMatch(value, opportunities)) { finishNoInterest(); return }
      if (!profile.location.trim()) { phaseRef.current = 'location'; setPhase('location'); addMessage({ role: 'assistant', text: 'What location should I use to find nearby opportunities?' }); return }
      await findRecommendations(value, profile.location)
      return
    }
    addMessage({ role: 'volunteer', text: value }); await findRecommendations(interestRef.current, value)
  }

  return <section className={`assistant-card ${open ? 'open' : ''}`} aria-label="Y.A.A.R. Personal Opportunity Assistant"><div className="assistant-card-header"><div className="assistant-title"><span className="assistant-icon"><Sparkles size={17} /></span><div><span className="eyebrow">Y.A.A.R. PERSONAL OPPORTUNITY ASSISTANT</span><h2>Find something meaningful.</h2></div></div>{open && <button type="button" className="assistant-close" aria-label="Close assistant" onClick={closeAssistant}><X size={17} /></button>}</div>{!open ? <><p className="assistant-intro">Feeling bored? Tell me and I’ll help you find a nearby way to make an impact.</p><form className="assistant-search" onSubmit={(event) => void submit(event)}><MessageCircle size={18} /><input value={input} onChange={(event) => handleInputChange(event.target.value)} placeholder="Just say yaar bore ho raha hoon / ho rahi hoon and see the magic" aria-label="Ask the Y.A.A.R. assistant" /><button type="submit" aria-label="Start assistant"><ArrowRight size={17} /></button></form>{voiceMessage && <p className="assistant-voice-status">{voiceMessage}</p>}</> : <><div className="assistant-messages">{messages.map((message) => <div className={`assistant-message ${message.role}`} key={message.id}><span>{message.role === 'assistant' ? <Sparkles size={14} /> : profile.name.slice(0, 1)}</span><div><p>{message.text}</p>{message.recommendations?.length ? <div className="assistant-results">{message.recommendations.map((item) => <article className="assistant-result" key={item.id}><div><span className="eyebrow">{item.category} • {item.location}</span><h3>{item.title}</h3><p>{item.organization} • {Math.max(item.capacity - item.applicants, 0)} spots left • {formatDate(item.date)}</p><small>{item.reason}</small></div><div className="assistant-result-actions"><span className="match-score">{Math.max(item.score, 52)}%<small>match</small></span><Link to={`/opportunities/${item.id}`} className="text-link">View details <ArrowRight size={14} /></Link><button className="button button-primary button-small" onClick={() => { void apply(item.id) }}>Apply</button></div></article>)}</div> : null}</div></div>)}</div><form className="assistant-search" onSubmit={(event) => void submit(event)}><MessageCircle size={18} /><input value={input} onChange={(event) => handleInputChange(event.target.value)} placeholder={phase === 'interest' ? 'e.g. teaching, animals or technology' : phase === 'location' ? 'e.g. Greater Noida' : 'Start another search'} aria-label="Continue with the Y.A.A.R. assistant" /><button type="submit" aria-label="Send message" disabled={loading}>{loading ? '…' : <ArrowRight size={17} />}</button></form>{voiceMessage && <p className="assistant-voice-status">{voiceMessage}</p>}<button type="button" className="assistant-reset" onClick={resetAssistant}>Start a new search</button></>}</section>
}

function StatCard({ icon, label, value, note, tone, progress }: { icon: ReactNode; label: string; value: string; note: string; tone: string; progress?: number }) { return <div className="stat-card"><span className={`stat-icon ${tone}`}>{icon}</span><div><span className="stat-label">{label}</span><strong>{value}</strong><small>{note}</small>{progress && <div className="tiny-progress"><i style={{ width: `${progress}%` }} /></div>}</div></div> }
function RecommendationRow({ recommendation }: { recommendation: Recommendation }) { const { store, save } = useApp(); const saved = store.saved.includes(recommendation.id); return <Link to={`/opportunities/${recommendation.id}`} className="recommendation-row"><span className={`opportunity-icon ${recommendation.accent}`}><Leaf size={18} /></span><span className="recommendation-copy"><strong>{recommendation.title}</strong><small>{recommendation.organization} • {recommendation.reason}</small></span><span className="match-score">{Math.max(recommendation.score, 52)}%<small>match</small></span><button className="save-small" aria-label={saved ? 'Saved' : 'Save opportunity'} onClick={(event) => { event.preventDefault(); save(recommendation.id) }}><Heart size={17} fill={saved ? 'currentColor' : 'none'} /></button></Link> }

function WorkspaceDashboard() {
  const { user } = useApp()
  return user?.role === 'organization' ? <OrganizationDashboard /> : <Dashboard />
}

function OrganizationDashboard() {
  const { user, store } = useApp()
  if (!user) return null
  const ownOpps = store.opportunities.filter((item) => item.organizationId === user.id)
  const myApplicants = store.applications.filter((app) => ownOpps.some((item) => item.id === app.opportunityId))
  const organization = store.organizations.find((item) => item.ownerId === user.id) ?? { id: `local-${user.id}`, ownerId: user.id, name: user.name, description: user.bio, location: user.location, verified: false }
  return <div className="dashboard-page">
    <PageIntro eyebrow="ORGANIZATION OVERVIEW" title={`Good morning, ${user.name.split(' ')[0]}.`} text="Keep your community moving with clear opportunities and thoughtful follow-through." action={<Link to="/create-opportunity" className="button button-primary"><Plus size={17} /> Create opportunity</Link>} />
    <div className="stat-cards">
      <StatCard icon={<BriefcaseBusiness />} label="Published opportunities" value={String(ownOpps.filter((item) => item.status === 'published').length)} note={`${ownOpps.filter((item) => item.status === 'draft').length} drafts`} tone="green" />
      <StatCard icon={<Users />} label="Total applicants" value={String(myApplicants.length)} note="Across your projects" tone="yellow" />
      <StatCard icon={<Clock3 />} label="Awaiting review" value={String(myApplicants.filter((item) => item.status === 'pending').length)} note="Needs your attention" tone="blue" />
    </div>
    <div className="dashboard-grid organization-grid">
      <section className="panel">
        <div className="panel-heading"><div><span className="eyebrow">YOUR WORK</span><h2>Active opportunities</h2></div><Link to="/opportunities" className="text-link">Manage all <ArrowRight size={15} /></Link></div>
        {ownOpps.length ? <div className="compact-list">{ownOpps.slice(0, 5).map((item) => <div className="compact-row" key={item.id}><span className={`opportunity-icon ${item.accent}`}><Leaf size={17} /></span><div><strong>{item.title}</strong><small>{formatDate(item.date)} • {item.applicants} applicants</small></div><span className={`status-pill ${item.status}`}>{item.status}</span></div>)}</div> : <EmptyState title="No opportunities yet" text="Create your first opportunity and make it easy for volunteers to say yes." onClear={() => { window.location.href = '/create-opportunity' }} />}
      </section>
      <OrganizationDetailsPanel organization={organization} />
    </div>
    <section className="panel applications-panel organization-applications"><div className="panel-heading"><div><span className="eyebrow">RECENT APPLICATIONS</span><h2>People ready to help</h2></div><Link to="/applications" className="text-link">Review applicants <ArrowRight size={15} /></Link></div>{myApplicants.length ? <div className="application-list">{myApplicants.slice(0, 5).map((app) => { const opportunity = ownOpps.find((item) => item.id === app.opportunityId); const applicant = store.profiles.find((item) => item.id === app.volunteerId); return <div className="application-row" key={app.id}><span className={`opportunity-icon ${opportunity?.accent ?? 'green'}`}><Users size={18} /></span><div className="application-main"><strong>{opportunity?.title ?? 'Opportunity'}</strong><small>{applicant?.name ?? 'Volunteer'} • Applied {app.createdAt}</small></div><span className={`status-pill ${app.status}`}>{app.status}</span></div> })}</div> : <p className="panel-subtext">Applications will appear here when volunteers apply.</p>}</section>
  </div>
}

function OrganizationDetailsPanel({ organization }: { organization: { id: string; ownerId: string; name: string; description: string; location: string; verified: boolean } }) {
  const { updateOrganization } = useApp()
  const [name, setName] = useState(organization.name)
  const [description, setDescription] = useState(organization.description)
  const [location, setLocation] = useState(organization.location)
  useEffect(() => { setName(organization.name); setDescription(organization.description); setLocation(organization.location) }, [organization.id, organization.name, organization.description, organization.location])
  return <section className="panel organization-details-panel"><div className="panel-heading"><div><span className="eyebrow">ORGANIZATION PROFILE</span><h2>Details volunteers can trust</h2></div>{organization.verified && <span className="verified"><ShieldCheck size={14} /> Verified</span>}</div><form className="organization-form" onSubmit={(event) => { event.preventDefault(); void updateOrganization({ name, description, location }) }}><label>Organization name<input required value={name} onChange={(event) => setName(event.target.value)} /></label><label>Location<input required value={location} onChange={(event) => setLocation(event.target.value)} /></label><label>About your organization<textarea required rows={4} value={description} onChange={(event) => setDescription(event.target.value)} /></label><button className="button button-primary" type="submit"><Check size={16} /> Save organization details</button></form></section>
}

function OpportunityBrowserManaged() {
  const { user, store } = useApp()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All categories')
  const [location, setLocation] = useState('All locations')
  const [skill, setSkill] = useState('All skills')
  const [availability, setAvailability] = useState('All availability')
  const [dateRange, setDateRange] = useState('Any date')
  const [sort, setSort] = useState('recommended')
  const isAdmin = user?.role === 'administrator'
  const isOrg = user?.role === 'organization'
  const isVolunteer = user?.role === 'volunteer'
  const locations = ['All locations', ...Array.from(new Set(store.opportunities.map((item) => item.location))).sort()]
  const skills = ['All skills', ...Array.from(new Set(store.opportunities.flatMap((item) => item.skills))).sort()]
  const availabilityOptions = ['All availability', ...Array.from(new Set(store.opportunities.map((item) => item.availability ?? 'Flexible'))).sort()]
  const visible = useMemo(() => store.opportunities
    .filter((item) => isAdmin ? true : isOrg ? item.organizationId === user?.id : item.status === 'published' && item.reviewStatus === 'approved')
    .filter((item) => !query || `${item.title} ${item.organization} ${item.description}`.toLowerCase().includes(query.toLowerCase()))
    .filter((item) => category === 'All categories' || item.category === category)
    .filter((item) => location === 'All locations' || item.location === location)
    .filter((item) => skill === 'All skills' || item.skills.some((itemSkill) => itemSkill.toLowerCase().includes(skill.toLowerCase())))
    .filter((item) => availability === 'All availability' || (item.availability ?? 'Flexible') === availability)
    .filter((item) => matchesDateFilter(item.date, dateRange))
    .sort((a, b) => sort === 'soonest' ? a.date.localeCompare(b.date) : sort === 'spots' ? (b.capacity - b.applicants) - (a.capacity - a.applicants) : Number(Boolean(b.featured)) - Number(Boolean(a.featured))), [store.opportunities, user, isAdmin, isOrg, query, category, location, skill, availability, dateRange, sort])
  const clearFilters = () => { setQuery(''); setCategory('All categories'); setLocation('All locations'); setSkill('All skills'); setAvailability('All availability'); setDateRange('Any date'); setSort('recommended') }
  return <div className="browse-page"><PageIntro eyebrow={isOrg ? 'YOUR OPPORTUNITIES' : isAdmin ? 'ALL OPPORTUNITIES' : 'DISCOVER OPPORTUNITIES'} title={isOrg ? 'Your work in the world.' : isAdmin ? 'The full opportunity directory.' : 'Find your next good thing.'} text={isOrg ? 'Keep opportunities clear, current and easy for volunteers to find.' : isVolunteer ? 'Search approved opportunities or submit a community idea for review.' : 'Search by what matters to you, then take one practical next step.'} action={isOrg ? <Link to="/create-opportunity" className="button button-primary"><Plus size={17} /> Create opportunity</Link> : isVolunteer ? <Link to="/create-opportunity" className="button button-primary"><Plus size={17} /> Submit opportunity</Link> : undefined} /><div className="browse-toolbar browse-toolbar-expanded"><div className="search-field"><Search size={18} /><input aria-label="Search opportunities" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search opportunities, organizations..." /></div><div className="filter-controls"><select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)}><option>All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Filter by location" value={location} onChange={(event) => setLocation(event.target.value)}>{locations.map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Filter by skill" value={skill} onChange={(event) => setSkill(event.target.value)}>{skills.map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Filter by availability" value={availability} onChange={(event) => setAvailability(event.target.value)}>{availabilityOptions.map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Filter by date" value={dateRange} onChange={(event) => setDateRange(event.target.value)}><option>Any date</option><option>Next 7 days</option><option>Next 30 days</option><option>Future dates</option></select><select aria-label="Sort opportunities" value={sort} onChange={(event) => setSort(event.target.value)}><option value="recommended">Recommended</option><option value="soonest">Soonest date</option><option value="spots">Most space</option></select></div></div><div className="result-line"><span><strong>{visible.length}</strong> opportunities found</span><button className="text-link clear-filters" onClick={clearFilters}>Clear filters</button></div>{visible.length ? <div className="opportunity-grid">{visible.map((item) => <OpportunityCard key={item.id} opportunity={item} />)}</div> : <EmptyState title="No opportunities match those filters" text="Try clearing a filter or searching for a broader category." onClear={clearFilters} />}</div>
}

function OpportunityGallery({ urls }: { urls: string[] }) {
  return <div className="detail-image-gallery" aria-label="Opportunity photos">{urls.map((url, index) => <a href={url} target="_blank" rel="noreferrer" key={url}><img src={url} alt={`Opportunity photo ${index + 1}`} /></a>)}</div>
}

function OpportunityRewardPanel({ opportunity }: { opportunity: Opportunity }) {
  const cash = hasCashReward(opportunity)
  const perks = hasPerkReward(opportunity)
  if (!cash && !perks) return <div className="reward-summary muted"><strong>No monetary reward listed</strong><span>Check the opportunity details for the work and experience included.</span></div>
  return <section className="reward-summary"><div className="reward-summary-heading"><span className="eyebrow">VOLUNTEER REWARDS</span><span className="reward-type-label">{rewardTypeLabel(opportunity.rewardType)}</span></div><div className="reward-summary-grid">{cash && <div><small>Estimated cash per volunteer</small><strong>{formatCurrency(rewardPerVolunteer(opportunity), opportunity.budgetCurrency ?? 'INR')}</strong><span>Calculated from the total budget divided by {opportunity.capacity} maximum places.</span></div>}{perks && <div><small>Credits and perks</small><strong>{opportunity.creditReward ? `${opportunity.creditReward} credits` : 'Perks included'}</strong><span>{opportunity.perkDescription || 'Contribution perks are listed by the coordinator.'}</span></div>}</div><p className="reward-manual-note">Cash redemption is coordinated manually with the opportunity coordinator. Y.A.A.R. does not process payments.</p></section>
}

function OpportunityDetailWithImages() {
  const { id } = useParams()
  const { store, user, apply, save, showToast, updateOpportunity, deleteOpportunity } = useApp()
  const navigate = useNavigate()
  const opportunity = store.opportunities.find((item) => item.id === id)
  if (!opportunity) return <EmptyState title="Opportunity not found" text="This opportunity may have been removed or is no longer available." onClear={() => navigate('/opportunities')} />
  const application = store.applications.find((item) => item.opportunityId === opportunity.id && item.volunteerId === user?.id && item.status !== 'withdrawn')
  const saved = store.saved.includes(opportunity.id)
  const isManager = user?.role === 'administrator' || (user?.role === 'organization' && user.id === opportunity.organizationId) || (user?.role === 'volunteer' && user.id === opportunity.createdBy)
  const isVolunteer = user?.role === 'volunteer'
  const togglePublish = () => void updateOpportunity(opportunity.id, { status: opportunity.status === 'published' ? 'draft' : 'published', reviewStatus: 'approved' })
  const archive = () => void updateOpportunity(opportunity.id, { status: opportunity.status === 'closed' ? 'draft' : 'closed' })
  const remove = () => { if (window.confirm('Delete this opportunity permanently?')) void deleteOpportunity(opportunity.id).then(() => navigate('/opportunities')) }
  return <div className="detail-page"><button className="back-link" onClick={() => navigate(-1)}><ChevronRight size={16} className="rotate-180" /> Back to opportunities</button><div className="detail-layout"><main><div className={`detail-hero ${opportunity.accent}`}><span className="tag">{opportunity.category}</span><span className="detail-hero-shape"><Leaf size={68} /></span></div><div className="detail-body"><div className="org-line"><span className="mini-avatar">{opportunity.organization.slice(0, 1)}</span><span>{opportunity.organization}</span><span className="verified"><ShieldCheck size={14} /> {opportunity.organizationId ? 'Verified organization' : 'Community-submitted idea'}</span></div><h1>{opportunity.title}</h1>{opportunity.imageUrls?.length ? <OpportunityGallery urls={opportunity.imageUrls} /> : null}<p className="detail-description">{opportunity.description}</p><div className="detail-facts"><div><span><MapPin size={17} /></span><small>Location</small><strong>{opportunity.location}</strong></div><div><span><CalendarDays size={17} /></span><small>Date</small><strong>{formatDate(opportunity.date)}</strong></div><div><span><Clock3 size={17} /></span><small>Commitment</small><strong>{opportunity.timeCommitment}</strong></div><div><span><Users size={17} /></span><small>Volunteers</small><strong>{Math.max(opportunity.capacity - opportunity.applicants, 0)} spots left</strong></div></div><div className="detail-extra-facts"><span><strong>Availability</strong>{opportunity.availability ?? 'Flexible'}</span>{opportunity.contactEmail && <span><strong>Coordination</strong><a href={`mailto:${opportunity.contactEmail}`}>{opportunity.contactEmail}</a></span>}</div><OpportunityRewardPanel opportunity={opportunity} /><h2>What you’ll do</h2><p className="detail-description">You’ll work alongside the {opportunity.organization} team, meet other people who care about the same things and leave with a clear sense of what you contributed. A short orientation is included at the start.</p><h2>Helpful skills</h2><div className="skill-chips">{opportunity.skills.map((item) => <span key={item}>{item}</span>)}</div></div></main><aside className="detail-sidebar"><div className="action-card"><div className="deadline"><Clock3 size={16} /><span>Apply by <strong>{formatDate(opportunity.deadline)}</strong></span></div>{isManager ? <div className="management-actions"><span className={`status-pill ${opportunity.status}`}>{opportunity.status}</span><Link to={`/opportunities/${opportunity.id}/edit`} className="button button-primary full"><Edit3 size={16} /> Edit opportunity</Link><button className="button button-light full" onClick={togglePublish}>{opportunity.status === 'published' ? 'Unpublish opportunity' : 'Publish opportunity'} <ArrowRight size={16} /></button><button className="button button-light full" onClick={archive}>{opportunity.status === 'closed' ? <><RotateCcw size={16} /> Reopen opportunity</> : <><Archive size={16} /> Archive opportunity</>}</button><button className="danger-button full" onClick={remove}><Trash2 size={16} /> Delete permanently</button>{user?.role === 'organization' && <Link to="/applications" className="button button-dark full">Review applicants <ArrowRight size={16} /></Link>}</div> : isVolunteer ? <button className="button button-primary full" disabled={Boolean(application) || opportunity.status !== 'published'} onClick={() => { if (opportunity.capacity <= opportunity.applicants) { showToast('This opportunity is currently full.', 'error'); return } apply(opportunity.id) }}>{application ? <><Check size={16} /> Application {application.status}</> : opportunity.status !== 'published' ? 'Applications are closed' : <>Apply for this opportunity <ArrowRight size={16} /></>}</button> : <button className="button button-light full" onClick={() => showToast('Sign in as a volunteer to apply.')}>Apply as a volunteer</button>}<button className={`save-detail ${saved ? 'saved' : ''}`} onClick={() => save(opportunity.id)}><Heart size={17} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved to your list' : 'Save for later'}</button></div><div className="sidebar-note"><Sparkles size={18} /><div><strong>Why this matches</strong><p>This opportunity is close to your interests and helps you build practical community experience.</p></div></div></aside></div></div>
}

function OpportunityDetailManaged() {
  const { id } = useParams()
  const { store, user, apply, save, showToast, updateOpportunity, deleteOpportunity } = useApp()
  const navigate = useNavigate()
  const opportunity = store.opportunities.find((item) => item.id === id)
  if (!opportunity) return <EmptyState title="Opportunity not found" text="This opportunity may have been removed or is no longer available." onClear={() => navigate('/opportunities')} />
  const application = store.applications.find((item) => item.opportunityId === opportunity.id && item.volunteerId === user?.id && item.status !== 'withdrawn')
  const saved = store.saved.includes(opportunity.id)
  const isManager = user?.role === 'administrator' || (user?.role === 'organization' && user.id === opportunity.organizationId) || (user?.role === 'volunteer' && user.id === opportunity.createdBy)
  const isVolunteer = user?.role === 'volunteer'
  const togglePublish = () => void updateOpportunity(opportunity.id, { status: opportunity.status === 'published' ? 'draft' : 'published', reviewStatus: 'approved' })
  const archive = () => void updateOpportunity(opportunity.id, { status: opportunity.status === 'closed' ? 'draft' : 'closed' })
  const remove = () => { if (window.confirm('Delete this opportunity permanently?')) void deleteOpportunity(opportunity.id).then(() => navigate('/opportunities')) }
  return <div className="detail-page"><button className="back-link" onClick={() => navigate(-1)}><ChevronRight size={16} className="rotate-180" /> Back to opportunities</button><div className="detail-layout"><main><div className={`detail-hero ${opportunity.accent}`}><span className="tag">{opportunity.category}</span><span className="detail-hero-shape"><Leaf size={68} /></span></div><div className="detail-body"><div className="org-line"><span className="mini-avatar">{opportunity.organization.slice(0, 1)}</span><span>{opportunity.organization}</span><span className="verified"><ShieldCheck size={14} /> {opportunity.organizationId ? 'Verified organization' : 'Community-submitted idea'}</span></div><h1>{opportunity.title}</h1><p className="detail-description">{opportunity.description}</p><div className="detail-facts"><div><span><MapPin size={17} /></span><small>Location</small><strong>{opportunity.location}</strong></div><div><span><CalendarDays size={17} /></span><small>Date</small><strong>{formatDate(opportunity.date)}</strong></div><div><span><Clock3 size={17} /></span><small>Commitment</small><strong>{opportunity.timeCommitment}</strong></div><div><span><Users size={17} /></span><small>Volunteers</small><strong>{Math.max(opportunity.capacity - opportunity.applicants, 0)} spots left</strong></div></div><div className="detail-extra-facts"><span><strong>Availability</strong>{opportunity.availability ?? 'Flexible'}</span>{opportunity.contactEmail && <span><strong>Coordination</strong><a href={`mailto:${opportunity.contactEmail}`}>{opportunity.contactEmail}</a></span>}</div><h2>What you’ll do</h2><p className="detail-description">You’ll work alongside the {opportunity.organization} team, meet other people who care about the same things and leave with a clear sense of what you contributed. A short orientation is included at the start.</p><h2>Helpful skills</h2><div className="skill-chips">{opportunity.skills.map((item) => <span key={item}>{item}</span>)}</div></div></main><aside className="detail-sidebar"><div className="action-card"><div className="deadline"><Clock3 size={16} /><span>Apply by <strong>{formatDate(opportunity.deadline)}</strong></span></div>{isManager ? <div className="management-actions"><span className={`status-pill ${opportunity.status}`}>{opportunity.status}</span><Link to={`/opportunities/${opportunity.id}/edit`} className="button button-primary full"><Edit3 size={16} /> Edit opportunity</Link><button className="button button-light full" onClick={togglePublish}>{opportunity.status === 'published' ? 'Unpublish opportunity' : 'Publish opportunity'} <ArrowRight size={16} /></button><button className="button button-light full" onClick={archive}>{opportunity.status === 'closed' ? <><RotateCcw size={16} /> Reopen opportunity</> : <><Archive size={16} /> Archive opportunity</>}</button><button className="danger-button full" onClick={remove}><Trash2 size={16} /> Delete permanently</button>{user?.role === 'organization' && <Link to="/applications" className="button button-dark full">Review applicants <ArrowRight size={16} /></Link>}</div> : isVolunteer ? <button className="button button-primary full" disabled={Boolean(application) || opportunity.status !== 'published'} onClick={() => { if (opportunity.capacity <= opportunity.applicants) { showToast('This opportunity is currently full.', 'error'); return } apply(opportunity.id) }}>{application ? <><Check size={16} /> Application {application.status}</> : opportunity.status !== 'published' ? 'Applications are closed' : <>Apply for this opportunity <ArrowRight size={16} /></>}</button> : <button className="button button-light full" onClick={() => showToast('Sign in as a volunteer to apply.')}>Apply as a volunteer</button>}<button className={`save-detail ${saved ? 'saved' : ''}`} onClick={() => save(opportunity.id)}><Heart size={17} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved to your list' : 'Save for later'}</button></div><div className="sidebar-note"><Sparkles size={18} /><div><strong>Why this matches</strong><p>This opportunity is close to your interests and helps you build practical community experience.</p></div></div></aside></div></div>
}

function CreateOpportunityManaged() {
  const { id } = useParams()
  const { user, store, addOpportunity, updateOpportunity, showToast } = useApp()
  const navigate = useNavigate()
  const editing = id ? store.opportunities.find((item) => item.id === id) : undefined
  const canEdit = !editing || user?.role === 'administrator' || editing.organizationId === user?.id || editing.createdBy === user?.id
  const [title, setTitle] = useState(editing?.title ?? '')
  const [description, setDescription] = useState(editing?.description ?? '')
  const [category, setCategory] = useState(editing?.category ?? categories[0])
  const [location, setLocation] = useState(editing?.location ?? 'Greater Noida')
  const [date, setDate] = useState(editing?.date ?? '2026-12-20')
  const [deadline, setDeadline] = useState(editing?.deadline ?? '2026-12-16')
  const [timeCommitment, setTimeCommitment] = useState(editing?.timeCommitment ?? '3 hours')
  const [skills, setSkills] = useState(editing?.skills.join(', ') ?? 'Communication, Teamwork')
  const [availability, setAvailability] = useState(editing?.availability ?? 'Flexible')
  const [contactEmail, setContactEmail] = useState(editing?.contactEmail ?? user?.email ?? '')
  const [capacity, setCapacity] = useState(String(editing?.capacity ?? 12))
  const [rewardType, setRewardType] = useState<RewardType>(editing?.rewardType ?? 'none')
  const [totalBudget, setTotalBudget] = useState(String(editing?.totalBudget ?? 0))
  const [budgetCurrency, setBudgetCurrency] = useState(editing?.budgetCurrency ?? 'INR')
  const [creditReward, setCreditReward] = useState(String(editing?.creditReward ?? 0))
  const [perkDescription, setPerkDescription] = useState(editing?.perkDescription ?? '')
  useEffect(() => { if (!editing) return; setTitle(editing.title); setDescription(editing.description); setCategory(editing.category); setLocation(editing.location); setDate(editing.date); setDeadline(editing.deadline); setTimeCommitment(editing.timeCommitment); setSkills(editing.skills.join(', ')); setAvailability(editing.availability ?? 'Flexible'); setContactEmail(editing.contactEmail ?? user?.email ?? ''); setCapacity(String(editing.capacity)) }, [editing?.id])
  if (!user || !canEdit) return <Navigate to="/opportunities" replace />
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!title.trim() || !description.trim()) return; if (deadline > date) { showToast('The application deadline must be on or before the activity date.', 'error'); return } const next: Opportunity = { id: editing?.id ?? `opp-${Date.now()}`, title: title.trim(), description: description.trim(), category, organization: editing?.organization ?? user.name, organizationId: editing?.organizationId ?? (user.role === 'organization' ? user.id : ''), createdBy: editing?.createdBy ?? user.id, reviewStatus: editing?.reviewStatus ?? (user.role === 'volunteer' ? 'pending' : 'approved'), location, date, deadline, timeCommitment, skills: skills.split(',').map((item) => item.trim()).filter(Boolean), availability, contactEmail: contactEmail.trim() || undefined, capacity: Math.max(1, Number(capacity) || 1), applicants: editing?.applicants ?? 0, status: editing?.status ?? 'draft', accent: editing?.accent ?? 'green' }; if (editing) await updateOpportunity(editing.id, next); else await addOpportunity(next); navigate('/opportunities') }
  const isVolunteer = user.role === 'volunteer'
  return <div className="create-page"><PageIntro eyebrow={editing ? 'EDIT OPPORTUNITY' : isVolunteer ? 'SUBMIT AN OPPORTUNITY' : 'CREATE AN OPPORTUNITY'} title={editing ? 'Keep the details current.' : 'Make it easy to say yes.'} text={isVolunteer ? 'Your idea will be sent to an administrator for review before it appears publicly.' : 'Clear details help the right volunteers find your project and show up ready.'} /><form className="panel opportunity-form" onSubmit={(event) => void submit(event)}><div className="form-section-heading"><span className="step-count">01</span><div><h2>Tell people about the work</h2><p>Start with the details a volunteer needs to decide if it fits.</p></div></div><label>Opportunity title<input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Weekend food distribution" /></label><label>Description<textarea required minLength={20} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What will volunteers do? Why does it matter?" /></label><div className="form-grid"><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label>Location<input required value={location} onChange={(event) => setLocation(event.target.value)} /></label></div><div className="form-section-heading second"><span className="step-count">02</span><div><h2>Help volunteers plan</h2><p>Set expectations so people can commit with confidence.</p></div></div><div className="form-grid"><label>Activity date<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Application deadline<input required type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></label><label>Time commitment<input required value={timeCommitment} onChange={(event) => setTimeCommitment(event.target.value)} placeholder="3 hours" /></label><label>Volunteer capacity<input required type="number" min="1" value={capacity} onChange={(event) => setCapacity(event.target.value)} /></label><label>Availability<select value={availability} onChange={(event) => setAvailability(event.target.value)}><option>Flexible</option><option>Weekdays</option><option>Weekday evenings</option><option>Weekends</option></select></label><label>Coordination email<input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="contact@example.org" /></label></div><label>Helpful skills <span className="label-help">comma separated</span><input value={skills} onChange={(event) => setSkills(event.target.value)} placeholder="Communication, Teamwork" /></label><div className="form-actions"><Link to="/opportunities" className="button button-light">Cancel</Link><button className="button button-primary" type="submit">{editing ? 'Save changes' : isVolunteer ? 'Submit for review' : 'Save as draft'} <ArrowRight size={16} /></button></div></form></div>
}

function CreateOpportunityWithImages() {
  const { id } = useParams()
  const { user, store, addOpportunity, updateOpportunity, showToast } = useApp()
  const navigate = useNavigate()
  const editing = id ? store.opportunities.find((item) => item.id === id) : undefined
  const canEdit = !editing || user?.role === 'administrator' || editing.organizationId === user?.id || editing.createdBy === user?.id
  const [title, setTitle] = useState(editing?.title ?? '')
  const [description, setDescription] = useState(editing?.description ?? '')
  const [category, setCategory] = useState(editing?.category ?? categories[0])
  const [location, setLocation] = useState(editing?.location ?? 'Greater Noida')
  const [date, setDate] = useState(editing?.date ?? '2026-12-20')
  const [deadline, setDeadline] = useState(editing?.deadline ?? '2026-12-16')
  const [timeCommitment, setTimeCommitment] = useState(editing?.timeCommitment ?? '3 hours')
  const [skills, setSkills] = useState(editing?.skills.join(', ') ?? 'Communication, Teamwork')
  const [availability, setAvailability] = useState(editing?.availability ?? 'Flexible')
  const [contactEmail, setContactEmail] = useState(editing?.contactEmail ?? user?.email ?? '')
  const [capacity, setCapacity] = useState(String(editing?.capacity ?? 12))
  const [imageUrls, setImageUrls] = useState<string[]>(editing?.imageUrls ?? [])
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imageError, setImageError] = useState('')
  const [rewardType, setRewardType] = useState<RewardType>(editing?.rewardType ?? 'none')
  const [totalBudget, setTotalBudget] = useState(String(editing?.totalBudget ?? 0))
  const [budgetCurrency, setBudgetCurrency] = useState(editing?.budgetCurrency ?? 'INR')
  const [creditReward, setCreditReward] = useState(String(editing?.creditReward ?? 0))
  const [perkDescription, setPerkDescription] = useState(editing?.perkDescription ?? '')
  const filePreviews = useMemo(() => imageFiles.map((file) => URL.createObjectURL(file)), [imageFiles])
  useEffect(() => () => filePreviews.forEach((url) => URL.revokeObjectURL(url)), [filePreviews])
  useEffect(() => { if (!editing) return; setTitle(editing.title); setDescription(editing.description); setCategory(editing.category); setLocation(editing.location); setDate(editing.date); setDeadline(editing.deadline); setTimeCommitment(editing.timeCommitment); setSkills(editing.skills.join(', ')); setAvailability(editing.availability ?? 'Flexible'); setContactEmail(editing.contactEmail ?? user?.email ?? ''); setCapacity(String(editing.capacity)); setImageUrls(editing.imageUrls ?? []); setRewardType(editing.rewardType ?? 'none'); setTotalBudget(String(editing.totalBudget ?? 0)); setBudgetCurrency(editing.budgetCurrency ?? 'INR'); setCreditReward(String(editing.creditReward ?? 0)); setPerkDescription(editing.perkDescription ?? '') }, [editing?.id])
  if (!user || !canEdit) return <Navigate to="/opportunities" replace />
  const chooseImages = (event: React.ChangeEvent<HTMLInputElement>) => { const selected = Array.from(event.target.files ?? []); const invalid = selected.find((file) => !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024); if (invalid) { setImageError('Use image files up to 5 MB each.'); event.target.value = ''; return } if (imageUrls.length + imageFiles.length + selected.length > 5) { setImageError('You can add up to 5 photos per opportunity.'); event.target.value = ''; return } setImageError(''); setImageFiles((current) => [...current, ...selected]); event.target.value = '' }
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!title.trim() || !description.trim()) return; if (deadline > date) { showToast('The application deadline must be on or before the activity date.', 'error'); return } const parsedCapacity = Math.max(1, Number(capacity) || 1); const next: Opportunity = { id: editing?.id ?? `opp-${Date.now()}`, title: title.trim(), description: description.trim(), category, organization: editing?.organization ?? user.name, organizationId: editing?.organizationId ?? (user.role === 'organization' ? user.id : ''), createdBy: editing?.createdBy ?? user.id, reviewStatus: editing?.reviewStatus ?? (user.role === 'volunteer' ? 'pending' : 'approved'), location, date, deadline, timeCommitment, skills: skills.split(',').map((item) => item.trim()).filter(Boolean), availability, contactEmail: contactEmail.trim() || undefined, imageUrls, rewardType, totalBudget: rewardType === 'cash' || rewardType === 'cash_and_perks' ? Math.max(0, Number(totalBudget) || 0) : 0, budgetCurrency, creditReward: rewardType === 'credits' || rewardType === 'cash_and_perks' || rewardType === 'perks' ? Math.max(0, Number(creditReward) || 0) : 0, perkDescription: perkDescription.trim(), capacity: parsedCapacity, applicants: editing?.applicants ?? 0, status: editing?.status ?? 'draft', accent: editing?.accent ?? 'green' }; if (editing) await updateOpportunity(editing.id, next, imageFiles); else await addOpportunity(next, imageFiles); navigate('/opportunities') }
  const isVolunteer = user.role === 'volunteer'
  const previewBudget = rewardType === 'cash' || rewardType === 'cash_and_perks' ? Math.max(0, Number(totalBudget) || 0) : 0
  const previewPerVolunteer = previewBudget && Number(capacity) > 0 ? previewBudget / Number(capacity) : 0
  return <div className="create-page"><PageIntro eyebrow={editing ? 'EDIT OPPORTUNITY' : isVolunteer ? 'SUBMIT AN OPPORTUNITY' : 'CREATE AN OPPORTUNITY'} title={editing ? 'Keep the details current.' : 'Make it easy to say yes.'} text={isVolunteer ? 'Your idea will be sent to an administrator for review before it appears publicly.' : 'Clear details help the right volunteers find your project and show up ready.'} /><form className="panel opportunity-form" onSubmit={(event) => void submit(event)}><div className="form-section-heading"><span className="step-count">01</span><div><h2>Tell people about the work</h2><p>Start with the details a volunteer needs to decide if it fits.</p></div></div><label>Opportunity title<input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Weekend food distribution" /></label><label>Description<textarea required minLength={20} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What will volunteers do? Why does it matter?" /></label><div className="form-grid"><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label>Location<input required value={location} onChange={(event) => setLocation(event.target.value)} /></label></div><label className="image-upload-field"><span>Relevant photos <span className="label-help">up to 5 images, 5 MB each</span></span><span className="image-upload-control"><ImagePlus size={17} /><span>Choose photos</span><input type="file" accept="image/*" multiple onChange={chooseImages} /></span></label>{imageError && <p className="form-error">{imageError}</p>}{(imageUrls.length || filePreviews.length) ? <div className="image-preview-grid">{imageUrls.map((url, index) => <div className="image-preview" key={url}><img src={url} alt={`Opportunity photo ${index + 1}`} /><button type="button" aria-label="Remove photo" onClick={() => setImageUrls((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button></div>)}{filePreviews.map((url, index) => <div className="image-preview" key={url}><img src={url} alt={`Selected opportunity photo ${imageUrls.length + index + 1}`} /><button type="button" aria-label="Remove selected photo" onClick={() => setImageFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button></div>)}</div> : <p className="image-upload-help">Photos help volunteers understand the place, people or activity before they apply.</p>}<div className="form-section-heading second"><span className="step-count">02</span><div><h2>Help volunteers plan</h2><p>Set expectations so people can commit with confidence.</p></div></div><div className="form-grid"><label>Activity date<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Application deadline<input required type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></label><label>Time commitment<input required value={timeCommitment} onChange={(event) => setTimeCommitment(event.target.value)} placeholder="3 hours" /></label><label>Volunteer capacity<input required type="number" min="1" value={capacity} onChange={(event) => setCapacity(event.target.value)} /></label><label>Availability<select value={availability} onChange={(event) => setAvailability(event.target.value)}><option>Flexible</option><option>Weekdays</option><option>Weekday evenings</option><option>Weekends</option></select></label><label>Coordination email<input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="contact@example.org" /></label></div><label>Helpful skills <span className="label-help">comma separated</span><input value={skills} onChange={(event) => setSkills(event.target.value)} placeholder="Communication, Teamwork" /></label><div className="form-section-heading second"><span className="step-count">03</span><div><h2>Set volunteer rewards</h2><p>Cash is divided by the maximum volunteer capacity. Perks and credits are listed separately.</p></div></div><div className="form-grid"><label>Reward type<select value={rewardType} onChange={(event) => setRewardType(event.target.value as RewardType)}><option value="none">No reward</option><option value="cash">Cash</option><option value="credits">Credits</option><option value="perks">Perks</option><option value="cash_and_perks">Cash and perks</option></select></label>{(rewardType === 'cash' || rewardType === 'cash_and_perks') && <label>Total budget<input type="number" min="0" step="0.01" value={totalBudget} onChange={(event) => setTotalBudget(event.target.value)} placeholder="e.g. 8000" /></label>}{(rewardType === 'cash' || rewardType === 'cash_and_perks') && <label>Currency<select value={budgetCurrency} onChange={(event) => setBudgetCurrency(event.target.value)}><option>INR</option><option>USD</option><option>EUR</option></select></label>}{(rewardType === 'credits' || rewardType === 'perks' || rewardType === 'cash_and_perks') && <label>Credits<input type="number" min="0" step="1" value={creditReward} onChange={(event) => setCreditReward(event.target.value)} placeholder="e.g. 100" /></label>}</div>{(rewardType === 'perks' || rewardType === 'cash_and_perks') && <label>Perk description<textarea rows={3} value={perkDescription} onChange={(event) => setPerkDescription(event.target.value)} placeholder="Certificate, meals, travel support or other perks" /></label>}{previewPerVolunteer > 0 && <p className="reward-form-preview">Each volunteer is shown an estimated {formatCurrency(previewPerVolunteer, budgetCurrency)} based on {capacity} total places.</p>}<div className="form-actions"><Link to="/opportunities" className="button button-light">Cancel</Link><button className="button button-primary" type="submit">{editing ? 'Save changes' : isVolunteer ? 'Submit for review' : 'Save as draft'} <ArrowRight size={16} /></button></div></form></div>
}

function matchesDateFilter(date: string, filter: string) {
  if (filter === 'Any date') return true
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(`${date}T12:00:00`)
  const days = Math.ceil((target.getTime() - today.getTime()) / 86400000)
  if (filter === 'Next 7 days') return days >= 0 && days <= 7
  if (filter === 'Next 30 days') return days >= 0 && days <= 30
  return days >= 0
}

function filesToDataUrls(files: File[]) {
  return Promise.all(files.map((file) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`))
    reader.readAsDataURL(file)
  })))
}

function OpportunityBrowser() {
  const { user, store } = useApp(); const [query, setQuery] = useState(''); const [category, setCategory] = useState('All categories'); const [location, setLocation] = useState('All locations'); const [sort, setSort] = useState('recommended'); const isAdmin = user?.role === 'administrator'; const isOrg = user?.role === 'organization'; const isVolunteer = user?.role === 'volunteer';
  const visible = useMemo(() => store.opportunities.filter((item) => isAdmin ? true : isOrg ? item.organizationId === user?.id : item.status === 'published' && item.reviewStatus === 'approved').filter((item) => !query || `${item.title} ${item.organization} ${item.description}`.toLowerCase().includes(query.toLowerCase())).filter((item) => category === 'All categories' || item.category === category).filter((item) => location === 'All locations' || item.location === location).sort((a, b) => sort === 'soonest' ? a.date.localeCompare(b.date) : sort === 'spots' ? (b.capacity - b.applicants) - (a.capacity - a.applicants) : Number(Boolean(b.featured)) - Number(Boolean(a.featured))), [store.opportunities, user, isAdmin, isOrg, query, category, location, sort]);
  const locations = ['All locations', ...Array.from(new Set(store.opportunities.map((item) => item.location)))];
  return <div className="browse-page"><PageIntro eyebrow={isOrg ? 'YOUR OPPORTUNITIES' : isAdmin ? 'ALL OPPORTUNITIES' : 'DISCOVER OPPORTUNITIES'} title={isOrg ? 'Your work in the world.' : isAdmin ? 'The full opportunity directory.' : 'Find your next good thing.'} text={isOrg ? 'Keep opportunities clear, current and easy for volunteers to find.' : isVolunteer ? 'Search approved opportunities or submit a community idea for review.' : 'Search by what matters to you, then take one practical next step.'} action={isOrg ? <Link to="/create-opportunity" className="button button-primary"><Plus size={17} /> Create opportunity</Link> : isVolunteer ? <Link to="/create-opportunity" className="button button-primary"><Plus size={17} /> Submit opportunity</Link> : undefined} /><div className="browse-toolbar"><div className="search-field"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search opportunities, organizations..." /></div><div className="filter-controls"><select value={category} onChange={(event) => setCategory(event.target.value)}><option>All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select><select value={location} onChange={(event) => setLocation(event.target.value)}>{locations.map((item) => <option key={item}>{item}</option>)}</select><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="recommended">Recommended</option><option value="soonest">Soonest date</option><option value="spots">Most space</option></select></div></div><div className="result-line"><span><strong>{visible.length}</strong> opportunities found</span><span><Filter size={14} /> Filtered for you</span></div>{visible.length ? <div className="opportunity-grid">{visible.map((item) => <OpportunityCard key={item.id} opportunity={item} />)}</div> : <EmptyState title="No opportunities match that search" text="Try clearing a filter or searching for a broader category." onClear={() => { setQuery(''); setCategory('All categories'); setLocation('All locations') }} />}</div>
}

function OpportunityCard({ opportunity }: { opportunity: Opportunity }) { const { store, save, user } = useApp(); const saved = store.saved.includes(opportunity.id); const cash = hasCashReward(opportunity); const perks = hasPerkReward(opportunity); return <article className="opportunity-card"><div className={`card-art ${opportunity.accent} ${opportunity.imageUrls?.[0] ? 'has-image' : ''}`}>{opportunity.imageUrls?.[0] ? <img className="card-art-image" src={opportunity.imageUrls[0]} alt="" /> : <div className="card-art-symbol"><Leaf size={34} /></div>}<span className="tag">{opportunity.category}</span><button className="save-button" aria-label={saved ? 'Unsave opportunity' : 'Save opportunity'} onClick={() => save(opportunity.id)}><Heart size={17} fill={saved ? 'currentColor' : 'none'} /></button></div><div className="opportunity-card-body"><div className="org-line"><span className="mini-avatar">{opportunity.organization.slice(0, 1)}</span><span>{opportunity.organization}</span></div><h3>{opportunity.title}</h3><p className="card-description">{opportunity.description}</p><div className="meta-row"><span><MapPin size={14} /> {opportunity.location}</span><span><CalendarDays size={14} /> {formatDate(opportunity.date)}</span></div>{(cash || perks) && <div className="card-reward"><Award size={13} /> {cash ? `${formatCurrency(rewardPerVolunteer(opportunity), opportunity.budgetCurrency ?? 'INR')} per volunteer` : `${opportunity.creditReward ?? 0} credits / perks`}</div>}<div className="card-footer"><span className="spots"><i /> {opportunity.capacity - opportunity.applicants} spots left</span><Link className="card-link" to={`/opportunities/${opportunity.id}`}>{user?.role === 'organization' ? 'Manage' : 'View details'} <ArrowRight size={15} /></Link></div></div></article> }

function OpportunityDetail() { const { id } = useParams(); const { store, user, apply, save, showToast } = useApp(); const navigate = useNavigate(); const opportunity = store.opportunities.find((item) => item.id === id); if (!opportunity) return <EmptyState title="Opportunity not found" text="This opportunity may have been removed or is no longer available." onClear={() => navigate('/opportunities')} />; const application = store.applications.find((item) => item.opportunityId === opportunity.id && item.volunteerId === user?.id && item.status !== 'withdrawn'); const saved = store.saved.includes(opportunity.id); const isOwner = user?.role === 'organization' && user.id === opportunity.organizationId; return <div className="detail-page"><button className="back-link" onClick={() => navigate(-1)}><ChevronRight size={16} className="rotate-180" /> Back to opportunities</button><div className="detail-layout"><main><div className={`detail-hero ${opportunity.accent}`}><span className="tag">{opportunity.category}</span><span className="detail-hero-shape"><Leaf size={68} /></span></div><div className="detail-body"><div className="org-line"><span className="mini-avatar">{opportunity.organization.slice(0, 1)}</span><span>{opportunity.organization}</span><span className="verified"><ShieldCheck size={14} /> {opportunity.organizationId ? 'Verified organization' : 'Community-submitted idea'}</span></div><h1>{opportunity.title}</h1><p className="detail-description">{opportunity.description}</p><div className="detail-facts"><div><span><MapPin size={17} /></span><small>Location</small><strong>{opportunity.location}</strong></div><div><span><CalendarDays size={17} /></span><small>Date</small><strong>{formatDate(opportunity.date)}</strong></div><div><span><Clock3 size={17} /></span><small>Commitment</small><strong>{opportunity.timeCommitment}</strong></div><div><span><Users size={17} /></span><small>Volunteers</small><strong>{opportunity.capacity - opportunity.applicants} spots left</strong></div></div><h2>What you’ll do</h2><p className="detail-description">You’ll work alongside the {opportunity.organization} team, meet other people who care about the same things and leave with a clear sense of what you contributed. A short orientation is included at the start.</p><h2>Helpful skills</h2><div className="skill-chips">{opportunity.skills.map((skill) => <span key={skill}>{skill}</span>)}</div></div></main><aside className="detail-sidebar"><div className="action-card"><div className="deadline"><Clock3 size={16} /><span>Apply by <strong>{formatDate(opportunity.deadline)}</strong></span></div>{isOwner ? <Link to="/applications" className="button button-primary full">Review applicants <ArrowRight size={16} /></Link> : user?.role === 'volunteer' ? <button className="button button-primary full" disabled={Boolean(application)} onClick={() => { if (opportunity.capacity <= opportunity.applicants) { showToast('This opportunity is currently full.', 'error'); return } apply(opportunity.id) }}>{application ? <><Check size={16} /> Application {application.status}</> : <>Apply for this opportunity <ArrowRight size={16} /></>}</button> : <button className="button button-light full" onClick={() => showToast('Sign in as a volunteer to apply.')}>Apply as a volunteer</button>}<button className={`save-detail ${saved ? 'saved' : ''}`} onClick={() => save(opportunity.id)}><Heart size={17} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved to your list' : 'Save for later'}</button></div><div className="sidebar-note"><Sparkles size={18} /><div><strong>Why this matches</strong><p>This opportunity is close to your interests and helps you build practical community experience.</p></div></div></aside></div></div> }

function ApplicationsPage() { const { user, store, updateApplication, withdraw, showToast } = useApp(); const isOrg = user?.role === 'organization'; const ownOpps = store.opportunities.filter((item) => isOrg ? item.organizationId === user.id : true); const apps = store.applications.filter((app) => isOrg ? ownOpps.some((op) => op.id === app.opportunityId) : app.volunteerId === user?.id); return <div className="applications-page"><PageIntro eyebrow={isOrg ? 'APPLICATION INBOX' : 'YOUR PROGRESS'} title={isOrg ? 'People ready to help.' : 'Keep your momentum.'} text={isOrg ? 'Review applicants, respond clearly and help good intentions become action.' : 'Every application is a small commitment to the person you are becoming.'} /><div className="application-summary"><div><span>All applications</span><strong>{apps.length}</strong></div><div><span>Pending</span><strong>{apps.filter((app) => app.status === 'pending').length}</strong></div><div><span>Accepted</span><strong>{apps.filter((app) => app.status === 'accepted').length}</strong></div><div><span>Completed</span><strong>{apps.filter((app) => app.status === 'completed').length}</strong></div></div><section className="panel applications-panel"><div className="panel-heading"><div><span className="eyebrow">{isOrg ? 'REVIEW QUEUE' : 'APPLICATION HISTORY'}</span><h2>{isOrg ? 'Recent applications' : 'Your applications'}</h2></div></div>{apps.length ? <div className="application-list">{apps.map((app) => { const op = store.opportunities.find((item) => item.id === app.opportunityId); const applicant = store.profiles.find((item) => item.id === app.volunteerId); const applicantLabel = applicant?.name ?? `Volunteer ${app.volunteerId.slice(0, 8)}`; return <div className="application-row" key={app.id}><span className={`opportunity-icon ${op?.accent ?? 'green'}`}><Leaf size={18} /></span><div className="application-main"><strong>{op?.title ?? 'Opportunity'}</strong><small>{isOrg ? applicantLabel : op?.organization} • Applied {app.createdAt}</small></div><span className={`status-pill ${app.status}`}>{app.status}</span>{isOrg && app.status === 'pending' ? <div className="row-actions"><button onClick={() => { void updateApplication(app.id, 'accepted'); showToast('Applicant accepted.') }} className="approve"><Check size={15} /> Accept</button><button onClick={() => void updateApplication(app.id, 'rejected')} className="reject">Decline</button></div> : !isOrg && app.status === 'pending' ? <button className="ghost-button" onClick={() => { void withdraw(app.id); showToast('Application withdrawn.') }}>Withdraw</button> : null}</div> })}</div> : <EmptyState title="Nothing here yet" text={isOrg ? 'Applications will appear here when volunteers apply.' : 'Find an opportunity that feels like a good next step.'} onClear={() => { window.location.href = '/opportunities' }} />}</section></div> }

function RewardsPage() {
  const { user, store, requestRewardRedemption } = useApp()
  if (!user || user.role !== 'volunteer') return <Navigate to="/dashboard" replace />
  const opportunityName = (id: string) => store.opportunities.find((item) => item.id === id)?.title ?? 'Y.A.A.R. opportunity'
  const redemptionFor = (rewardId: string, kind: RedemptionKind) => store.redemptions.find((item) => item.rewardId === rewardId && item.kind === kind && item.status !== 'completed')
  const cashRewards = store.cashRewards.filter((item) => item.volunteerId === user.id)
  const perkRewards = store.perkRewards.filter((item) => item.volunteerId === user.id)
  const cashValue = cashRewards.reduce((sum, item) => sum + item.amount, 0)
  const credits = perkRewards.reduce((sum, item) => sum + item.credits, 0)
  return <div className="rewards-page"><PageIntro eyebrow="YOUR REWARDS" title="See what your time unlocks." text="Cash and perks are tracked separately so you can understand what is available and request redemption clearly." /><div className="stat-cards"><StatCard icon={<WalletCards />} label="Cash value" value={formatCurrency(cashValue, cashRewards[0]?.currency ?? 'INR')} note="Manual payout records" tone="green" /><StatCard icon={<Award />} label="Perk credits" value={String(credits)} note="Available across activities" tone="yellow" /><StatCard icon={<Gift />} label="Redeemable items" value={String(cashRewards.filter((item) => item.status !== 'paid').length + perkRewards.filter((item) => item.status !== 'redeemed').length)} note="Cash and perks" tone="blue" /></div><div className="rewards-grid"><section className="panel reward-panel"><div className="panel-heading"><div><span className="eyebrow">YOUR CASH</span><h2>Cash rewards</h2></div><span className="reward-type-label">Manual payout</span></div><p className="panel-subtext">Cash values are calculated from the opportunity budget divided by its maximum volunteer capacity. Y.A.A.R. does not process payments.</p>{cashRewards.length ? <div className="reward-list">{cashRewards.map((reward) => { const redemption = redemptionFor(reward.id, 'cash'); return <article className="reward-row" key={reward.id}><div className="reward-row-icon green"><WalletCards size={18} /></div><div className="reward-row-copy"><strong>{formatCurrency(reward.amount, reward.currency)}</strong><small>{opportunityName(reward.opportunityId)}</small><p>{reward.note}</p></div><div className="reward-row-action">{reward.status === 'paid' ? <span className="status-pill accepted">Paid manually</span> : redemption ? <span className="status-pill pending">Request sent</span> : <button className="button button-primary button-small" onClick={() => { void requestRewardRedemption(reward.id, 'cash') }}>Redeem cash</button>}</div></article> })}</div> : <EmptyState title="No cash rewards yet" text="Accepted opportunities with a cash budget will appear here." onClear={() => { window.location.href = '/opportunities' }} />}<p className="reward-footnote">To receive a monetary payout, use the redemption request to coordinate directly with the person in charge of the opportunity.</p></section><section className="panel reward-panel"><div className="panel-heading"><div><span className="eyebrow">YOUR PERKS AND CREDITS</span><h2>Redeem your perks</h2></div><span className="reward-type-label">{credits} credits</span></div><p className="panel-subtext">Perks and credits are separate from cash and can be redeemed through the opportunity coordinator.</p>{perkRewards.length ? <div className="reward-list">{perkRewards.map((reward) => { const redemption = redemptionFor(reward.id, 'perk'); return <article className="reward-row" key={reward.id}><div className="reward-row-icon yellow"><Gift size={18} /></div><div className="reward-row-copy"><strong>{reward.title}</strong><small>{reward.credits} credits • {opportunityName(reward.opportunityId)}</small><p>{reward.description}</p></div><div className="reward-row-action">{reward.status === 'redeemed' ? <span className="status-pill accepted">Redeemed</span> : redemption ? <span className="status-pill pending">Request sent</span> : <button className="button button-light button-small" onClick={() => { void requestRewardRedemption(reward.id, 'perk') }}>Redeem perk</button>}</div></article> })}</div> : <EmptyState title="No perks yet" text="Credits, certificates and activity perks will appear here." onClear={() => { window.location.href = '/opportunities' }} />}<p className="reward-footnote">Each redemption request is recorded in Y.A.A.R. and coordinated manually by the opportunity owner.</p></section></div></div>
}

function ProfilePage() { const { user, updateProfile } = useApp(); const [form, setForm] = useState({ name: user?.name ?? '', bio: user?.bio ?? '', location: user?.location ?? '', interests: user?.interests.join(', ') ?? '', skills: user?.skills.join(', ') ?? '', availability: user?.availability ?? 'Weekends', experience: user?.experience ?? 'Beginner' }); if (!user) return null; const submit = (event: FormEvent) => { event.preventDefault(); const filled = [form.name, form.bio, form.location, form.interests, form.skills, form.availability].filter(Boolean).length; updateProfile({ ...form, interests: form.interests.split(',').map((x) => x.trim()).filter(Boolean), skills: form.skills.split(',').map((x) => x.trim()).filter(Boolean), completion: Math.min(100, Math.round((filled / 6) * 100)) }) }; return <div className="profile-page"><PageIntro eyebrow="YOUR PROFILE" title="Make it easier to find your fit." text="A few details help Y.A.A.R. surface opportunities that feel more like you." /><div className="profile-layout"><section className="panel profile-form-panel"><div className="profile-form-top"><span className="profile-large-avatar">{user.name.slice(0, 1)}</span><div><h2>{user.name}</h2><p>{user.email}</p></div><span className="profile-completion"><strong>{user.completion}%</strong><small>complete</small></span></div><form className="profile-form" onSubmit={submit}><div className="form-grid"><label>Full name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Location<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label></div><label>Short bio<textarea rows={4} value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} /></label><label>Interests <span className="label-help">comma separated</span><input value={form.interests} onChange={(event) => setForm({ ...form, interests: event.target.value })} placeholder="Education, Environment" /></label><label>Skills <span className="label-help">comma separated</span><input value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} placeholder="Teaching, Design" /></label><div className="form-grid"><label>Availability<select value={form.availability} onChange={(event) => setForm({ ...form, availability: event.target.value })}><option>Weekends</option><option>Weekday evenings</option><option>Flexible</option></select></label><label>Experience level<select value={form.experience} onChange={(event) => setForm({ ...form, experience: event.target.value })}><option>Beginner</option><option>Intermediate</option><option>Expert</option></select></label></div><button className="button button-primary" type="submit"><Check size={16} /> Save profile</button></form></section><aside className="profile-side"><div className="panel completion-card"><span className="eyebrow">PROFILE STRENGTH</span><div className="big-completion">{user.completion}<small>%</small></div><p>Complete profiles get better matches and make it easier for organizations to say yes.</p><div className="completion-bar"><i style={{ width: `${user.completion}%` }} /></div><ul><li className={user.bio ? 'done' : ''}><Check size={14} /> Add a short bio</li><li className={user.skills.length ? 'done' : ''}><Check size={14} /> Add two skills</li><li className={user.availability ? 'done' : ''}><Check size={14} /> Set availability</li></ul></div><div className="panel privacy-card"><ShieldCheck size={18} /><div><strong>Your information stays yours.</strong><p>Y.A.A.R. only uses profile details to improve matching and application coordination.</p></div></div></aside></div></div> }

function CreateOpportunity() { const { user, addOpportunity } = useApp(); const navigate = useNavigate(); const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [category, setCategory] = useState(categories[0]); const [location, setLocation] = useState('Greater Noida'); const [date, setDate] = useState('2026-12-20'); const [deadline, setDeadline] = useState('2026-12-16'); const [skills, setSkills] = useState('Communication, Teamwork'); const [capacity, setCapacity] = useState('12'); const isVolunteer = user?.role === 'volunteer'; const submit = (event: FormEvent) => { event.preventDefault(); if (!title || !description) return; addOpportunity({ id: `opp-${Date.now()}`, title, description, category, organization: user?.name ?? 'Your organization', organizationId: user?.role === 'organization' ? user.id : '', createdBy: user?.id, reviewStatus: isVolunteer ? 'pending' : 'approved', location, date, deadline, timeCommitment: '3 hours', skills: skills.split(',').map((x) => x.trim()).filter(Boolean), capacity: Number(capacity), applicants: 0, status: 'draft', accent: 'green' }); navigate('/opportunities') }; return <div className="create-page"><PageIntro eyebrow={isVolunteer ? 'SUBMIT AN OPPORTUNITY' : 'CREATE AN OPPORTUNITY'} title="Make it easy to say yes." text={isVolunteer ? 'Your idea will be sent to an administrator for review before it appears publicly.' : 'Clear details help the right volunteers find your project and show up ready.'} /><form className="panel opportunity-form" onSubmit={submit}><div className="form-section-heading"><span className="step-count">01</span><div><h2>Tell people about the work</h2><p>Start with the details a volunteer needs to decide if it fits.</p></div></div><label>Opportunity title<input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Weekend food distribution" /></label><label>Description<textarea required rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What will volunteers do? Why does it matter?" /></label><div className="form-grid"><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label>Location<input value={location} onChange={(event) => setLocation(event.target.value)} /></label></div><div className="form-section-heading second"><span className="step-count">02</span><div><h2>Help volunteers plan</h2><p>Set expectations so people can commit with confidence.</p></div></div><div className="form-grid"><label>Activity date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Application deadline<input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></label><label>Volunteer capacity<input type="number" min="1" value={capacity} onChange={(event) => setCapacity(event.target.value)} /></label><label>Helpful skills<input value={skills} onChange={(event) => setSkills(event.target.value)} /></label></div><div className="form-actions"><Link to="/opportunities" className="button button-light">Cancel</Link><button className="button button-primary" type="submit">{isVolunteer ? 'Submit for review' : 'Save as draft'} <ArrowRight size={16} /></button></div></form></div> }

function AdminReviewPage() { const { user, store, reviewOpportunity } = useApp(); const pending = store.opportunities.filter((item) => item.reviewStatus === 'pending'); if (user?.role !== 'administrator') return <Navigate to="/dashboard" replace />; return <div className="admin-page"><PageIntro eyebrow="OPPORTUNITY REVIEW" title="Approve community ideas." text="Volunteer-submitted opportunities stay private until an administrator approves them." action={<Link to="/admin" className="button button-light">Back to overview</Link>} /><section className="panel admin-table-panel"><div className="panel-heading"><div><span className="eyebrow">PENDING SUBMISSIONS</span><h2>{pending.length ? `${pending.length} ${pending.length === 1 ? 'opportunity' : 'opportunities'} awaiting review` : 'No pending submissions'}</h2></div></div>{pending.length ? <div className="review-list">{pending.map((item) => <article className="review-card" key={item.id}><div><span className="eyebrow">{item.category} • {item.location}</span><h3>{item.title}</h3><p>{item.description}</p><small>Submitted by {item.organization} • {formatDate(item.date)} • {item.capacity} volunteers</small></div><div className="row-actions"><button className="approve" onClick={() => void reviewOpportunity(item.id, 'approved')}><Check size={15} /> Approve & publish</button><button className="reject" onClick={() => void reviewOpportunity(item.id, 'rejected')}>Return</button></div></article>)}</div> : <EmptyState title="All caught up" text="New volunteer opportunity proposals will appear here." onClear={() => { window.location.href = '/opportunities' }} />}</section></div> }

function AdminPage() { const { store } = useApp(); const published = store.opportunities.filter((item) => item.status === 'published').length; const pending = store.opportunities.filter((item) => item.reviewStatus === 'pending').length; return <div className="admin-page"><PageIntro eyebrow="PLATFORM OVERVIEW" title="A healthier community starts with visibility." text="Keep an eye on the people, projects and momentum moving through Y.A.A.R." action={<div className="page-intro-actions"><span className="admin-badge"><ShieldCheck size={16} /> Administrator access</span><Link to="/admin/review" className="button button-primary">Review submissions {pending ? `(${pending})` : ''} <ArrowRight size={16} /></Link></div>} /><div className="stat-cards"><StatCard icon={<Users />} label="Registered users" value={String(store.profiles.length + 2840)} note="+12% this month" tone="green" /><StatCard icon={<BriefcaseBusiness />} label="Live opportunities" value={String(published)} note="Across 6 categories" tone="yellow" /><StatCard icon={<Heart />} label="Applications" value={String(store.applications.length + 121)} note="89% response rate" tone="blue" /></div><div className="dashboard-grid admin-grid"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">RECENT ACTIVITY</span><h2>What’s moving</h2></div><span className="live-dot"><i /> Live data</span></div><div className="activity-list"><Activity icon={<UserRound />} title="New volunteer profiles" detail="12 profiles completed this week" metric="+12%" tone="green" /><Activity icon={<BriefcaseBusiness />} title="Opportunities published" detail="6 new opportunities need review" metric="6" tone="yellow" /><Activity icon={<MessageCircle />} title="Applications awaiting response" detail="Keep the experience moving" metric="9" tone="blue" /></div></section><section className="panel category-panel"><div className="panel-heading"><div><span className="eyebrow">WHERE ENERGY GOES</span><h2>Top categories</h2></div></div>{categories.slice(0, 5).map((item, index) => <div className="category-bar" key={item}><div><span>{item}</span><strong>{[38, 26, 19, 12, 8][index]}%</strong></div><div><i style={{ width: `${[38, 26, 19, 12, 8][index] * 2}%` }} /></div></div>)}</section></div><section className="panel admin-table-panel"><div className="panel-heading"><div><span className="eyebrow">MODERATION</span><h2>Latest opportunities</h2></div><Link to="/opportunities" className="text-link">Open directory <ArrowRight size={15} /></Link></div><div className="admin-table"><div className="table-row table-head"><span>Opportunity</span><span>Organization</span><span>Category</span><span>Status</span></div>{store.opportunities.slice(0, 5).map((item) => <div className="table-row" key={item.id}><span><strong>{item.title}</strong><small>{formatDate(item.date)}</small></span><span>{item.organization}</span><span>{item.category}</span><span className={`status-pill ${item.status}`}>{item.status}</span></div>)}</div></section></div> }
function Activity({ icon, title, detail, metric, tone }: { icon: ReactNode; title: string; detail: string; metric: string; tone: string }) { return <div className="activity-row"><span className={`activity-icon ${tone}`}>{icon}</span><div><strong>{title}</strong><small>{detail}</small></div><b>{metric}</b></div> }
function EmptyState({ title, text, onClear }: { title: string; text: string; onClear: () => void }) { return <div className="empty-state"><span className="empty-icon"><Search size={23} /></span><h2>{title}</h2><p>{text}</p><button className="button button-light" onClick={onClear}>Clear filters</button></div> }
function formatDate(date: string) { return new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) }
function friendlyError(error: unknown) {
  const message = error && typeof error === 'object' && 'message' in error ? String((error as { message?: unknown }).message ?? '') : ''
  if (message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('unique')) return 'You already have an active application for this opportunity.'
  if (message.toLowerCase().includes('invalid login')) return 'The email or password is incorrect.'
  if (message.toLowerCase().includes('row-level security')) return 'You do not have permission to perform that action.'
  return message || 'Something went wrong. Please try again.'
}

export default App
