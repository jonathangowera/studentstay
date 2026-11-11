-- =====================================================================
-- StudentStay: security hardening (follows the initial schema)
-- Result of Supabase's security advisor on the first install.
-- =====================================================================

-- 1. Trigger functions: pin the search path so they cannot be tricked into using another schema (advisor lint 0011).
alter function public.set_updated_at()          set search_path = public;
alter function public.profile_before_update()   set search_path = public;
alter function public.bed_before_update()       set search_path = public;
alter function public.enforce_transition()      set search_path = public;
alter function public.document_before_update()  set search_path = public;
alter function public.application_before()      set search_path = public;
alter function public.ticket_before_insert()    set search_path = public;
alter function public.audit_immutable()         set search_path = public;

-- 2. Visitors who are not signed in only need the two helpers that the public read policies call directly
--    (can_see_listing and listing_of_room). Remove the rest from the "anon" role (advisor lint 0028).
revoke execute on function
  app_role(), app_institution(), is_sysadmin(), email_verified(),
  listing_of_bed(uuid), listing_of_booking(uuid), owns_listing(uuid),
  admin_of_hostel(uuid), admin_of_listing(uuid), can_manage_listing(uuid), owner_of_application(uuid)
from anon;
