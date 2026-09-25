-- Nagorik Voice production database. Run this whole file once in
-- Supabase Dashboard -> SQL Editor -> New query.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  username text unique not null,
  city text not null default 'Dhaka, Bangladesh',
  avatar text not null default 'NV',
  avatar_url text,
  cover_url text,
  phone text,
  address text,
  is_banned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id bigint generated always as identity primary key,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 140),
  description text not null check (char_length(description) between 10 and 5000),
  location text not null,
  district text not null default 'Dhaka',
  category text not null,
  status text not null default 'Reported' check (status in ('Reported','Acknowledged','Under Review','In Progress','Resolved')),
  severity text not null default 'Medium' check (severity in ('Low','Medium','High','Critical')),
  image_url text,
  latitude double precision,
  longitude double precision,
  supports integer not null default 0 check (supports >= 0),
  comments integer not null default 0 check (comments >= 0),
  shares integer not null default 0 check (shares >= 0),
  sent_to_government boolean not null default false,
  government_description text,
  government_start_date date,
  government_approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null check (role in ('cc_officer','government_officer')),
  created_at timestamptz not null default now()
);

create table if not exists public.post_status_history (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  changed_by uuid references public.profiles(id) on delete set null,
  status text not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.post_images (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  image_url text not null,
  image_order smallint not null default 1 check (image_order between 1 and 3),
  created_at timestamptz not null default now(),
  unique(post_id, image_order)
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_username text;
begin
  base_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), '[^a-zA-Z0-9]+', '.', 'g'));
  base_username := trim(both '.' from base_username);
  insert into public.profiles (id, full_name, username, city, avatar)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    base_username || '.' || substr(replace(new.id::text, '-', ''), 1, 6),
    coalesce(new.raw_user_meta_data->>'city', 'Dhaka, Bangladesh'),
    coalesce(new.raw_user_meta_data->>'avatar', 'NV')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_officer(required_role text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.admin_roles where user_id = auth.uid() and role = required_role);
$$;

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.admin_roles enable row level security;
alter table public.post_status_history enable row level security;
alter table public.post_images enable row level security;

drop policy if exists "Public can view active profiles" on public.profiles;
drop policy if exists "Users update own profile" on public.profiles;
drop policy if exists "Users read their role" on public.admin_roles;
drop policy if exists "Public can read posts" on public.posts;
drop policy if exists "Authenticated users create own posts" on public.posts;
drop policy if exists "Authors may edit own post" on public.posts;
drop policy if exists "Public read history" on public.post_status_history;
drop policy if exists "Public read post images" on public.post_images;
drop policy if exists "Authors add images to own posts" on public.post_images;
create policy "Public can view active profiles" on public.profiles for select using (not is_banned or id = auth.uid() or public.is_officer('cc_officer') or public.is_officer('government_officer'));
create policy "Users update own profile" on public.profiles for update using (id = auth.uid() and not is_banned) with check (id = auth.uid());
create policy "Users read their role" on public.admin_roles for select using (user_id = auth.uid());
create policy "Public can read posts" on public.posts for select using (true);
create policy "Authenticated users create own posts" on public.posts for insert to authenticated with check (author_id = auth.uid() and exists(select 1 from public.profiles where id = auth.uid() and not is_banned));
create policy "Authors may edit own post" on public.posts for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "Public read history" on public.post_status_history for select using (true);
create policy "Public read post images" on public.post_images for select using (true);
create policy "Authors add images to own posts" on public.post_images for insert to authenticated with check (exists(select 1 from public.posts where id = post_id and author_id = auth.uid()));

create or replace function public.set_cc_post_status(post_id bigint, new_status text)
returns public.posts language plpgsql security definer set search_path = public as $$
declare result public.posts;
begin
  if not public.is_officer('cc_officer') then raise exception 'CC officer access required'; end if;
  update public.posts set status = new_status, updated_at = now() where id = post_id returning * into result;
  if result.id is null then raise exception 'Post not found'; end if;
  insert into public.post_status_history(post_id, changed_by, status) values (post_id, auth.uid(), new_status);
  return result;
end;
$$;

create or replace function public.forward_to_government(post_id bigint)
returns public.posts language plpgsql security definer set search_path = public as $$
declare result public.posts;
begin
  if not public.is_officer('cc_officer') then raise exception 'CC officer access required'; end if;
  update public.posts set sent_to_government = true, updated_at = now() where id = post_id returning * into result;
  if result.id is null then raise exception 'Post not found'; end if;
  return result;
end;
$$;

create or replace function public.approve_government_post(post_id bigint, work_description text, work_start_date date)
returns public.posts language plpgsql security definer set search_path = public as $$
declare result public.posts;
begin
  if not public.is_officer('government_officer') then raise exception 'Government officer access required'; end if;
  update public.posts set status = 'In Progress', government_description = work_description, government_start_date = work_start_date, government_approved_at = now(), updated_at = now()
  where id = post_id and sent_to_government = true returning * into result;
  if result.id is null then raise exception 'Eligible case not found'; end if;
  insert into public.post_status_history(post_id, changed_by, status, note) values (post_id, auth.uid(), 'In Progress', work_description);
  return result;
end;
$$;

create or replace function public.remove_government_case(post_id bigint)
returns public.posts language plpgsql security definer set search_path = public as $$
declare result public.posts;
begin
  if not public.is_officer('government_officer') then raise exception 'Government officer access required'; end if;
  update public.posts set sent_to_government = false, government_description = null, government_start_date = null, government_approved_at = null, updated_at = now()
  where id = post_id returning * into result;
  if result.id is null then raise exception 'Post not found'; end if;
  return result;
end;
$$;

create or replace function public.remove_approval(post_id bigint)
returns public.posts language plpgsql security definer set search_path = public as $$
declare result public.posts;
begin
  if not public.is_officer('government_officer') then raise exception 'Government officer access required'; end if;
  update public.posts set government_description = null, government_start_date = null, government_approved_at = null, updated_at = now()
  where id = post_id returning * into result;
  if result.id is null then raise exception 'Post not found'; end if;
  return result;
end;
$$;

create or replace function public.delete_cc_post(post_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_officer('cc_officer') then raise exception 'CC officer access required'; end if;
  delete from public.posts where id = post_id;
end;
$$;

create or replace function public.ban_citizen(citizen_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_officer('cc_officer') then raise exception 'CC officer access required'; end if;
  update public.profiles set is_banned = true, updated_at = now() where id = citizen_id;
  delete from public.posts where author_id = citizen_id;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Public image access" on storage.objects;
drop policy if exists "Users upload own post images" on storage.objects;
drop policy if exists "Users delete own post images" on storage.objects;
create policy "Public image access" on storage.objects for select using (bucket_id = 'post-images');
create policy "Users upload own post images" on storage.objects for insert to authenticated with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users delete own post images" on storage.objects for delete to authenticated using (bucket_id = 'post-images' and owner_id = auth.uid()::text);

-- After creating your officer accounts in the website, run one of these with their auth user UUID:
-- insert into public.admin_roles(user_id, role) values ('OFFICER_UUID', 'cc_officer');
-- insert into public.admin_roles(user_id, role) values ('OFFICER_UUID', 'government_officer');
