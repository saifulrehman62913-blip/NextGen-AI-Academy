-- Apply AFTER 001_ilmigo.sql. Preserves existing profiles/completions/courses.
begin;
create table if not exists public.practice_days (
 profile_id uuid not null references public.profiles(id) on delete cascade,
 day date not null,
 primary key(profile_id,day)
);
alter table public.practice_days enable row level security;
create policy own_practice_days on public.practice_days for select to authenticated
 using(exists(select 1 from public.profiles p where p.id=profile_id and p.owner_id=auth.uid()));
revoke insert,update,delete on public.practice_days from anon,authenticated;
grant select on public.practice_days to authenticated;
grant all on public.practice_days to service_role;
insert into public.practice_days(profile_id,day) select profile_id,completed_on from public.attempts on conflict do nothing;
-- Atomic monotonic completion update: delayed/offline devices cannot move dates backwards.
create or replace function public.sync_completion(p_profile uuid,p_lesson text,p_date date)
returns void language plpgsql security definer set search_path=public as $$
begin
 if p_date > (now() at time zone 'UTC')::date + 1 then raise exception 'Invalid future date'; end if;
 insert into public.attempts(profile_id,lesson_id,completed_on,score) values(p_profile,p_lesson,p_date,1)
 on conflict(profile_id,lesson_id) do update set completed_on=greatest(attempts.completed_on,excluded.completed_on),score=1;
 insert into public.practice_days(profile_id,day) values(p_profile,p_date) on conflict do nothing;
end;
$$;
revoke all on function public.sync_completion(uuid,text,date) from public,anon,authenticated;
grant execute on function public.sync_completion(uuid,text,date) to service_role;
-- Keep a non-identifying review audit identity after an auth account is deleted.
alter table public.course_drafts add column reviewer_audit_id uuid;
update public.course_drafts set reviewer_audit_id=gen_random_uuid() where reviewer_id is not null;
do $$ declare c record; begin
 for c in select conname from pg_constraint where conrelid='public.course_drafts'::regclass and contype='c' and pg_get_constraintdef(oid) like '%reviewer_id%'
 loop execute format('alter table public.course_drafts drop constraint %I',c.conname); end loop;
end $$;
alter table public.course_drafts drop constraint course_drafts_reviewer_id_fkey;
alter table public.course_drafts add constraint course_drafts_reviewer_id_fkey foreign key(reviewer_id) references auth.users(id) on delete set null;
alter table public.course_drafts add constraint published_review_audit check(status <> 'published' or (reviewer_audit_id is not null and length(review_note)>0));
-- Enforce family size transactionally, even with concurrent requests.
create or replace function public.check_family_limit() returns trigger language plpgsql set search_path=public as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text,0));
 if not exists(select 1 from profiles where owner_id=new.owner_id and local_key=new.local_key)
 and (select count(*) from profiles where owner_id=new.owner_id)>=12 then raise exception 'Family profile limit reached'; end if;
 return new;
end $$;
create trigger family_limit before insert on public.profiles for each row execute function public.check_family_limit();
commit;
