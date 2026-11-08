-- Nagorik Voice: Setup 2 Admin Accounts (CC Admin and Govt Admin)
-- Fixed type uuid for auth.identities.id
-- Run this in Supabase Dashboard -> SQL Editor (New query) -> Run.

create extension if not exists pgcrypto;

do $$
declare
  cc_id uuid;
  govt_id uuid;
begin
  ---------------------------------------------------------------------
  -- 1. CC ADMIN (ccadmin@gmail.com / 12345678)
  ---------------------------------------------------------------------
  select id into cc_id from auth.users where email = 'ccadmin@gmail.com';

  if cc_id is null then
    cc_id := gen_random_uuid();
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      cc_id,
      'authenticated',
      'authenticated',
      'ccadmin@gmail.com',
      crypt('12345678', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"City Corporation Admin"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  else
    update auth.users
    set 
      encrypted_password = crypt('12345678', gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = '{"full_name":"City Corporation Admin"}'::jsonb,
      confirmation_token = '',
      email_change = '',
      email_change_token_new = '',
      recovery_token = '',
      updated_at = now()
    where id = cc_id;
  end if;


  ---------------------------------------------------------------------
  -- 2. GOVERNMENT ADMIN (govtadmin@gmail.com / 12345678)
  ---------------------------------------------------------------------
  select id into govt_id from auth.users where email = 'govtadmin@gmail.com';

  if govt_id is null then
    govt_id := gen_random_uuid();
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      govt_id,
      'authenticated',
      'authenticated',
      'govtadmin@gmail.com',
      crypt('12345678', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Government Officer"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  else
    update auth.users
    set 
      encrypted_password = crypt('12345678', gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = '{"full_name":"Government Officer"}'::jsonb,
      confirmation_token = '',
      email_change = '',
      email_change_token_new = '',
      recovery_token = '',
      updated_at = now()
    where id = govt_id;
  end if;


  ---------------------------------------------------------------------
  -- 3. ENSURE NO NULL STRINGS IN AUTH.USERS
  ---------------------------------------------------------------------
  update auth.users
  set 
    confirmation_token = '',
    email_change = '',
    email_change_token_new = '',
    recovery_token = ''
  where email in ('ccadmin@gmail.com', 'govtadmin@gmail.com');


  ---------------------------------------------------------------------
  -- 4. LINK AUTH IDENTITIES (id is UUID)
  ---------------------------------------------------------------------
  delete from auth.identities where user_id in (cc_id, govt_id);

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    cc_id,
    cc_id,
    format('{"sub":"%s","email":"%s"}', cc_id::text, 'ccadmin@gmail.com')::jsonb,
    'email',
    cc_id::text,
    now(),
    now(),
    now()
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    govt_id,
    govt_id,
    format('{"sub":"%s","email":"%s"}', govt_id::text, 'govtadmin@gmail.com')::jsonb,
    'email',
    govt_id::text,
    now(),
    now(),
    now()
  );


  ---------------------------------------------------------------------
  -- 5. ENSURE PROFILES EXIST
  ---------------------------------------------------------------------
  insert into public.profiles (id, full_name, username, city, avatar, is_banned)
  values (cc_id, 'City Corporation Admin', 'ccadmin', 'Dhaka, Bangladesh', 'CC', false)
  on conflict (id) do update set is_banned = false, full_name = 'City Corporation Admin';

  insert into public.profiles (id, full_name, username, city, avatar, is_banned)
  values (govt_id, 'Government Officer', 'govtadmin', 'Dhaka, Bangladesh', 'GO', false)
  on conflict (id) do update set is_banned = false, full_name = 'Government Officer';


  ---------------------------------------------------------------------
  -- 6. ASSIGN ADMIN ROLES
  ---------------------------------------------------------------------
  insert into public.admin_roles (user_id, role)
  values (cc_id, 'cc_officer')
  on conflict (user_id) do update set role = 'cc_officer';

  insert into public.admin_roles (user_id, role)
  values (govt_id, 'government_officer')
  on conflict (user_id) do update set role = 'government_officer';

end $$;

-- ফলাফল যাচাই করুন:
select 
  u.email,
  r.role,
  p.full_name,
  (u.email_confirmed_at is not null) as confirmed,
  (select count(*) from auth.identities i where i.user_id = u.id) as identities_count
from auth.users u
join public.admin_roles r on r.user_id = u.id
join public.profiles p on p.id = u.id
where u.email in ('ccadmin@gmail.com', 'govtadmin@gmail.com');
