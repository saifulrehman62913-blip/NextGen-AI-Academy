-- Apply after 001-003. Child tokens are random, scoped, revocable and stored hashed.
begin;
alter table public.profiles add constraint profiles_id_owner_unique unique(id,owner_id);
-- Legacy consent remains unversioned until a parent explicitly grants new access.
alter table public.profiles add column parent_consent_version text;
create table public.child_consent_events (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 profile_id uuid not null,
 version text not null check(version='child-cloud-v1'),
 action text not null check(action in ('grant','revoke')),
 recorded_at timestamptz not null default clock_timestamp(),
 foreign key(profile_id,owner_id) references public.profiles(id,owner_id) on delete cascade
);
create table public.child_sessions (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 profile_id uuid not null,
 token_hash text not null unique check(token_hash ~ '^[0-9a-f]{64}$'),
 consent_version text not null check(consent_version='child-cloud-v1'),
 created_at timestamptz not null,
 expires_at timestamptz not null,
 foreign key(profile_id,owner_id) references public.profiles(id,owner_id) on delete cascade,
 check(expires_at=created_at+interval '24 hours')
);
create index child_sessions_profile on public.child_sessions(profile_id,created_at);
alter table public.child_sessions enable row level security;
alter table public.child_consent_events enable row level security;
revoke all on public.child_sessions,public.child_consent_events from anon,authenticated;
grant all on public.child_sessions,public.child_consent_events to service_role;
create function public.grant_child_session(p_owner uuid,p_profile uuid,p_hash text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare kind text; started timestamptz; result jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_profile::text,17));
 select p.kind into kind from profiles p where p.id=p_profile and p.owner_id=p_owner;
 if kind is distinct from 'child' then raise exception 'An owned child profile is required'; end if;
 delete from child_sessions where owner_id=p_owner and expires_at<=clock_timestamp();
 -- Keep at most five simultaneous devices per child, revoking the oldest first.
 if (select count(*) from child_sessions where profile_id=p_profile)>=5 then
  delete from child_sessions where id=(select id from child_sessions where profile_id=p_profile order by created_at limit 1);
 end if;
 started=clock_timestamp();
 update profiles set parent_consent_at=started,parent_consent_version='child-cloud-v1' where id=p_profile and owner_id=p_owner;
 insert into child_consent_events(owner_id,profile_id,version,action) values(p_owner,p_profile,'child-cloud-v1','grant');
 insert into child_sessions(owner_id,profile_id,token_hash,consent_version,created_at,expires_at)
 values(p_owner,p_profile,p_hash,'child-cloud-v1',started,started+interval '24 hours') returning to_jsonb(child_sessions.*) into result;
 return result;
end;
$$;
create function public.revoke_child_sessions(p_owner uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 insert into child_consent_events(owner_id,profile_id,version,action)
 select p_owner,p.id,'child-cloud-v1','revoke' from profiles p where p.owner_id=p_owner and p.kind='child';
 delete from child_sessions where owner_id=p_owner;
end;
$$;
revoke all on function public.grant_child_session(uuid,uuid,text),public.revoke_child_sessions(uuid) from public,anon,authenticated;
grant execute on function public.grant_child_session(uuid,uuid,text),public.revoke_child_sessions(uuid) to service_role;
commit;
