# Live Supabase Role Setup

The React client now uses Supabase Auth and PostgreSQL when a live session exists. The prepared demo roles remain available as a fallback. To test organization and administrator workflows, provision test accounts in the Supabase dashboard.

## Enable Google sign-in

1. In Supabase, open **Authentication → Providers → Google** and enable the provider.
2. Create or select a Google OAuth web client in Google Cloud Console.
3. Add `https://<project-ref>.supabase.co/auth/v1/callback` as the Google OAuth authorized redirect URI.
4. Copy the Google client ID and client secret into the Supabase Google provider settings.
5. In Supabase **Authentication → URL Configuration**, allow `http://localhost:5173/login` and the deployed application's `/login` URL.

The login page calls `supabase.auth.signInWithOAuth({ provider: 'google' })`. Google profile metadata is used to create a volunteer profile automatically when the user signs in for the first time.

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

## Apply current opportunity-management migrations

From the project root, run:

```bash
npx supabase db push --remote
```

This applies the opportunity approval, seeded catalog and management-enhancement migrations. The latest migration adds availability filtering, opportunity photos through the `opportunity-media` Storage bucket, and restricts volunteers to withdrawing their own applications; organization owners and administrators retain management permissions.

For Edge Function deployment without Docker, run `npx supabase functions deploy recommend-opportunities --use-api --project-ref hddfdwhrromcxxyupymt`. The `--use-api` flag uploads the function through Supabase instead of building it with a local Docker container.

The volunteer dashboard includes the Y.A.A.R. Personal Opportunity Assistant. It is activated from the dashboard search card by submitting either “yaar bore ho raha hoon” or “yaar bore ho rahi hoon”. It asks for an interest, uses the volunteer profile location when available, and sends the interest plus eligible opportunity data to the same server-side recommendation function. If the function or OpenAI is unavailable, the client uses the deterministic recommendation fallback.

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
7. As an organization, edit, publish, unpublish, archive, reopen and delete only your own opportunity.
8. As a volunteer, verify skill, availability and date filters, then confirm unpublished and closed opportunities cannot be applied to.
