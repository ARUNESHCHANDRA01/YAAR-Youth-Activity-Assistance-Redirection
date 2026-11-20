-- Allow volunteers to submit opportunity proposals for administrator review.
-- Apply after 20261119000100_role_protection_and_applicant_visibility.sql.

do $$
begin
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'opportunity_review_status') then
    create type public.opportunity_review_status as enum ('pending', 'approved', 'rejected');
  end if;
end;
$$;

alter table public.opportunities alter column organization_id drop not null;
alter table public.opportunities add column if not exists created_by uuid;
alter table public.opportunities add column if not exists review_status public.opportunity_review_status not null default 'approved';

update public.opportunities o
set created_by = org.owner_id
from public.organizations org
where org.id = o.organization_id
  and o.created_by is null;

alter table public.opportunities alter column created_by set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'opportunities_created_by_fkey') then
    alter table public.opportunities
      add constraint opportunities_created_by_fkey foreign key (created_by) references public.profiles(id) on delete cascade;
  end if;
end;
$$;

create index if not exists opportunities_created_by_idx on public.opportunities(created_by, review_status);

drop policy if exists "published opportunities are public" on public.opportunities;
create policy "published opportunities are public" on public.opportunities for select using (
  (status = 'published' and review_status = 'approved')
  or public.is_organization_owner(organization_id)
  or public.is_admin()
);

drop policy if exists "volunteers view their opportunity proposals" on public.opportunities;
create policy "volunteers view their opportunity proposals" on public.opportunities for select using (
  created_by = auth.uid()
);

drop policy if exists "volunteers submit opportunity proposals" on public.opportunities;
create policy "volunteers submit opportunity proposals" on public.opportunities for insert with check (
  created_by = auth.uid()
  and organization_id is null
  and status = 'draft'
  and review_status = 'pending'
);

drop policy if exists "volunteers edit pending opportunity proposals" on public.opportunities;
create policy "volunteers edit pending opportunity proposals" on public.opportunities for update using (
  created_by = auth.uid()
  and review_status in ('pending', 'rejected')
) with check (
  created_by = auth.uid()
  and organization_id is null
  and status = 'draft'
  and review_status = 'pending'
);
