#!/bin/bash
# Rebuilds an empty test database with stand-ins for what Supabase provides.
pg_ctlcluster 16 main status >/dev/null 2>&1 || pg_ctlcluster 16 main start
sleep 2
su postgres -c "psql -q -c 'drop database if exists sstest' -c 'create database sstest'" 2>&1 | grep -v NOTICE
su postgres -c "psql -q -v ON_ERROR_STOP=1 -d sstest" <<'EOF'
do $$ begin
  if not exists (select from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(), email text unique,
  raw_user_meta_data jsonb default '{}'::jsonb, raw_app_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  email_confirmed_at timestamptz, instance_id uuid, aud text, role text, encrypted_password text,
  confirmation_token text, recovery_token text, email_change_token_new text, email_change text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
create schema extensions;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean default false);
create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security;
create function storage.foldername(n text) returns text[] language sql as $f$ select (string_to_array(n,'/'))[1:array_length(string_to_array(n,'/'),1)-1] $f$;
grant usage on schema storage to anon, authenticated, service_role;
grant select, insert on storage.objects to authenticated;
grant select on storage.buckets to authenticated;
grant usage on schema public, extensions to anon, authenticated, service_role;
EOF
