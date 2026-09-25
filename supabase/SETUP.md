# Nagorik Voice — Supabase setup

1. Open your Supabase project, then go to **SQL Editor** → **New query**.
2. Copy the full contents of `schema.sql`, paste it, and choose **Run** once.
3. In **Authentication** → **Providers** → **Email**, enable email/password sign-in. Keep email confirmation enabled for a live site.
4. Create or register the two officer accounts, then run the appropriate commands below in SQL Editor:

```sql
insert into public.admin_roles (user_id, role)
select id, 'cc_officer' from auth.users where email = 'cc-officer@example.com'
on conflict (user_id) do update set role = excluded.role;

insert into public.admin_roles (user_id, role)
select id, 'government_officer' from auth.users where email = 'government-officer@example.com'
on conflict (user_id) do update set role = excluded.role;
```

5. For production, add the deployed domain to **Authentication** → **URL Configuration** → **Site URL** and **Redirect URLs** after Vercel is connected.

The real publishable key belongs only in `.env.local` for local development and in the Vercel environment variables for deployment. Never expose the database password or `service_role` key in the website.
