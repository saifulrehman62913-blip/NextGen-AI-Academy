-- Apply once in Supabase SQL editor (Postgres 15+).
create extension if not exists pgcrypto;
create table public.profiles (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 local_key text not null check(length(local_key) between 1 and 64),
 name text not null check(length(name) between 1 and 40),
 kind text not null check(kind in ('adult','child')),
 language text not null default 'en',
 goal text not null default 'Everyday conversation',
 parent_consent_at timestamptz,
 created_at timestamptz not null default now(),
 unique(owner_id,local_key),
 check(kind <> 'child' or parent_consent_at is not null)
);
create table public.attempts (
 profile_id uuid not null references public.profiles(id) on delete cascade,
 lesson_id text not null,
 completed_on date not null,
 score numeric not null check(score between 0 and 1),
 primary key(profile_id,lesson_id)
);
create table public.ai_usage (
 owner_id uuid not null references auth.users(id) on delete cascade,
 day date not null,
 turns integer not null default 0,
 primary key(owner_id,day)
);
create table public.course_drafts (
 language text primary key,
 status text not null default 'draft' check(status in ('draft','review','published')),
 lessons jsonb not null check(jsonb_typeof(lessons)='array'),
 review_note text not null default '',
 reviewer_id uuid references auth.users(id),
 updated_at timestamptz not null default now(),
 check(status <> 'published' or (reviewer_id is not null and length(review_note)>0))
);
create index profiles_owner on public.profiles(owner_id);
alter table public.profiles enable row level security;
alter table public.attempts enable row level security;
alter table public.ai_usage enable row level security;
alter table public.course_drafts enable row level security;
-- Client access is read-only. Mutations pass through the authenticated backend,
-- which verifies ownership before using the server-only service role.
create policy own_profiles on public.profiles for select to authenticated using(owner_id=auth.uid());
create policy own_attempts on public.attempts for select to authenticated using(exists(select 1 from public.profiles p where p.id=profile_id and p.owner_id=auth.uid()));
create policy own_usage on public.ai_usage for select to authenticated using(owner_id=auth.uid());
create policy published_courses on public.course_drafts for select using(status='published');
create policy admin_read_drafts on public.course_drafts for select to authenticated using((auth.jwt()->'app_metadata'->>'role')='admin');
-- Atomic daily quota reservation; only the backend service role may invoke it.
create or replace function public.reserve_ai_turn(p_owner uuid,p_limit integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 if p_limit < 1 or p_limit > 20 then return false; end if;
 insert into public.ai_usage(owner_id,day,turns) values(p_owner,(now() at time zone 'UTC')::date,1)
 on conflict(owner_id,day) do update set turns=ai_usage.turns+1 where ai_usage.turns < p_limit
 returning turns into n;
 return n is not null;
end;
$$;
revoke all on function public.reserve_ai_turn(uuid,integer) from public,anon,authenticated;
grant execute on function public.reserve_ai_turn(uuid,integer) to service_role;
revoke insert,update,delete on public.profiles,public.attempts,public.ai_usage,public.course_drafts from anon,authenticated;
grant select on public.profiles,public.attempts,public.ai_usage,public.course_drafts to authenticated;
grant select on public.course_drafts to anon;
