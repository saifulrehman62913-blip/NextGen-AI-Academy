-- Disposable CI database only. These roles/functions stand in for Supabase auth.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
create function auth.jwt() returns jsonb language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb
$$;
grant usage on schema public,auth to anon,authenticated,service_role;
grant execute on function auth.uid(),auth.jwt() to anon,authenticated,service_role;
alter default privileges in schema public grant all on tables to service_role;
insert into auth.users(id) values
 ('11111111-1111-4111-a111-111111111111'),
 ('22222222-2222-4222-a222-222222222222');
