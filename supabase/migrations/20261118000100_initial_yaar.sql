-- Y.A.A.R. core schema. Run with Supabase CLI or the SQL editor.
create extension if not exists "pgcrypto";

create type public.user_role as enum ('volunteer', 'organization', 'administrator');
create type public.opportunity_status as enum ('draft', 'published', 'closed');
create type public.application_status as enum ('pending', 'accepted', 'rejected', 'withdrawn', 'completed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  email text not null,
  role public.user_role not null default 'volunteer',
  bio text not null default '',
  location text not null default '',
  interests text[] not null default '{}',
  skills text[] not null default '{}',
  availability text not null default 'Flexible',
  experience text not null default 'Beginner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  name text not null,
  description text not null default '',
  location text not null default '',
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(title) between 4 and 160),
  description text not null check (char_length(description) >= 20),
  category text not null,
  location text not null,
  activity_date date not null,
  time_commitment text not null,
  application_deadline date not null,
  required_skills text[] not null default '{}',
  volunteer_capacity integer not null check (volunteer_capacity > 0),
  status public.opportunity_status not null default 'draft',
  contact_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (application_deadline <= activity_date)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  volunteer_id uuid not null references public.profiles(id) on delete cascade,
  status public.application_status not null default 'pending',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, volunteer_id)
);

create table public.saved_opportunities (
  volunteer_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (volunteer_id, opportunity_id)
);

create index opportunities_status_date_idx on public.opportunities(status, activity_date);
create index opportunities_category_idx on public.opportunities(category);
create index opportunities_location_idx on public.opportunities(location);
create index applications_volunteer_idx on public.applications(volunteer_id, status);
create index applications_opportunity_idx on public.applications(opportunity_id, status);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger organizations_updated_at before update on public.organizations for each row execute procedure public.set_updated_at();
create trigger opportunities_updated_at before update on public.opportunities for each row execute procedure public.set_updated_at();
create trigger applications_updated_at before update on public.applications for each row execute procedure public.set_updated_at();

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'administrator');
$$;
create or replace function public.is_organization_owner(target uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organizations where id = target and owner_id = auth.uid());
$$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.opportunities enable row level security;
alter table public.applications enable row level security;
alter table public.saved_opportunities enable row level security;

create policy "profiles are visible to their owner and admins" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "users create their own profile" on public.profiles for insert with check (id = auth.uid());
create policy "users update their own profile" on public.profiles for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

create policy "organizations are public when verified" on public.organizations for select using (verified or owner_id = auth.uid() or public.is_admin());
create policy "organization owners create their organization" on public.organizations for insert with check (owner_id = auth.uid());
create policy "organization owners manage their organization" on public.organizations for update using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());

create policy "published opportunities are public" on public.opportunities for select using (status = 'published' or public.is_organization_owner(organization_id) or public.is_admin());
create policy "organization owners create opportunities" on public.opportunities for insert with check (public.is_organization_owner(organization_id));
create policy "organization owners update opportunities" on public.opportunities for update using (public.is_organization_owner(organization_id) or public.is_admin()) with check (public.is_organization_owner(organization_id) or public.is_admin());
create policy "organization owners delete opportunities" on public.opportunities for delete using (public.is_organization_owner(organization_id) or public.is_admin());

create policy "volunteers see own applications and org owners see their queue" on public.applications for select using (volunteer_id = auth.uid() or exists (select 1 from public.opportunities o where o.id = opportunity_id and public.is_organization_owner(o.organization_id)) or public.is_admin());
create policy "volunteers apply once" on public.applications for insert with check (volunteer_id = auth.uid() and exists (select 1 from public.opportunities o where o.id = opportunity_id and o.status = 'published' and o.application_deadline >= current_date));
create policy "volunteers withdraw or owners review" on public.applications for update using (volunteer_id = auth.uid() or exists (select 1 from public.opportunities o where o.id = opportunity_id and public.is_organization_owner(o.organization_id)) or public.is_admin()) with check (volunteer_id = auth.uid() or exists (select 1 from public.opportunities o where o.id = opportunity_id and public.is_organization_owner(o.organization_id)) or public.is_admin());

create policy "volunteers manage their saved opportunities" on public.saved_opportunities for all using (volunteer_id = auth.uid()) with check (volunteer_id = auth.uid());
