-- =====================================================================
-- StudentStay: two small helpers for the owner, technician and payment screens
--
-- list_technicians()  lets an owner or administrator pick a technician to assign a repair to.
--                     Owners cannot read other people's profiles, so they could not list technicians before.
-- deposit_quote(app)  tells a student which bed is waiting for her deposit and how much it is
--                     (one month's rent of that room). She cannot read the held bed directly.
-- Neither changes any data.
-- =====================================================================
create function list_technicians() returns table (id uuid, full_name text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name from profiles p
   where p.role = 'technician' and app_role() in ('owner', 'university_admin', 'system_admin')
   order by p.full_name
$$;

create function deposit_quote(p_app uuid) returns table (listing_name text, room_number text, bed_label text, amount_zmw numeric, rent_unit text, hold_expires_at timestamptz)
language sql stable security definer set search_path = public as $$
  select l.name, r.room_number, b.label, r.price_zmw, l.rent_unit, b.hold_expires_at
    from applications a
    join beds b on b.held_for_application_id = a.id and b.state = 'held'
    join rooms r on r.id = b.room_id
    join listings l on l.id = r.listing_id
   where a.id = p_app and a.student_id = auth.uid() and a.status = 'accepted'
  union all
  select l.name, r.room_number, b.label, r.price_zmw, l.rent_unit, null::timestamptz
    from applications a
    join bookings bk on bk.application_id = a.id and bk.state = 'reserved'
    join beds b on b.id = bk.bed_id
    join rooms r on r.id = b.room_id
    join listings l on l.id = r.listing_id
   where a.id = p_app and a.student_id = auth.uid() and a.status = 'approved'
$$;

revoke all on function list_technicians() from public, anon, authenticated;
revoke all on function deposit_quote(uuid) from public, anon, authenticated;
grant execute on function list_technicians() to authenticated;
grant execute on function deposit_quote(uuid) to authenticated;
