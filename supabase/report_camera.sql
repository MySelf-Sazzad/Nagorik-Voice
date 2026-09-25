-- Run this once in Supabase SQL Editor for the existing project.
create table if not exists public.post_images (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  image_url text not null,
  image_order smallint not null default 1 check (image_order between 1 and 3),
  created_at timestamptz not null default now(),
  unique(post_id, image_order)
);

alter table public.post_images enable row level security;
drop policy if exists "Public read post images" on public.post_images;
drop policy if exists "Authors add images to own posts" on public.post_images;
create policy "Public read post images" on public.post_images for select using (true);
create policy "Authors add images to own posts" on public.post_images for insert to authenticated with check (exists(select 1 from public.posts where id = post_id and author_id = auth.uid()));
