-- 1) First create these two accounts in Supabase Dashboard -> Authentication -> Users -> Add user.
--    Use email addresses that the real officers control, and choose strong passwords.
-- 2) Replace BOTH placeholder email addresses below, then run this file in SQL Editor.

insert into public.admin_roles (user_id, role)
select id, 'cc_officer'
from auth.users
where email = 'YOUR_CC_OFFICER_EMAIL@example.com'
on conflict (user_id) do update set role = excluded.role;

insert into public.admin_roles (user_id, role)
select id, 'government_officer'
from auth.users
where email = 'YOUR_GOVERNMENT_OFFICER_EMAIL@example.com'
on conflict (user_id) do update set role = excluded.role;

-- Check that both roles were added successfully:
select u.email, r.role
from public.admin_roles r
join auth.users u on u.id = r.user_id
order by r.role;
