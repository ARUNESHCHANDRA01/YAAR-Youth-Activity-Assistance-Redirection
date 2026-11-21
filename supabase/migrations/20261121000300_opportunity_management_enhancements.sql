-- Opportunity management, availability filtering and stricter application updates.

alter table public.opportunities
  add column if not exists availability text not null default 'Flexible',
  add column if not exists image_urls text[] not null default '{}';

insert into storage.buckets (id, name, public)
values ('opportunity-media', 'opportunity-media', true)
on conflict (id) do update set public = true;

drop policy if exists "opportunity media public read" on storage.objects;
create policy "opportunity media public read" on storage.objects for select
using (bucket_id = 'opportunity-media');

drop policy if exists "opportunity owners upload media" on storage.objects;
create policy "opportunity owners upload media" on storage.objects for insert to authenticated
with check (
  bucket_id = 'opportunity-media'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "opportunity owners delete media" on storage.objects;
create policy "opportunity owners delete media" on storage.objects for delete to authenticated
using (
  bucket_id = 'opportunity-media'
  and split_part(name, '/', 1) = auth.uid()::text
);

create index if not exists opportunities_availability_idx on public.opportunities(availability);

drop policy if exists "volunteers apply once" on public.applications;
create policy "volunteers apply once" on public.applications for insert with check (
  volunteer_id = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'volunteer')
  and exists (
    select 1 from public.opportunities o
    where o.id = opportunity_id
      and o.status = 'published'
      and o.review_status = 'approved'
      and o.application_deadline >= current_date
  )
);

drop policy if exists "volunteers withdraw or owners review" on public.applications;
create policy "volunteers withdraw or owners review" on public.applications for update
using (
  volunteer_id = auth.uid()
  or exists (
    select 1 from public.opportunities o
    where o.id = opportunity_id and public.is_organization_owner(o.organization_id)
  )
  or public.is_admin()
)
with check (
  (
    volunteer_id = auth.uid()
    and status = 'withdrawn'
  )
  or exists (
    select 1 from public.opportunities o
    where o.id = opportunity_id and public.is_organization_owner(o.organization_id)
  )
  or public.is_admin()
);
