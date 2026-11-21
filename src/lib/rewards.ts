import type { Opportunity, RewardType } from '../types'

export function rewardPerVolunteer(opportunity: Opportunity) {
  const budget = Number(opportunity.totalBudget ?? 0)
  return budget > 0 && opportunity.capacity > 0 ? Math.round((budget / opportunity.capacity) * 100) / 100 : 0
}

export function hasCashReward(opportunity: Pick<Opportunity, 'rewardType' | 'totalBudget'>) {
  return (opportunity.rewardType === 'cash' || opportunity.rewardType === 'cash_and_perks') && Number(opportunity.totalBudget ?? 0) > 0
}

export function hasPerkReward(opportunity: Pick<Opportunity, 'rewardType' | 'creditReward' | 'perkDescription'>) {
  return (opportunity.rewardType === 'credits' || opportunity.rewardType === 'perks' || opportunity.rewardType === 'cash_and_perks') && (Number(opportunity.creditReward ?? 0) > 0 || Boolean(opportunity.perkDescription?.trim()))
}

export function rewardTypeLabel(type: RewardType = 'none') {
  return ({ none: 'No reward', cash: 'Cash', credits: 'Credits', perks: 'Perks', cash_and_perks: 'Cash and perks' })[type]
}

export function formatCurrency(amount: number, currency = 'INR') {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}
