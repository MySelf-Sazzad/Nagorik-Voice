-- Nagorik Voice: Post Approval Migration
-- Run this in Supabase Dashboard -> SQL Editor (New query) -> Run.

-- 1. Add is_approved and rejected columns to public.posts
alter table public.posts add column if not exists is_approved boolean not null default false;
alter table public.posts add column if not exists rejected boolean not null default false;

-- 2. Mark existing older posts as approved so the current feed stays visible
update public.posts set is_approved = true where is_approved is false and created_at < now() - interval '1 minute';

-- 3. Function for CC Officers to approve a pending citizen post
create or replace function public.approve_cc_post(post_id bigint)
returns public.posts language plpgsql security definer set search_path = public as $$
declare result public.posts;
begin
  if not public.is_officer('cc_officer') then 
    raise exception 'CC officer access required'; 
  end if;
  
  update public.posts 
  set is_approved = true, updated_at = now() 
  where id = post_id 
  returning * into result;
  
  if result.id is null then 
    raise exception 'Post not found'; 
  end if;

  insert into public.post_status_history(post_id, changed_by, status, note) 
  values (post_id, auth.uid(), result.status, 'Post approved and published to public feed by CC Officer');

  return result;
end;
$$;

-- 4. Function for CC Officers to reject a pending citizen post
create or replace function public.reject_cc_post(post_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_officer('cc_officer') then 
    raise exception 'CC officer access required'; 
  end if;
  
  delete from public.posts where id = post_id;
end;
$$;

-- Verify post approval setup
select count(*) as total_posts,
       count(*) filter (where is_approved is true) as approved_posts,
       count(*) filter (where is_approved is false) as pending_posts
from public.posts;
