-- =====================================================================
-- StudentStay: initial database schema (PostgreSQL / Supabase)
-- Source of truth: docs/StudentStay_PRD_v0.9.docx (FR1 to FR12, section 6 states)
-- Run ONCE in the Supabase SQL Editor (or `supabase db push`).
-- To start over in a test project, run supabase/seed/reset.sql first.
-- =====================================================================

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;  -- needed for the no-double-booking rule

-- ---------------------------------------------------------------------
-- 1. ENUMS  (the state lists from PRD section 6)
-- ---------------------------------------------------------------------
create type user_role          as enum ('student','owner','university_admin','technician','system_admin');
create type listing_type       as enum ('university_hostel','recognised_boarding_house','private_rental');
create type gender_policy      as enum ('female_only','male_only','mixed');
create type moderation_state   as enum ('draft','awaiting_moderation','published','requires_review','suspended');
create type room_type          as enum ('single','double','triple','quad');
create type bed_state          as enum ('available','held','pending_approval','reserved','occupied','blocked_for_maintenance');
create type booking_state      as enum ('reserved','occupied','cancelled','expired','released');
create type application_route  as enum ('university_allocation','private');
create type application_status as enum ('draft','submitted','profile_incomplete','under_review','recommended','pending_approval','approved','accepted','declined','no_eligible_room','withdrawn','expired');
create type payment_status     as enum ('pending','successful','failed','refunded');
create type payment_purpose    as enum ('application_fee','deposit','rent');
create type ticket_status      as enum ('pending','assigned','in_progress','completed','reopened','escalated','cancelled');
create type ticket_priority    as enum ('low','medium','high');
create type document_kind      as enum ('national_id','proof_of_enrolment','ownership_proof');
create type check_result       as enum ('clear','unclear','possible_duplicate');       -- automated check (FR11.3)
create type review_decision    as enum ('pending','verified','resubmission_required','requires_review');  -- human review (FR11.5)
create type audience_kind      as enum ('all','institution','listing','role','users');
create type allocation_decision as enum ('pending','approved','modified','rejected','rerun');

-- sequences for human-readable references
create sequence application_ref_seq start 1000;
create sequence payment_ref_seq     start 30900;
create sequence ticket_ref_seq      start 1100;

-- ---------------------------------------------------------------------
-- 2. TABLES
-- ---------------------------------------------------------------------
create table institutions (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  name       text not null,
  status     text not null default 'active' check (status in ('active','validation_pending')),
  created_at timestamptz not null default now()
);

-- One profile per sign-in account. Created automatically by a trigger on auth.users.
create table profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  role                  user_role not null default 'student',
  full_name             text not null default '',
  phone                 text,
  institution_id        uuid references institutions(id) on delete set null,
  student_number        text,
  student_number_matched boolean not null default false,   -- confirmed by an administrator, not by the student
  programme             text,
  study_year            smallint check (study_year between 1 and 7),
  preferred_room_type   room_type,
  budget_zmw            numeric(10,2) check (budget_zmw >= 0),
  preferred_facilities  text[] not null default '{}',
  emergency_contact     text,
  notify_sms            boolean not null default false,
  owner_can_see_profile boolean not null default true,     -- OD-02: owners see limited applicant details
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create unique index profiles_student_number_uq on profiles (institution_id, student_number) where student_number is not null;

-- A partner is a property owner or operator. owner_id is null for demo partners with no login.
create table partners (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid references profiles(id) on delete set null,
  business_name  text not null,
  contact_phone  text,
  verification   review_decision not null default 'pending',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table listings (
  id               uuid primary key default gen_random_uuid(),
  partner_id       uuid not null references partners(id) on delete restrict,
  institution_id   uuid references institutions(id),        -- set for university-run hostels
  name             text not null,
  type             listing_type not null,
  area             text not null,
  address          text,
  description      text,
  house_rules      text,
  gender           gender_policy not null default 'mixed',
  gender_note      text,
  facilities       text[] not null default '{}',            -- wifi, water, power, guard, cctv, fire, study, laundry
  rent_unit        text not null default 'month' check (rent_unit in ('month','term')),
  deposit_note     text,
  min_stay_note    text,
  moderation       moderation_state not null default 'draft',
  moderation_note  text,
  verification     review_decision not null default 'pending',  -- badge: "Verified listing information" etc. Never a safety claim.
  last_updated_at  timestamptz not null default now(),      -- drives the 30-day stale flag (FR2.6)
  lat              numeric(9,6),
  lng              numeric(9,6),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (type <> 'university_hostel' or institution_id is not null)
);
create index listings_moderation_idx on listings (moderation);
create index listings_facilities_gin on listings using gin (facilities);

-- distance to each campus, and whether the institution recognises (partners with) the listing
create table listing_distances (
  listing_id     uuid not null references listings(id) on delete cascade,
  institution_id uuid not null references institutions(id) on delete cascade,
  distance_km    numeric(5,1) not null check (distance_km >= 0),
  partnered      boolean not null default false,
  primary key (listing_id, institution_id)
);

create table rooms (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references listings(id) on delete cascade,
  room_number text not null,
  room_type   room_type not null,
  capacity    smallint not null check (capacity between 1 and 12),
  price_zmw   numeric(10,2) not null check (price_zmw >= 0),
  wing        text,
  floor       smallint,
  gender      gender_policy,                                -- optional override of the listing policy
  created_at  timestamptz not null default now(),
  unique (listing_id, room_number),
  check ((room_type='single' and capacity=1) or (room_type='double' and capacity=2)
      or (room_type='triple' and capacity=3) or (room_type='quad'   and capacity=4))
);

create table beds (
  id                       uuid primary key default gen_random_uuid(),
  room_id                  uuid not null references rooms(id) on delete cascade,
  label                    text not null,
  state                    bed_state not null default 'available',
  state_note               text,
  state_changed_at         timestamptz not null default now(),
  state_changed_by         uuid references profiles(id) on delete set null,
  hold_expires_at          timestamptz,
  held_for_application_id  uuid,                             -- FK added after applications exist
  created_at               timestamptz not null default now(),
  unique (room_id, label),
  check (hold_expires_at is null or state = 'held')
);
create index beds_room_idx  on beds (room_id);
create index beds_state_idx on beds (state);

create table applications (
  id                   uuid primary key default gen_random_uuid(),
  reference            text not null unique default ('APP-' || extract(year from now())::int || '-' || lpad(nextval('application_ref_seq')::text, 4, '0')),
  student_id           uuid not null references profiles(id) on delete cascade,
  route                application_route not null,
  institution_id       uuid references institutions(id),
  listing_id           uuid references listings(id),         -- target for private applications
  requested_room_type  room_type,
  budget_zmw           numeric(10,2) check (budget_zmw >= 0),
  gender_needed        gender_policy,
  intake               text,
  preferred_facilities text[] not null default '{}',
  status               application_status not null default 'draft',
  status_reason        text,
  submitted_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (route <> 'private' or listing_id is not null),
  check (route <> 'university_allocation' or institution_id is not null)
);
create index applications_student_idx on applications (student_id);
create index applications_status_idx  on applications (status);
-- a student cannot have two open applications to the same listing (FR4.7)
create unique index applications_one_open_per_listing on applications (student_id, listing_id)
  where listing_id is not null and status not in ('declined','withdrawn','expired','no_eligible_room');

alter table beds add constraint beds_held_for_fk foreign key (held_for_application_id) references applications(id) on delete set null;

create table application_events (
  id             bigint generated always as identity primary key,
  application_id uuid not null references applications(id) on delete cascade,
  from_status    application_status,
  to_status      application_status not null,
  actor_id       uuid,
  note           text,
  created_at     timestamptz not null default now()
);
create index application_events_app_idx on application_events (application_id, created_at);

create table allocation_rules (
  id               uuid primary key default gen_random_uuid(),
  institution_id   uuid not null references institutions(id) on delete cascade,
  name             text not null,
  version          int not null,
  hard_constraints jsonb not null default '{"bed_free":true,"gender_policy":true,"room_type":true,"budget_ceiling":true,"institution_eligible":true}',
  w_room_type      smallint not null check (w_room_type    between 0 and 100),
  w_budget         smallint not null check (w_budget       between 0 and 100),
  w_distance       smallint not null check (w_distance     between 0 and 100),
  w_facilities     smallint not null check (w_facilities   between 0 and 100),
  w_availability   smallint not null check (w_availability between 0 and 100),
  active           boolean not null default false,
  created_by       uuid references profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  unique (institution_id, version),
  check (w_room_type + w_budget + w_distance + w_facilities + w_availability = 100)    -- FR5.3
);
create unique index allocation_rules_one_active on allocation_rules (institution_id) where active;

create table allocation_runs (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  rule_id        uuid not null references allocation_rules(id) on delete restrict,
  run_by         uuid references profiles(id) on delete set null,
  explanation    text,
  decision       allocation_decision not null default 'pending',
  decided_by     uuid references profiles(id) on delete set null,
  decided_at     timestamptz,
  decision_note  text,
  approved_bed_id uuid references beds(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index allocation_runs_app_idx on allocation_runs (application_id);

create table allocation_candidates (
  id                 uuid primary key default gen_random_uuid(),
  run_id             uuid not null references allocation_runs(id) on delete cascade,
  room_id            uuid not null references rooms(id) on delete cascade,
  bed_id             uuid references beds(id) on delete set null,
  excluded           boolean not null default false,
  exclusion_reason   text,
  rank               smallint,
  score_total        numeric(5,2),
  score_room_type    numeric(5,2),
  score_budget       numeric(5,2),
  score_distance     numeric(5,2),
  score_facilities   numeric(5,2),
  score_availability numeric(5,2),
  explanation        text,
  check ((excluded and exclusion_reason is not null) or (not excluded and rank is not null and bed_id is not null))   -- FR5.2
);
create index allocation_candidates_run_idx on allocation_candidates (run_id);

create table bookings (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete restrict,
  student_id     uuid not null references profiles(id) on delete restrict,
  bed_id         uuid not null references beds(id) on delete restrict,
  start_date     date not null,
  end_date       date not null,
  state          booking_state not null default 'reserved',
  deposit_due_at timestamptz,                                -- informational; expiry sweep is not automated (see design doc)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (end_date > start_date),
  -- THE double-booking guard (FR7.3): two live bookings for one bed cannot overlap in time
  constraint bookings_no_overlap exclude using gist (bed_id with =, daterange(start_date, end_date, '[)') with &&)
    where (state in ('reserved','occupied'))
);
create unique index bookings_one_live_per_application on bookings (application_id) where state in ('reserved','occupied');
create index bookings_student_idx on bookings (student_id);

create table payments (
  id                  uuid primary key default gen_random_uuid(),
  reference           text not null unique default ('SIM-' || nextval('payment_ref_seq')),
  application_id      uuid not null references applications(id) on delete restrict,
  booking_id          uuid references bookings(id) on delete set null,
  payer_id            uuid not null references profiles(id) on delete restrict,
  purpose             payment_purpose not null,
  amount_zmw          numeric(10,2) not null check (amount_zmw >= 0),
  status              payment_status not null default 'pending',
  method              text not null default 'Mobile money (simulated)',
  original_payment_id uuid references payments(id),         -- refunds point at the original (FR8.5)
  is_simulated        boolean not null default true check (is_simulated),   -- FR8: no real money, ever
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index payments_app_idx on payments (application_id);

create table maintenance_tickets (
  id             uuid primary key default gen_random_uuid(),
  reference      text not null unique default ('TKT-' || nextval('ticket_ref_seq')),
  listing_id     uuid not null references listings(id) on delete restrict,
  bed_id         uuid references beds(id) on delete set null,
  booking_id     uuid references bookings(id) on delete set null,
  reporter_id    uuid not null references profiles(id) on delete restrict,
  location_text  text not null,                              -- what a technician sees: "Great East Court, Room 108"
  category       text not null check (category in ('Plumbing','Electrical','Security','Internet','Other')),
  title          text not null,
  description    text,
  priority       ticket_priority not null default 'medium',
  status         ticket_status not null default 'pending',
  status_note    text,
  assigned_to    uuid references profiles(id) on delete set null,
  access_notes   text,
  photo_path     text,
  due_at         timestamptz,
  blocks_bed     boolean not null default false,
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index tickets_listing_idx  on maintenance_tickets (listing_id);
create index tickets_assigned_idx on maintenance_tickets (assigned_to);

create table ticket_events (
  id          bigint generated always as identity primary key,
  ticket_id   uuid not null references maintenance_tickets(id) on delete cascade,
  from_status ticket_status,
  to_status   ticket_status not null,
  actor_id    uuid,
  note        text,
  created_at  timestamptz not null default now()
);
create index ticket_events_idx on ticket_events (ticket_id, created_at);

create table announcements (
  id                      uuid primary key default gen_random_uuid(),
  author_id               uuid not null references profiles(id) on delete cascade,
  title                   text not null,
  body                    text not null,
  audience                audience_kind not null,
  audience_institution_id uuid references institutions(id),
  audience_listing_id     uuid references listings(id),
  audience_role           user_role,
  audience_user_ids       uuid[],
  sent_at                 timestamptz,
  recipient_count         int,
  created_at              timestamptz not null default now()
);

create table notifications (
  id              uuid primary key default gen_random_uuid(),
  recipient_id    uuid not null references profiles(id) on delete cascade,
  kind            text not null,
  title           text not null,
  body            text,
  link            text,
  announcement_id uuid references announcements(id) on delete set null,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index notifications_recipient_idx on notifications (recipient_id, read_at, created_at desc);

-- Documents AND their verification: automated check result + human review in one row (PRD entity "Verification and Document").
-- The file itself lives in the private Storage bucket "documents"; only the path is stored here.
create table documents (
  id               uuid primary key default gen_random_uuid(),
  uploader_id      uuid not null references profiles(id) on delete cascade,
  application_id   uuid references applications(id) on delete cascade,
  listing_id       uuid references listings(id) on delete cascade,
  kind             document_kind not null,
  storage_path     text not null unique,
  original_name    text,
  mime_type        text not null check (mime_type in ('application/pdf','image/jpeg','image/png')),
  size_bytes       int not null check (size_bytes between 1 and 5242880),
  auto_result      check_result,
  auto_checked_at  timestamptz,
  review_decision  review_decision not null default 'pending',
  reviewer_id      uuid references profiles(id) on delete set null,
  reviewer_note    text,
  reviewed_at      timestamptz,
  retain_until     date not null default (current_date + 90),   -- OD-12 default
  created_at       timestamptz not null default now(),
  check (application_id is not null or listing_id is not null)
);

create table shortlist (
  student_id uuid not null references profiles(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, listing_id)
);

-- Append-only record of who did what (FR12.1). Cannot be edited or deleted (trigger below).
create table audit_events (
  id             bigint generated always as identity primary key,
  actor_id       uuid,
  actor_role     user_role,
  institution_id uuid,
  action         text not null,
  record_type    text,
  record_id      text,
  outcome        text not null default 'success',
  detail         jsonb not null default '{}',
  created_at     timestamptz not null default now()
);
create index audit_events_time_idx on audit_events (created_at desc);

-- Machine-readable version of PRD section 6: the ONLY allowed state changes.
create table state_transitions (
  machine    text not null,
  from_state text not null,
  to_state   text not null,
  primary key (machine, from_state, to_state)
);

-- ---------------------------------------------------------------------
-- 3. ALLOWED STATE CHANGES (PRD section 6). Anything else is refused.
-- ---------------------------------------------------------------------
insert into state_transitions (machine, from_state, to_state) values
 -- beds (6.1)
 ('bed','available','held'), ('bed','available','pending_approval'), ('bed','pending_approval','reserved'),
 ('bed','pending_approval','available'), ('bed','held','reserved'), ('bed','held','available'),
 ('bed','reserved','occupied'), ('bed','reserved','available'), ('bed','occupied','available'),
 ('bed','available','blocked_for_maintenance'), ('bed','held','blocked_for_maintenance'),
 ('bed','reserved','blocked_for_maintenance'), ('bed','blocked_for_maintenance','available'),
 -- bookings
 ('booking','reserved','occupied'), ('booking','reserved','cancelled'), ('booking','reserved','expired'), ('booking','occupied','released'),
 -- applications (6.2). Two additions are marked: submitted->no_eligible_room (the engine can find nothing) and
 -- recommended/pending_approval->submitted (FR6.2 "rerun" sends the application back to the engine).
 ('application','draft','submitted'), ('application','draft','withdrawn'),
 ('application','submitted','profile_incomplete'), ('application','submitted','under_review'), ('application','submitted','recommended'),
 ('application','submitted','no_eligible_room'), ('application','submitted','withdrawn'),
 ('application','profile_incomplete','submitted'), ('application','profile_incomplete','withdrawn'), ('application','profile_incomplete','expired'),
 ('application','under_review','accepted'), ('application','under_review','declined'), ('application','under_review','withdrawn'),
 ('application','recommended','pending_approval'), ('application','recommended','withdrawn'), ('application','recommended','submitted'),
 ('application','pending_approval','approved'), ('application','pending_approval','declined'), ('application','pending_approval','no_eligible_room'),
 ('application','pending_approval','withdrawn'), ('application','pending_approval','submitted'),
 ('application','approved','withdrawn'), ('application','approved','expired'),
 ('application','accepted','withdrawn'), ('application','accepted','expired'),
 -- maintenance tickets (6.3)
 ('ticket','pending','assigned'), ('ticket','pending','cancelled'),
 ('ticket','assigned','in_progress'), ('ticket','assigned','pending'), ('ticket','assigned','escalated'), ('ticket','assigned','cancelled'),
 ('ticket','in_progress','completed'), ('ticket','in_progress','escalated'),
 ('ticket','completed','reopened'),
 ('ticket','reopened','assigned'), ('ticket','reopened','in_progress'), ('ticket','reopened','escalated'),
 ('ticket','escalated','assigned'), ('ticket','escalated','in_progress'), ('ticket','escalated','completed'),
 -- listing moderation (6.4)
 ('listing','draft','awaiting_moderation'),
 ('listing','awaiting_moderation','published'), ('listing','awaiting_moderation','requires_review'), ('listing','awaiting_moderation','suspended'),
 ('listing','requires_review','awaiting_moderation'), ('listing','requires_review','suspended'),
 ('listing','published','requires_review'), ('listing','published','suspended'), ('listing','suspended','awaiting_moderation'),
 -- payments (6.5)
 ('payment','pending','successful'), ('payment','pending','failed'), ('payment','failed','pending');

-- ---------------------------------------------------------------------
-- 4. HELPER FUNCTIONS (used by the security policies)
-- ---------------------------------------------------------------------
create function app_role() returns user_role language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() $$;

create function app_institution() returns uuid language sql stable security definer set search_path = public as
$$ select institution_id from profiles where id = auth.uid() $$;

create function is_sysadmin() returns boolean language sql stable security definer set search_path = public as
$$ select coalesce((select role = 'system_admin' from profiles where id = auth.uid()), false) $$;

create function email_verified() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null) $$;

create function listing_of_room(p uuid) returns uuid language sql stable security definer set search_path = public as
$$ select listing_id from rooms where id = p $$;

create function listing_of_bed(p uuid) returns uuid language sql stable security definer set search_path = public as
$$ select r.listing_id from beds b join rooms r on r.id = b.room_id where b.id = p $$;

create function listing_of_booking(p uuid) returns uuid language sql stable security definer set search_path = public as
$$ select listing_of_bed(bed_id) from bookings where id = p $$;

create function owns_listing(p uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from listings l join partners pa on pa.id = l.partner_id where l.id = p and pa.owner_id = auth.uid()) $$;

-- university administrator of the institution that RUNS this hostel
create function admin_of_hostel(p uuid) returns boolean language sql stable security definer set search_path = public as
$$ select app_role() = 'university_admin' and exists (select 1 from listings where id = p and institution_id is not null and institution_id = app_institution()) $$;

-- university administrator of an institution that is PARTNERED with this listing (read and moderate)
create function admin_of_listing(p uuid) returns boolean language sql stable security definer set search_path = public as
$$ select app_role() = 'university_admin' and (admin_of_hostel(p)
        or exists (select 1 from listing_distances where listing_id = p and partnered and institution_id = app_institution())) $$;

-- may create and edit this listing, its rooms and beds
create function can_manage_listing(p uuid) returns boolean language sql stable security definer set search_path = public as
$$ select owns_listing(p) or admin_of_hostel(p) or is_sysadmin() $$;

create function can_see_listing(p uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from listings where id = p and moderation = 'published') or can_manage_listing(p) or admin_of_listing(p) $$;

create function owner_of_application(p uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from applications a where a.id = p and a.route = 'private' and owns_listing(a.listing_id)) $$;

-- ---------------------------------------------------------------------
-- 5. TRIGGERS
-- ---------------------------------------------------------------------
create function set_updated_at() returns trigger language plpgsql as
$$ begin new.updated_at := now(); return new; end $$;

-- Refuse any state change that is not in state_transitions (ERR-03)
create function enforce_transition() returns trigger language plpgsql as $$
declare v_machine text := tg_argv[0]; v_col text := tg_argv[1]; v_old text; v_new text;
begin
  v_old := to_jsonb(old) ->> v_col;  v_new := to_jsonb(new) ->> v_col;
  if v_old is distinct from v_new and not exists
     (select 1 from state_transitions where machine = v_machine and from_state = v_old and to_state = v_new) then
    raise exception 'INVALID_TRANSITION: a % cannot change from % to %', v_machine, v_old, v_new using errcode = 'P0001';
  end if;
  return new;
end $$;

-- Audit log: written by triggers and functions only; nobody can change or delete entries (FR6.6, FR12.1)
create function log_audit(p_action text, p_type text, p_id text, p_detail jsonb default '{}', p_outcome text default 'success')
returns void language plpgsql security definer set search_path = public as $$
declare v_role user_role; v_inst uuid;
begin
  select role, institution_id into v_role, v_inst from profiles where id = auth.uid();
  insert into audit_events (actor_id, actor_role, institution_id, action, record_type, record_id, outcome, detail)
  values (auth.uid(), v_role, v_inst, p_action, p_type, p_id, p_outcome, coalesce(p_detail, '{}'));
end $$;

create function audit_immutable() returns trigger language plpgsql as
$$ begin raise exception 'AUDIT_IMMUTABLE: audit entries cannot be changed or deleted' using errcode = 'P0001'; end $$;
create trigger audit_no_change   before update or delete on audit_events for each row       execute function audit_immutable();
create trigger audit_no_truncate before truncate          on audit_events for each statement execute function audit_immutable();

-- logs creation and changes of one watched column
create function audit_change() returns trigger language plpgsql security definer set search_path = public as $$
declare v_col text := tg_argv[0]; v_old text; v_new text;
begin
  if tg_op = 'INSERT' then
    perform log_audit(tg_table_name || '.created', tg_table_name, to_jsonb(new) ->> 'id', jsonb_build_object(v_col, to_jsonb(new) ->> v_col));
  else
    v_old := to_jsonb(old) ->> v_col;  v_new := to_jsonb(new) ->> v_col;
    if v_old is distinct from v_new then
      perform log_audit(tg_table_name || '.' || v_col || '_changed', tg_table_name, to_jsonb(new) ->> 'id', jsonb_build_object('from', v_old, 'to', v_new));
    end if;
  end if;
  return null;
end $$;

-- Timelines for the status trackers
create function record_application_event() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into application_events (application_id, from_status, to_status, actor_id, note) values (new.id, null, new.status, auth.uid(), new.status_reason);
  elsif new.status is distinct from old.status then
    insert into application_events (application_id, from_status, to_status, actor_id, note) values (new.id, old.status, new.status, auth.uid(), new.status_reason);
  end if;
  return null;
end $$;

create function record_ticket_event() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into ticket_events (ticket_id, from_status, to_status, actor_id, note) values (new.id, null, new.status, auth.uid(), new.status_note);
  elsif new.status is distinct from old.status then
    insert into ticket_events (ticket_id, from_status, to_status, actor_id, note) values (new.id, old.status, new.status, auth.uid(), new.status_note);
  end if;
  return null;
end $$;

create function application_before() returns trigger language plpgsql as $$
begin
  if new.status = 'submitted' and new.submitted_at is null then new.submitted_at := now(); end if;
  return new;
end $$;

-- Bed bookkeeping: who changed it, when; holds expire after 48 hours (OD-09); clear stale links
create function bed_before_update() returns trigger language plpgsql as $$
begin
  if new.state is distinct from old.state then
    new.state_changed_at := now();
    new.state_changed_by := auth.uid();
    if new.state = 'held' and new.hold_expires_at is null then new.hold_expires_at := now() + interval '48 hours'; end if;
    if new.state <> 'held' then new.hold_expires_at := null; end if;
    if new.state not in ('held','pending_approval') then new.held_for_application_id := null; end if;
  end if;
  return new;
end $$;

-- Keep the booking in step with its bed (owner marks check-in or release)
create function sync_booking_with_bed() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.state is distinct from old.state then
    if new.state = 'occupied' then
      update bookings set state = 'occupied' where bed_id = new.id and state = 'reserved';
    elsif new.state = 'available' and old.state = 'reserved' then
      update bookings set state = 'cancelled' where bed_id = new.id and state = 'reserved';
    elsif new.state = 'available' and old.state = 'occupied' then
      update bookings set state = 'released' where bed_id = new.id and state = 'occupied';
    end if;
  end if;
  return null;
end $$;

-- "Adding a room with capacity 3 creates three beds" (FR2.2)
create function create_beds_for_room() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into beds (room_id, label) select new.id, chr(64 + g) from generate_series(1, new.capacity) g;
  return null;
end $$;

-- Any change to rooms or beds refreshes the listing's "last updated" time (FR2.3, FR2.6)
create function touch_listing() returns trigger language plpgsql security definer set search_path = public as $$
declare v_listing uuid;
begin
  if tg_table_name = 'beds' then
    select listing_id into v_listing from rooms where id = coalesce(new.room_id, old.room_id);
  else
    v_listing := coalesce(new.listing_id, old.listing_id);
  end if;
  update listings set last_updated_at = now() where id = v_listing;
  return null;
end $$;

-- Students may not rewrite who they are: changing the number or institution clears the admin confirmation
create function profile_before_update() returns trigger language plpgsql as $$
begin
  if (new.student_number is distinct from old.student_number or new.institution_id is distinct from old.institution_id)
     and coalesce(auth.uid() = new.id, false) then
    new.student_number_matched := false;
  end if;
  return new;
end $$;

-- Ticket target time by priority (OD-10): high 24 h, medium 3 days, low 7 days
create function ticket_before_insert() returns trigger language plpgsql as $$
begin
  if new.due_at is null then
    new.due_at := now() + case new.priority when 'high' then interval '24 hours' when 'medium' then interval '3 days' else interval '7 days' end;
  end if;
  return new;
end $$;

-- Document review stamps the reviewer; an approved ownership document marks the listing verified
create function document_before_update() returns trigger language plpgsql as $$
begin
  if new.review_decision is distinct from old.review_decision then
    new.reviewer_id := auth.uid();
    new.reviewed_at := now();
  end if;
  return new;
end $$;

create function sync_listing_verification() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'ownership_proof' and new.listing_id is not null and new.review_decision is distinct from old.review_decision then
    update listings set verification = new.review_decision where id = new.listing_id;
  end if;
  return null;
end $$;

-- A new sign-up gets a profile. Only 'student' or 'owner' can be chosen at sign-up (FR1.2).
create function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, role, full_name)
  values (new.id,
          case when new.raw_user_meta_data ->> 'signup_role' = 'owner' then 'owner'::user_role else 'student'::user_role end,
          coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create trigger profiles_upd  before update on profiles            for each row execute function set_updated_at();
create trigger profiles_chk  before update on profiles            for each row execute function profile_before_update();
create trigger partners_upd  before update on partners            for each row execute function set_updated_at();
create trigger listings_upd  before update on listings            for each row execute function set_updated_at();
create trigger apps_upd      before update on applications        for each row execute function set_updated_at();
create trigger bookings_upd  before update on bookings            for each row execute function set_updated_at();
create trigger payments_upd  before update on payments            for each row execute function set_updated_at();
create trigger tickets_upd   before update on maintenance_tickets for each row execute function set_updated_at();

create trigger beds_transition     before update of state            on beds                for each row execute function enforce_transition('bed', 'state');
create trigger bookings_transition before update of state            on bookings            for each row execute function enforce_transition('booking', 'state');
create trigger apps_transition     before update of status           on applications        for each row execute function enforce_transition('application', 'status');
create trigger tickets_transition  before update of status           on maintenance_tickets for each row execute function enforce_transition('ticket', 'status');
create trigger listings_transition before update of moderation       on listings            for each row execute function enforce_transition('listing', 'moderation');
create trigger payments_transition before update of status           on payments            for each row execute function enforce_transition('payment', 'status');

create trigger beds_before         before update on beds              for each row execute function bed_before_update();
create trigger beds_sync_booking   after  update of state on beds     for each row execute function sync_booking_with_bed();
create trigger rooms_create_beds   after  insert on rooms             for each row execute function create_beds_for_room();
create trigger beds_touch_listing  after  insert or delete or update of state on beds for each row execute function touch_listing();
create trigger rooms_touch_listing after  insert or delete or update on rooms          for each row execute function touch_listing();

create trigger apps_before   before insert or update on applications for each row execute function application_before();
create trigger apps_events   after  insert or update on applications for each row execute function record_application_event();
create trigger tickets_ins   before insert on maintenance_tickets    for each row execute function ticket_before_insert();
create trigger tickets_events after insert or update on maintenance_tickets for each row execute function record_ticket_event();
create trigger docs_before   before update on documents              for each row execute function document_before_update();
create trigger docs_verify   after  update on documents              for each row execute function sync_listing_verification();

create trigger audit_apps     after insert or update on applications        for each row execute function audit_change('status');
create trigger audit_beds     after update           on beds                for each row execute function audit_change('state');
create trigger audit_bookings after insert or update on bookings            for each row execute function audit_change('state');
create trigger audit_payments after insert or update on payments            for each row execute function audit_change('status');
create trigger audit_tickets  after insert or update on maintenance_tickets for each row execute function audit_change('status');
create trigger audit_listings after insert or update on listings            for each row execute function audit_change('moderation');
create trigger audit_docs     after insert or update on documents           for each row execute function audit_change('review_decision');
create trigger audit_rules    after insert or update on allocation_rules    for each row execute function audit_change('active');
create trigger audit_profiles after update           on profiles            for each row execute function audit_change('role');

-- ---------------------------------------------------------------------
-- 6. SERVER-SIDE FUNCTIONS (privileged actions, SEC-02)
-- The browser cannot change a status directly. It calls one of these, which checks WHO is asking.
-- ---------------------------------------------------------------------
create function _notify(p_user uuid, p_kind text, p_title text, p_body text default null, p_link text default null)
returns void language sql security definer set search_path = public as
$$ insert into notifications (recipient_id, kind, title, body, link) values (p_user, p_kind, p_title, p_body, p_link) $$;

create function _release_beds(p_app uuid, p_note text) returns void language sql security definer set search_path = public as
$$ update beds set state = 'available', state_note = p_note where held_for_application_id = p_app and state in ('held','pending_approval') $$;

-- THE commit step (FR7.3). Locks the bed, rechecks it, creates the booking. All or nothing.
create function _commit_booking(p_app uuid, p_bed uuid, p_start date, p_end date)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_bed beds%rowtype; v_app applications%rowtype; v_id uuid;
begin
  select * into v_app from applications where id = p_app;
  select * into v_bed from beds where id = p_bed for update;          -- concurrent requests queue up here
  if not found then raise exception 'BED_NOT_FOUND' using errcode = 'P0002'; end if;
  if not (v_bed.state = 'available' or (v_bed.state in ('held','pending_approval') and v_bed.held_for_application_id = p_app)) then
    raise exception 'BED_UNAVAILABLE: this bed is no longer free' using errcode = 'P0001';
  end if;
  if v_bed.state = 'available' then
    update beds set state = 'pending_approval', held_for_application_id = p_app where id = p_bed;
  end if;
  begin
    insert into bookings (application_id, student_id, bed_id, start_date, end_date, deposit_due_at)
    values (p_app, v_app.student_id, p_bed, p_start, p_end, now() + interval '72 hours') returning id into v_id;
  exception when exclusion_violation then
    raise exception 'BED_UNAVAILABLE: an overlapping booking exists for this bed' using errcode = 'P0001';
  end;
  update beds set state = 'reserved' where id = p_bed;
  return v_id;
end $$;

-- Student: send the application. Incomplete profiles are flagged, not rejected (FR4.2, FR1.1).
create function submit_application(p_app uuid) returns application_status
language plpgsql security definer set search_path = public as $$
declare v_app applications%rowtype; v_p profiles%rowtype; v_missing text[] := '{}';
begin
  if not email_verified() then raise exception 'EMAIL_NOT_VERIFIED: verify your email before applying' using errcode = '42501'; end if;
  select * into v_app from applications where id = p_app for update;
  if not found or v_app.student_id <> auth.uid() then raise exception 'NOT_ALLOWED' using errcode = '42501'; end if;
  if v_app.status not in ('draft','profile_incomplete') then
    raise exception 'INVALID_TRANSITION: an application that is % cannot be submitted', v_app.status using errcode = 'P0001';
  end if;
  select * into v_p from profiles where id = auth.uid();
  if v_app.route = 'university_allocation' then
    if v_p.institution_id is null then v_missing := array_append(v_missing, 'institution'::text); end if;
    if coalesce(btrim(v_p.student_number), '') = '' then v_missing := array_append(v_missing, 'student number'::text); end if;
  end if;
  if v_app.requested_room_type is null then v_missing := array_append(v_missing, 'room type'::text); end if;
  if v_app.budget_zmw is null then v_missing := array_append(v_missing, 'budget'::text); end if;
  update applications set status = 'submitted', status_reason = null where id = p_app;
  if array_length(v_missing, 1) > 0 then
    update applications set status = 'profile_incomplete', status_reason = 'Missing: ' || array_to_string(v_missing, ', ') where id = p_app;
    return 'profile_incomplete';
  end if;
  return 'submitted';
end $$;

-- Student: withdraw. Releases every bed set aside for the application (FR4.4).
create function withdraw_application(p_app uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_app applications%rowtype;
begin
  select * into v_app from applications where id = p_app for update;
  if not found or v_app.student_id <> auth.uid() then raise exception 'NOT_ALLOWED' using errcode = '42501'; end if;
  update applications set status = 'withdrawn', status_reason = p_reason where id = p_app;     -- refused if the move is not allowed
  perform _release_beds(p_app, 'Released: application withdrawn');
  update beds set state = 'available', state_note = 'Released: application withdrawn'
   where state = 'reserved' and id in (select bed_id from bookings where application_id = p_app and state = 'reserved');
end $$;

-- University administrator: approve, modify, reject or rerun a recommendation (FR6.2).
create function decide_allocation(p_run uuid, p_decision text, p_bed uuid default null, p_note text default null,
                                  p_start date default null, p_end date default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_run allocation_runs%rowtype; v_app applications%rowtype; v_bed uuid; v_start date; v_end date;
begin
  if app_role() <> 'university_admin' then raise exception 'NOT_ALLOWED: only a university administrator decides allocations' using errcode = '42501'; end if;
  select * into v_run from allocation_runs where id = p_run for update;
  if not found then raise exception 'RUN_NOT_FOUND' using errcode = 'P0002'; end if;
  select * into v_app from applications where id = v_run.application_id for update;
  if v_app.institution_id is distinct from app_institution() then raise exception 'NOT_ALLOWED: not your institution' using errcode = '42501'; end if;
  if v_run.decision <> 'pending' or v_app.status <> 'pending_approval' then
    raise exception 'ALREADY_DECIDED: this recommendation is not waiting for a decision' using errcode = 'P0001';
  end if;
  if p_decision not in ('approved','modified','rejected','rerun') then raise exception 'BAD_DECISION' using errcode = 'P0001'; end if;
  if p_decision in ('modified','rejected') and coalesce(btrim(p_note), '') = '' then
    raise exception 'NOTE_REQUIRED: give a reason' using errcode = 'P0001';
  end if;

  if p_decision in ('approved','modified') then
    if p_decision = 'approved' then
      select bed_id into v_bed from allocation_candidates where run_id = p_run and not excluded and rank = 1;
    else
      v_bed := p_bed;
      if not exists (select 1 from allocation_candidates where run_id = p_run and bed_id = v_bed and not excluded) then
        raise exception 'BED_NOT_ELIGIBLE: choose one of the eligible rooms from this run' using errcode = 'P0001';
      end if;
    end if;
    v_start := coalesce(p_start, current_date);  v_end := coalesce(p_end, v_start + 180);
    perform _commit_booking(v_app.id, v_bed, v_start, v_end);     -- rechecks availability; raises BED_UNAVAILABLE on a clash
    perform _release_beds(v_app.id, 'Released: another room was approved');
    update allocation_runs set decision = p_decision::allocation_decision, decided_by = auth.uid(), decided_at = now(), decision_note = p_note, approved_bed_id = v_bed where id = p_run;
    update applications set status = 'approved', status_reason = p_note where id = v_app.id;
    perform _notify(v_app.student_id, 'application',
      case p_decision when 'approved' then 'Your room was approved' else 'An administrator changed your room' end,
      coalesce(p_note, 'Open your application to see the details.'), '/applications/' || v_app.reference);
  elsif p_decision = 'rejected' then
    perform _release_beds(v_app.id, 'Released: recommendation rejected');
    update allocation_runs set decision = 'rejected', decided_by = auth.uid(), decided_at = now(), decision_note = p_note where id = p_run;
    update applications set status = 'declined', status_reason = p_note where id = v_app.id;
    perform _notify(v_app.student_id, 'application', 'Your application was not approved', p_note, '/applications/' || v_app.reference);
  else
    perform _release_beds(v_app.id, 'Released: recommendation rerun');
    update allocation_runs set decision = 'rerun', decided_by = auth.uid(), decided_at = now(), decision_note = p_note where id = p_run;
    update applications set status = 'submitted', status_reason = 'Sent back to be recommended again' where id = v_app.id;
  end if;
  perform log_audit('allocation.decision', 'allocation_runs', p_run::text,
    jsonb_build_object('decision', p_decision, 'bed', v_bed, 'note', p_note, 'application', v_app.reference));
end $$;

-- Owner: accept or decline a private application. Accepting holds the chosen bed for 48 hours (OD-09).
create function decide_private_application(p_app uuid, p_decision text, p_bed uuid default null, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_app applications%rowtype; v_found boolean;
begin
  select * into v_app from applications where id = p_app for update;
  if not found or v_app.route <> 'private' or not owns_listing(v_app.listing_id) then raise exception 'NOT_ALLOWED' using errcode = '42501'; end if;
  if v_app.status not in ('submitted','under_review') then raise exception 'ALREADY_DECIDED' using errcode = 'P0001'; end if;
  if p_decision not in ('accepted','declined') then raise exception 'BAD_DECISION' using errcode = 'P0001'; end if;
  if v_app.status = 'submitted' then update applications set status = 'under_review' where id = p_app; end if;
  if p_decision = 'accepted' then
    if p_bed is null then raise exception 'BED_REQUIRED: choose the bed to hold' using errcode = 'P0001'; end if;
    perform 1 from beds b join rooms r on r.id = b.room_id
     where b.id = p_bed and r.listing_id = v_app.listing_id and b.state = 'available' for update of b;
    if not found then raise exception 'BED_UNAVAILABLE: that bed is not free' using errcode = 'P0001'; end if;
    update beds set state = 'held', held_for_application_id = p_app, hold_expires_at = now() + interval '48 hours' where id = p_bed;
    update applications set status = 'accepted', status_reason = p_note where id = p_app;
    perform _notify(v_app.student_id, 'application', 'Your application was accepted', 'A bed is held for 48 hours. Pay the demonstration deposit to confirm it.', '/applications/' || v_app.reference);
  else
    if coalesce(btrim(p_note), '') = '' then raise exception 'NOTE_REQUIRED: give a reason' using errcode = 'P0001'; end if;
    update applications set status = 'declined', status_reason = p_note where id = p_app;
    perform _notify(v_app.student_id, 'application', 'Your application was declined', p_note, '/applications/' || v_app.reference);
  end if;
end $$;

-- Student: record a SIMULATED payment. A deposit on an accepted application confirms the booking (FR8.4).
create function record_simulated_payment(p_app uuid, p_purpose payment_purpose, p_amount numeric, p_method text default 'Mobile money (simulated)')
returns payments language plpgsql security definer set search_path = public as $$
declare v_app applications%rowtype; v_pay payments%rowtype; v_bk uuid; v_bed uuid;
begin
  select * into v_app from applications where id = p_app;
  if not found or v_app.student_id <> auth.uid() then raise exception 'NOT_ALLOWED' using errcode = '42501'; end if;
  insert into payments (application_id, payer_id, purpose, amount_zmw, status, method)
  values (p_app, auth.uid(), p_purpose, p_amount, 'successful', p_method) returning * into v_pay;
  if p_purpose = 'deposit' and v_app.status in ('accepted','approved') then
    select id into v_bk from bookings where application_id = p_app and state in ('reserved','occupied');
    if v_bk is null then
      select id into v_bed from beds where held_for_application_id = p_app and state = 'held';
      if v_bed is not null then v_bk := _commit_booking(p_app, v_bed, current_date, current_date + 180); end if;
    end if;
    update payments set booking_id = v_bk where id = v_pay.id returning * into v_pay;
  end if;
  return v_pay;
end $$;

-- Owner or administrator: give a ticket to a technician
create function assign_ticket(p_ticket uuid, p_technician uuid, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_t maintenance_tickets%rowtype;
begin
  select * into v_t from maintenance_tickets where id = p_ticket for update;
  if not found then raise exception 'TICKET_NOT_FOUND' using errcode = 'P0002'; end if;
  if not (owns_listing(v_t.listing_id) or admin_of_listing(v_t.listing_id)) then raise exception 'NOT_ALLOWED' using errcode = '42501'; end if;
  if not exists (select 1 from profiles where id = p_technician and role = 'technician') then raise exception 'NOT_A_TECHNICIAN' using errcode = 'P0001'; end if;
  update maintenance_tickets set assigned_to = p_technician, status = 'assigned', status_note = p_note where id = p_ticket;
  perform _notify(p_technician, 'ticket', 'Ticket assigned: ' || v_t.title, v_t.location_text, null);
end $$;

-- Ticket status changes, with the PRD permissions: technician (own, working states), student (reopen within 7 days),
-- owner (escalate, cancel), university administrator (escalate). OD-10 sets the 7-day window.
create function set_ticket_status(p_ticket uuid, p_new ticket_status, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_t maintenance_tickets%rowtype; v_role user_role := app_role();
begin
  select * into v_t from maintenance_tickets where id = p_ticket for update;
  if not found then raise exception 'TICKET_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_role = 'technician' then
    if v_t.assigned_to is distinct from auth.uid() or p_new not in ('in_progress','completed','escalated') then raise exception 'NOT_ALLOWED' using errcode = '42501'; end if;
  elsif v_role = 'student' then
    if v_t.reporter_id <> auth.uid() or p_new <> 'reopened' then raise exception 'NOT_ALLOWED' using errcode = '42501'; end if;
    if v_t.status <> 'completed' or v_t.completed_at < now() - interval '7 days' then
      raise exception 'REOPEN_WINDOW_PASSED: a ticket can be reopened for 7 days after it is completed' using errcode = 'P0001';
    end if;
  elsif v_role = 'owner' then
    if not owns_listing(v_t.listing_id) or p_new not in ('escalated','cancelled') then raise exception 'NOT_ALLOWED' using errcode = '42501'; end if;
  elsif v_role = 'university_admin' then
    if not admin_of_listing(v_t.listing_id) or p_new <> 'escalated' then raise exception 'NOT_ALLOWED' using errcode = '42501'; end if;
  else
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  update maintenance_tickets set status = p_new, status_note = p_note,
         completed_at = case when p_new = 'completed' then now() else completed_at end where id = p_ticket;
  perform _notify(v_t.reporter_id, 'ticket', 'Your repair request is now ' || replace(p_new::text, '_', ' '), v_t.title, null);
end $$;

-- For a scheduled job: tickets past their target time become Escalated (FR9.4)
create function escalate_overdue_tickets() returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update maintenance_tickets set status = 'escalated', status_note = 'Past its target time'
   where status in ('assigned','in_progress') and due_at < now();
  get diagnostics n = row_count;  return n;
end $$;

-- For a scheduled job: expired holds free their beds and the application expires (FR7.2)
create function expire_holds() returns int language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in select id, held_for_application_id as app from beds where state = 'held' and hold_expires_at < now() for update loop
    update beds set state = 'available', state_note = 'Hold expired' where id = r.id;
    if r.app is not null then
      update applications set status = 'expired', status_reason = 'The bed hold expired' where id = r.app and status in ('accepted','approved');
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;

create function submit_listing_for_moderation(p_listing uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not can_manage_listing(p_listing) then raise exception 'NOT_ALLOWED' using errcode = '42501'; end if;
  update listings set moderation = 'awaiting_moderation', moderation_note = null where id = p_listing;
end $$;

create function moderate_listing(p_listing uuid, p_state moderation_state, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_name text;
begin
  if not (is_sysadmin() or admin_of_listing(p_listing)) then raise exception 'NOT_ALLOWED' using errcode = '42501'; end if;
  if p_state not in ('published','requires_review','suspended') then raise exception 'BAD_STATE' using errcode = 'P0001'; end if;
  if p_state in ('requires_review','suspended') and coalesce(btrim(p_note), '') = '' then raise exception 'NOTE_REQUIRED: give a reason' using errcode = 'P0001'; end if;
  update listings set moderation = p_state, moderation_note = p_note where id = p_listing;
  select pa.owner_id, l.name into v_owner, v_name from listings l join partners pa on pa.id = l.partner_id where l.id = p_listing;
  if v_owner is not null then
    perform _notify(v_owner, 'listing', 'Your listing was ' || replace(p_state::text, '_', ' '), coalesce(p_note, v_name), null);
  end if;
end $$;

create function confirm_listing_availability(p_listing uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not can_manage_listing(p_listing) then raise exception 'NOT_ALLOWED' using errcode = '42501'; end if;
  update listings set last_updated_at = now() where id = p_listing;
end $$;

-- Administrator: confirm a student's declared institution and student number (no SIS integration, see PRD 1.4)
create function confirm_student_number(p_student uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if app_role() <> 'university_admin' or not exists (select 1 from profiles where id = p_student and institution_id = app_institution()) then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  update profiles set student_number_matched = true where id = p_student;
end $$;

-- Send an announcement: creates one notification per recipient (FR10.1, FR10.2)
create function publish_announcement(p_id uuid) returns int language plpgsql security definer set search_path = public as $$
declare v_a announcements%rowtype; n int;
begin
  select * into v_a from announcements where id = p_id for update;
  if not found or v_a.author_id <> auth.uid() then raise exception 'NOT_ALLOWED' using errcode = '42501'; end if;
  if v_a.sent_at is not null then raise exception 'ALREADY_SENT' using errcode = 'P0001'; end if;
  insert into notifications (recipient_id, kind, title, body, announcement_id)
  select distinct pr.id, 'announcement', v_a.title, v_a.body, v_a.id from profiles pr
   where case v_a.audience
     when 'all'         then is_sysadmin()
     when 'institution' then pr.institution_id = v_a.audience_institution_id
     when 'role'        then pr.role = v_a.audience_role and (is_sysadmin() or pr.institution_id = app_institution())
     when 'users'       then pr.id = any (v_a.audience_user_ids) and (is_sysadmin() or pr.institution_id = app_institution())
     when 'listing'     then exists (select 1 from bookings b join beds bd on bd.id = b.bed_id join rooms r on r.id = bd.room_id
                                      where b.student_id = pr.id and b.state in ('reserved','occupied') and r.listing_id = v_a.audience_listing_id)
   end;
  get diagnostics n = row_count;
  update announcements set sent_at = now(), recipient_count = n where id = p_id;
  perform log_audit('announcement.sent', 'announcements', p_id::text, jsonb_build_object('audience', v_a.audience, 'recipients', n));
  return n;
end $$;

-- ---------------------------------------------------------------------
-- 7. PUBLIC VIEWS
-- ---------------------------------------------------------------------
-- Listing cards for the public site: published listings only, with bed counts. Runs with the view owner's rights on purpose,
-- so visitors see counts without being able to read the underlying tables.
create view listing_cards as
select l.id, l.name, l.type, l.area, l.gender, l.gender_note, l.facilities, l.rent_unit, l.verification,
       l.last_updated_at, (now() - l.last_updated_at > interval '30 days') as is_stale,
       pa.business_name as managed_by,
       min(r.price_zmw) as price_from, max(r.price_zmw) as price_to,
       count(b.id) as beds_total, count(b.id) filter (where b.state = 'available') as beds_available,
       (select coalesce(jsonb_object_agg(i.code, ld.distance_km), '{}'::jsonb)
          from listing_distances ld join institutions i on i.id = ld.institution_id where ld.listing_id = l.id) as distances
from listings l
join partners pa on pa.id = l.partner_id
left join rooms r on r.listing_id = l.id
left join beds  b on b.room_id = r.id
where l.moderation = 'published'
group by l.id, pa.business_name;

-- What an owner sees of a private applicant (OD-02): name (unless hidden), institution, request. Nothing else.
create view private_application_inbox as
select a.id, a.reference, a.status, a.submitted_at, a.listing_id, a.requested_room_type, a.budget_zmw, a.intake,
       case when pr.owner_can_see_profile then pr.full_name else 'Applicant' end as applicant_name,
       i.name as applicant_institution,
       (select count(*) from documents d where d.application_id = a.id) as document_count
from applications a
join profiles pr on pr.id = a.student_id
left join institutions i on i.id = pr.institution_id
where a.route = 'private' and owns_listing(a.listing_id);

-- ---------------------------------------------------------------------
-- 8. ROW-LEVEL SECURITY: who can see which rows (SEC-02, SEC-03)
-- ---------------------------------------------------------------------
alter table institutions          enable row level security;
alter table profiles              enable row level security;
alter table partners              enable row level security;
alter table listings              enable row level security;
alter table listing_distances     enable row level security;
alter table rooms                 enable row level security;
alter table beds                  enable row level security;
alter table applications          enable row level security;
alter table application_events    enable row level security;
alter table allocation_rules      enable row level security;
alter table allocation_runs       enable row level security;
alter table allocation_candidates enable row level security;
alter table bookings              enable row level security;
alter table payments              enable row level security;
alter table maintenance_tickets   enable row level security;
alter table ticket_events         enable row level security;
alter table announcements         enable row level security;
alter table notifications         enable row level security;
alter table documents             enable row level security;
alter table shortlist             enable row level security;
alter table audit_events          enable row level security;
alter table state_transitions     enable row level security;

-- reference data
create policy inst_read  on institutions      for select to anon, authenticated using (true);
create policy inst_write on institutions      for all    to authenticated using (is_sysadmin()) with check (is_sysadmin());
create policy trans_read on state_transitions for select to anon, authenticated using (true);

-- profiles: your own; an administrator sees students of their institution; the system administrator sees all
create policy prof_read on profiles for select to authenticated using (
  id = auth.uid() or is_sysadmin() or (app_role() = 'university_admin' and institution_id = app_institution()));
create policy prof_update on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- partners
create policy partner_read   on partners for select to authenticated using (
  owner_id = auth.uid() or app_role() in ('university_admin','system_admin'));
create policy partner_insert on partners for insert to authenticated with check (app_role() = 'owner' and owner_id = auth.uid());
create policy partner_update on partners for update to authenticated using (owner_id = auth.uid() or is_sysadmin())
  with check (owner_id = auth.uid() or is_sysadmin());

-- listings: the public sees Published only; owners and administrators see their own in any state
create policy listing_read   on listings for select to anon, authenticated using (can_see_listing(id));
create policy listing_insert on listings for insert to authenticated with check (
  moderation = 'draft' and (
    exists (select 1 from partners pa where pa.id = partner_id and pa.owner_id = auth.uid())
    or (app_role() = 'university_admin' and institution_id = app_institution())
    or is_sysadmin()));
create policy listing_update on listings for update to authenticated using (can_manage_listing(id)) with check (can_manage_listing(id));

create policy dist_read   on listing_distances for select to anon, authenticated using (can_see_listing(listing_id));
create policy dist_write  on listing_distances for all to authenticated
  using (can_manage_listing(listing_id))
  with check (can_manage_listing(listing_id) and (not partnered or is_sysadmin()));
create policy dist_partner on listing_distances for update to authenticated
  using (app_role() = 'university_admin' and institution_id = app_institution())
  with check (app_role() = 'university_admin' and institution_id = app_institution());

create policy room_read   on rooms for select to anon, authenticated using (can_see_listing(listing_id));
create policy room_insert on rooms for insert to authenticated with check (can_manage_listing(listing_id));
create policy room_update on rooms for update to authenticated using (can_manage_listing(listing_id)) with check (can_manage_listing(listing_id));

create policy bed_read   on beds for select to anon, authenticated using (can_see_listing(listing_of_room(room_id)));
create policy bed_update on beds for update to authenticated using (can_manage_listing(listing_of_room(room_id)))
  with check (can_manage_listing(listing_of_room(room_id)));

-- applications: the student; administrators of the same institution; the system administrator (support, read only)
create policy app_read on applications for select to authenticated using (
  student_id = auth.uid() or is_sysadmin() or (app_role() = 'university_admin' and institution_id = app_institution()));
create policy app_insert on applications for insert to authenticated with check (
  student_id = auth.uid() and app_role() = 'student' and email_verified());
create policy app_update on applications for update to authenticated using (
  student_id = auth.uid() and status in ('draft','profile_incomplete')) with check (student_id = auth.uid());
create policy appev_read on application_events for select to authenticated using (
  exists (select 1 from applications a where a.id = application_id));      -- inherits the application rules above

-- allocation: staff of the institution only. Students see the explanation for their own run, but not excluded rooms.
create policy rule_all on allocation_rules for all to authenticated
  using (is_sysadmin() or (app_role() = 'university_admin' and institution_id = app_institution()))
  with check (is_sysadmin() or (app_role() = 'university_admin' and institution_id = app_institution()));
create policy run_read on allocation_runs for select to authenticated using (
  exists (select 1 from applications a where a.id = application_id));
create policy cand_read on allocation_candidates for select to authenticated using (
  exists (select 1 from allocation_runs r where r.id = run_id) and (app_role() <> 'student' or not excluded));

create policy booking_read on bookings for select to authenticated using (
  student_id = auth.uid() or can_manage_listing(listing_of_bed(bed_id)) or admin_of_listing(listing_of_bed(bed_id)));

create policy pay_read on payments for select to authenticated using (
  payer_id = auth.uid() or is_sysadmin() or owner_of_application(application_id)
  or owns_listing(listing_of_booking(booking_id))
  or exists (select 1 from applications a where a.id = application_id));
create policy pay_update on payments for update to authenticated
  using (owner_of_application(application_id) or owns_listing(listing_of_booking(booking_id)))
  with check (owner_of_application(application_id) or owns_listing(listing_of_booking(booking_id)));

-- tickets: reporter, assigned technician, owner and administrator of the property, system administrator
create policy tkt_read on maintenance_tickets for select to authenticated using (
  reporter_id = auth.uid() or assigned_to = auth.uid() or can_manage_listing(listing_id) or admin_of_listing(listing_id) or is_sysadmin());
create policy tkt_insert on maintenance_tickets for insert to authenticated with check (
  reporter_id = auth.uid() and app_role() = 'student'
  and exists (select 1 from bookings b where b.student_id = auth.uid() and b.state in ('reserved','occupied') and listing_of_bed(b.bed_id) = listing_id));
create policy tkt_update on maintenance_tickets for update to authenticated
  using (can_manage_listing(listing_id) or admin_of_listing(listing_id)) with check (can_manage_listing(listing_id) or admin_of_listing(listing_id));
create policy tev_read on ticket_events for select to authenticated using (
  exists (select 1 from maintenance_tickets t where t.id = ticket_id));

-- announcements and notifications
create policy ann_read on announcements for select to authenticated using (author_id = auth.uid() or is_sysadmin());
create policy ann_insert on announcements for insert to authenticated with check (
  author_id = auth.uid() and (
    is_sysadmin()
    or (app_role() = 'university_admin' and audience in ('institution','role','users','listing')
        and (audience <> 'institution' or audience_institution_id = app_institution())
        and (audience <> 'listing' or admin_of_listing(audience_listing_id)))
    or (app_role() = 'owner' and audience = 'listing' and owns_listing(audience_listing_id))));
create policy notif_read   on notifications for select to authenticated using (recipient_id = auth.uid());
create policy notif_update on notifications for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- documents: the uploader; the owner for THEIR applicants only; administrators in scope. Not the system administrator (OD-03).
create policy doc_read on documents for select to authenticated using (
  uploader_id = auth.uid()
  or owner_of_application(application_id)
  or owns_listing(listing_id)
  or (app_role() = 'university_admin'
      and (exists (select 1 from applications a where a.id = application_id) or admin_of_listing(listing_id))));
create policy doc_insert on documents for insert to authenticated with check (
  uploader_id = auth.uid()
  and (application_id is null or exists (select 1 from applications a where a.id = application_id and a.student_id = auth.uid()))
  and (listing_id is null or owns_listing(listing_id))
  and ((app_role() = 'student' and kind in ('national_id','proof_of_enrolment'))
    or (app_role() = 'owner'   and kind in ('national_id','ownership_proof'))));
create policy doc_review on documents for update to authenticated
  using (app_role() = 'university_admin'
         and (exists (select 1 from applications a where a.id = application_id) or admin_of_listing(listing_id)))
  with check (app_role() = 'university_admin');

create policy short_all on shortlist for all to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy audit_read on audit_events for select to authenticated using (
  is_sysadmin() or actor_id = auth.uid() or (app_role() = 'university_admin' and institution_id = app_institution()));

-- ---------------------------------------------------------------------
-- 9. PERMISSIONS: start from nothing, then grant exactly what is needed.
-- Status columns (application status, ticket status, moderation, roles) are NOT writable from the browser.
-- ---------------------------------------------------------------------
alter default privileges for role postgres in schema public revoke all on tables    from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- reference numbers (APP-2026-1001, TKT-1101) come from sequences that column defaults use when a student inserts a row
grant usage on sequence application_ref_seq, ticket_ref_seq to authenticated;

-- helper functions that the policies call (they only read)
grant execute on function app_role(), app_institution(), is_sysadmin(), email_verified(), listing_of_room(uuid), listing_of_bed(uuid),
  listing_of_booking(uuid), owns_listing(uuid), admin_of_hostel(uuid), admin_of_listing(uuid), can_manage_listing(uuid),
  can_see_listing(uuid), owner_of_application(uuid) to anon, authenticated;

-- actions the browser may call
grant execute on function submit_application(uuid), withdraw_application(uuid, text), decide_allocation(uuid, text, uuid, text, date, date),
  decide_private_application(uuid, text, uuid, text), record_simulated_payment(uuid, payment_purpose, numeric, text),
  assign_ticket(uuid, uuid, text), set_ticket_status(uuid, ticket_status, text), submit_listing_for_moderation(uuid),
  moderate_listing(uuid, moderation_state, text), confirm_listing_availability(uuid), confirm_student_number(uuid),
  publish_announcement(uuid) to authenticated;

-- public reading
grant select on institutions, state_transitions, listing_cards to anon, authenticated;
grant select on listings, listing_distances, rooms, beds to anon, authenticated;

-- signed-in reading (rows are filtered by the policies above)
grant select on profiles, partners, applications, application_events, allocation_rules, allocation_runs, allocation_candidates,
  bookings, payments, maintenance_tickets, ticket_events, announcements, notifications, documents, shortlist, audit_events,
  private_application_inbox to authenticated;

-- signed-in writing, column by column
grant insert, update, delete on institutions to authenticated;                                  -- policy: system administrator only
grant update (full_name, phone, institution_id, student_number, programme, study_year, preferred_room_type, budget_zmw,
              preferred_facilities, emergency_contact, notify_sms, owner_can_see_profile) on profiles to authenticated;
grant insert (owner_id, business_name, contact_phone) on partners to authenticated;
grant update (business_name, contact_phone) on partners to authenticated;
grant insert (partner_id, institution_id, name, type, area, address, description, house_rules, gender, gender_note, facilities,
              rent_unit, deposit_note, min_stay_note, lat, lng) on listings to authenticated;
grant update (name, area, address, description, house_rules, gender, gender_note, facilities, rent_unit, deposit_note,
              min_stay_note, lat, lng) on listings to authenticated;                            -- not moderation, verification, partner
grant insert, delete on listing_distances to authenticated;
grant update (distance_km, partnered) on listing_distances to authenticated;
grant insert (listing_id, room_number, room_type, capacity, price_zmw, wing, floor, gender) on rooms to authenticated;
grant update (room_number, price_zmw, wing, floor, gender) on rooms to authenticated;
grant update (state, state_note, hold_expires_at) on beds to authenticated;
grant insert (student_id, route, institution_id, listing_id, requested_room_type, budget_zmw, gender_needed, intake, preferred_facilities)
  on applications to authenticated;
grant update (requested_room_type, budget_zmw, gender_needed, intake, preferred_facilities) on applications to authenticated;
grant insert (institution_id, name, version, hard_constraints, w_room_type, w_budget, w_distance, w_facilities, w_availability, active, created_by)
  on allocation_rules to authenticated;
grant update (name, hard_constraints, w_room_type, w_budget, w_distance, w_facilities, w_availability, active) on allocation_rules to authenticated;
grant update (status) on payments to authenticated;                                             -- policy: the owner of that tenancy
grant insert (listing_id, bed_id, booking_id, reporter_id, location_text, category, title, description, priority, photo_path)
  on maintenance_tickets to authenticated;
grant update (priority, access_notes, due_at, blocks_bed) on maintenance_tickets to authenticated;
grant insert (author_id, title, body, audience, audience_institution_id, audience_listing_id, audience_role, audience_user_ids)
  on announcements to authenticated;
grant update (read_at) on notifications to authenticated;
grant insert (uploader_id, application_id, listing_id, kind, storage_path, original_name, mime_type, size_bytes) on documents to authenticated;
grant update (review_decision, reviewer_note) on documents to authenticated;
grant insert, delete on shortlist to authenticated;

-- Anyone who signed up before this migration ran still needs a profile.
insert into profiles (id, role, full_name)
select u.id, case when u.raw_user_meta_data ->> 'signup_role' = 'owner' then 'owner'::user_role else 'student'::user_role end,
       coalesce(u.raw_user_meta_data ->> 'full_name', '')
  from auth.users u on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 10. PRIVATE FILE STORAGE for identity and ownership documents (FR11.2)
-- Private bucket: there is no public URL. People upload into a folder named after their own user id.
-- Reviewers open files through short-lived signed links created on the server. Skipped if Storage is not present.
-- ---------------------------------------------------------------------
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public) values ('documents', 'documents', false) on conflict (id) do nothing;
    execute $p$ create policy "documents upload own folder" on storage.objects for insert to authenticated
                with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text) $p$;
    execute $p$ create policy "documents read own folder" on storage.objects for select to authenticated
                using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text) $p$;
  end if;
exception when others then
  raise notice 'Storage policies were not created (%). Create the private "documents" bucket in the dashboard.', sqlerrm;
end $$;

-- Optional, once you want live updates in the app (Realtime):
--   alter publication supabase_realtime add table beds, notifications, applications;
-- Optional scheduled jobs (enable the pg_cron extension first):
--   select cron.schedule('expire-holds',  '*/10 * * * *', 'select public.expire_holds()');
--   select cron.schedule('escalate-tickets', '*/30 * * * *', 'select public.escalate_overdue_tickets()');
