-- Run this once in Supabase SQL Editor for the existing project.
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists cover_url text;
