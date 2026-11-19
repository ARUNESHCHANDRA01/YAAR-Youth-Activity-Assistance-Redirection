# Live Supabase Role Setup

The React client now uses Supabase Auth and PostgreSQL when a live session exists. The prepared demo roles remain available as a fallback. To test organization and administrator workflows, provision test accounts in the Supabase dashboard.

## Apply the follow-up security migration

Run `supabase/migrations/20261119000100_role_protection_and_applicant_visibility.sql` in the Supabase SQL Editor after the initial migration. This prevents ordinary users from changing their own role and lets an organization view the profiles attached to its own applications.

## Provision a test organization

1. Register a new account through the Y.A.A.R. live sign-up form.
2. In Supabase, open Authentication and copy that user's UUID.
3. In SQL Editor, replace the placeholder UUID and run:

```sql
update public.profiles
set role = 'organization', name = 'GreenSteps Foundation', bio = 'Community environmental action.', location = 'Greater Noida'
where id = 'AUTH_USER_UUID';

insert into public.organizations (owner_id, name, description, location, verified)
values ('AUTH_USER_UUID', 'GreenSteps Foundation', 'Community environmental action.', 'Greater Noida', true);
```

The SQL Editor is a privileged administrative surface. Do not run role-provisioning SQL from the browser client.

## Provision a test administrator

1. Register another account through the live sign-up form.
2. Copy its Auth UUID.
3. Run this in the Supabase SQL Editor:

```sql
update public.profiles
set role = 'administrator', name = 'Y.A.A.R. Administrator'
where id = 'AUTH_ADMIN_UUID';
```

## End-to-end test order

1. Sign in as the organization account and create an opportunity.
2. Sign out and sign in as a volunteer.
3. Apply to the opportunity and update the volunteer profile.
4. Sign in as the organization and accept or reject the application.
5. Sign in as the administrator and confirm the overview is restricted to administrator navigation.
6. Attempt to access an unrelated application or opportunity to verify RLS denies it.
