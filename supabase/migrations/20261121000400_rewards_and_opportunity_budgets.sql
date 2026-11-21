-- Opportunity budgets, volunteer cash rewards and redeemable perks.

alter table public.opportunities
  add column if not exists reward_type text not null default 'none',
  add column if not exists total_budget numeric(12, 2) not null default 0,
  add column if not exists budget_currency text not null default 'INR',
  add column if not exists credit_reward integer not null default 0,
  add column if not exists perk_description text not null default '';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'opportunities_reward_type_check') then
    alter table public.opportunities add constraint opportunities_reward_type_check
      check (reward_type in ('none', 'cash', 'credits', 'perks', 'cash_and_perks'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'opportunities_total_budget_check') then
    alter table public.opportunities add constraint opportunities_total_budget_check
      check (total_budget >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'opportunities_credit_reward_check') then
    alter table public.opportunities add constraint opportunities_credit_reward_check
      check (credit_reward >= 0);
  end if;
end;
$$;

create table public.cash_rewards (
  id uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'INR',
  status text not null default 'available' check (status in ('available', 'requested', 'paid')),
  note text not null default '',
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  unique (volunteer_id, opportunity_id)
);

create table public.perk_rewards (
  id uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  title text not null,
  description text not null default '',
  credits integer not null default 0 check (credits >= 0),
  status text not null default 'available' check (status in ('available', 'redeemed')),
  created_at timestamptz not null default now(),
  redeemed_at timestamptz,
  unique (volunteer_id, opportunity_id)
);

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null references public.profiles(id) on delete cascade,
  cash_reward_id uuid references public.cash_rewards(id) on delete cascade,
  perk_reward_id uuid references public.perk_rewards(id) on delete cascade,
  kind text not null check (kind in ('cash', 'perk')),
  status text not null default 'requested' check (status in ('requested', 'approved', 'completed')),
  note text not null default '',
  created_at timestamptz not null default now(),
  check ((kind = 'cash' and cash_reward_id is not null and perk_reward_id is null) or (kind = 'perk' and perk_reward_id is not null and cash_reward_id is null))
);

create index cash_rewards_volunteer_idx on public.cash_rewards(volunteer_id, status);
create index perk_rewards_volunteer_idx on public.perk_rewards(volunteer_id, status);
create index reward_redemptions_volunteer_idx on public.reward_redemptions(volunteer_id, status);

alter table public.cash_rewards enable row level security;
alter table public.perk_rewards enable row level security;
alter table public.reward_redemptions enable row level security;

create policy "reward owners and coordinators can view cash rewards" on public.cash_rewards for select using (
  volunteer_id = auth.uid()
  or exists (select 1 from public.opportunities o where o.id = opportunity_id and public.is_organization_owner(o.organization_id))
  or public.is_admin()
);
create policy "coordinators can create cash rewards" on public.cash_rewards for insert with check (
  exists (select 1 from public.opportunities o where o.id = opportunity_id and public.is_organization_owner(o.organization_id))
  or public.is_admin()
);
create policy "coordinators can update cash rewards" on public.cash_rewards for update using (
  exists (select 1 from public.opportunities o where o.id = opportunity_id and public.is_organization_owner(o.organization_id))
  or public.is_admin()
) with check (
  exists (select 1 from public.opportunities o where o.id = opportunity_id and public.is_organization_owner(o.organization_id))
  or public.is_admin()
);

create policy "reward owners and coordinators can view perks" on public.perk_rewards for select using (
  volunteer_id = auth.uid()
  or exists (select 1 from public.opportunities o where o.id = opportunity_id and public.is_organization_owner(o.organization_id))
  or public.is_admin()
);
create policy "coordinators can create perks" on public.perk_rewards for insert with check (
  exists (select 1 from public.opportunities o where o.id = opportunity_id and public.is_organization_owner(o.organization_id))
  or public.is_admin()
);
create policy "coordinators can update perks" on public.perk_rewards for update using (
  exists (select 1 from public.opportunities o where o.id = opportunity_id and public.is_organization_owner(o.organization_id))
  or public.is_admin()
) with check (
  exists (select 1 from public.opportunities o where o.id = opportunity_id and public.is_organization_owner(o.organization_id))
  or public.is_admin()
);

create policy "reward owners and coordinators can view redemptions" on public.reward_redemptions for select using (
  volunteer_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.opportunities o
    where o.id = coalesce((select opportunity_id from public.cash_rewards where id = cash_reward_id), (select opportunity_id from public.perk_rewards where id = perk_reward_id))
      and public.is_organization_owner(o.organization_id)
  )
);
create policy "volunteers request their own redemptions" on public.reward_redemptions for insert with check (
  volunteer_id = auth.uid()
  and (
    (kind = 'cash' and exists (select 1 from public.cash_rewards r where r.id = cash_reward_id and r.volunteer_id = auth.uid()))
    or (kind = 'perk' and exists (select 1 from public.perk_rewards r where r.id = perk_reward_id and r.volunteer_id = auth.uid()))
  )
);
create policy "coordinators and admins update redemptions" on public.reward_redemptions for update using (
  public.is_admin()
  or exists (
    select 1 from public.opportunities o
    where o.id = coalesce((select opportunity_id from public.cash_rewards where id = cash_reward_id), (select opportunity_id from public.perk_rewards where id = perk_reward_id))
      and public.is_organization_owner(o.organization_id)
  )
) with check (true);

-- Sample budget values for the prepared Y.A.A.R. opportunities.
update public.opportunities set reward_type = 'cash_and_perks', total_budget = 12000, budget_currency = 'INR', credit_reward = 120, perk_description = 'Gloves, refreshments and a participation certificate' where title = 'Yamuna Clean-up Drive';
update public.opportunities set reward_type = 'cash_and_perks', total_budget = 8000, budget_currency = 'INR', credit_reward = 150, perk_description = 'Learning materials and a teaching certificate' where title = 'Code for Classrooms';
update public.opportunities set reward_type = 'cash', total_budget = 6000, budget_currency = 'INR', credit_reward = 0, perk_description = '' where title = 'Digital Help Desk';
update public.opportunities set reward_type = 'perks', total_budget = 0, budget_currency = 'INR', credit_reward = 80, perk_description = 'Meal and local travel support' where title = 'Community Health Camp';
update public.opportunities set reward_type = 'cash_and_perks', total_budget = 7500, budget_currency = 'INR', credit_reward = 100, perk_description = 'Certificate and pet-care kit' where title = 'Street Animal Care Day';
update public.opportunities set reward_type = 'credits', total_budget = 0, budget_currency = 'INR', credit_reward = 100, perk_description = 'Community reading certificate' where title = 'Neighbourhood Library Setup';
