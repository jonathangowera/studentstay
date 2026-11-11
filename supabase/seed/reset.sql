-- =====================================================================
-- StudentStay: RESET (TEST PROJECTS ONLY)
-- Deletes every StudentStay table, view, function, type and sequence in the "public" schema, with all their data.
-- It does NOT delete sign-in users (Authentication > Users) and does NOT delete uploaded files.
-- Use it to start over: run this, then the schema migration, then demo_data.sql.
-- Do not run it on a database that holds anything you want to keep.
-- =====================================================================
drop trigger if exists on_auth_user_created on auth.users;
drop view if exists public.private_application_inbox, public.listing_cards;

do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('drop table if exists public.%I cascade', r.tablename);
  end loop;
  for r in select p.oid::regprocedure as f from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f' loop
    execute 'drop function if exists ' || r.f || ' cascade';
  end loop;
  for r in select t.typname from pg_type t where t.typnamespace = 'public'::regnamespace and t.typtype = 'e' loop
    execute format('drop type if exists public.%I cascade', r.typname);
  end loop;
  for r in select sequencename from pg_sequences where schemaname = 'public' loop
    execute format('drop sequence if exists public.%I cascade', r.sequencename);
  end loop;
  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists "documents upload own folder" on storage.objects';
    execute 'drop policy if exists "documents read own folder" on storage.objects';
  end if;
end $$;
