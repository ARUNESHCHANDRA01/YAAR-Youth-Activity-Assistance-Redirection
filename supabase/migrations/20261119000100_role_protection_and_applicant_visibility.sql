-- Follow-up security migration for live role workflows.
-- Apply after 20261118000100_initial_yaar.sql.

create or replace function public.prevent_role_escalation() returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- SQL Editor/service-role administration has no end-user auth.uid() and may provision roles.
  if auth.uid() is null or public.is_admin() then return new; end if;
  if old.role is distinct from new.role then
    raise exception 'role changes require administrator approval';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_role_protection on public.profiles;
create trigger profiles_role_protection before update on public.profiles for each row execute procedure public.prevent_role_escalation();

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'organizations can view applicant profiles') then
    create policy "organizations can view applicant profiles" on public.profiles for select using (
      exists (
        select 1
        from public.applications a
        join public.opportunities o on o.id = a.opportunity_id
        where a.volunteer_id = profiles.id
          and public.is_organization_owner(o.organization_id)
      )
      or public.is_admin()
    );
  end if;
end;
$$;
