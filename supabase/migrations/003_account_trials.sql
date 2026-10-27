-- Apply after 001 and 002. One explicit, non-renewing 72-hour trial per auth account.
begin;
-- Published course bodies are now delivered by the entitlement-checked backend.
-- Keep the existing admin-read policy; remove anonymous/general published reads.
drop policy published_courses on public.course_drafts;
revoke select on public.course_drafts from anon;
create table public.account_trials (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 started_at timestamptz not null,
 expires_at timestamptz not null,
 check(expires_at = started_at + interval '72 hours')
);
alter table public.account_trials enable row level security;
create policy own_trial on public.account_trials for select to authenticated using(owner_id=auth.uid());
revoke all on public.account_trials from anon,authenticated;
grant select on public.account_trials to authenticated;
grant all on public.account_trials to service_role;

create or replace function public.start_account_trial(p_owner uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare started timestamptz=clock_timestamp(); result jsonb;
begin
 insert into public.account_trials(owner_id,started_at,expires_at)
 values(p_owner,started,started+interval '72 hours') on conflict(owner_id) do nothing;
 select to_jsonb(t) into result from public.account_trials t where t.owner_id=p_owner;
 return result;
end;
$$;
revoke all on function public.start_account_trial(uuid) from public,anon,authenticated;
grant execute on function public.start_account_trial(uuid) to service_role;
commit;
