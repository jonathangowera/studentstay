-- =====================================================================
-- StudentStay: limit which columns visitors and signed-in users can read
-- on beds and listings. Found while planning slice S3.
--
-- Before: anyone, even not signed in, could read every column of "beds" and "listings", including
--   beds.held_for_application_id (an application id), beds.state_changed_by (a person's id),
--   beds.state_note, and listings.moderation_note (an administrator's internal note).
-- After:  visitors read only what the public pages show. Signed-in users also read the extra fields
--   that owners and administrators need. Row-level security still decides WHICH rows.
--
-- Consequence for code: always list the columns you need. "select *" on beds or listings now fails.
-- =====================================================================

-- beds
revoke select on beds from anon, authenticated;
grant select (id, room_id, label, state, created_at) on beds to anon;
grant select (id, room_id, label, state, state_note, state_changed_at, hold_expires_at, created_at) on beds to authenticated;

-- listings
revoke select on listings from anon, authenticated;
grant select (id, institution_id, name, type, area, address, description, house_rules, gender, gender_note, facilities,
              rent_unit, deposit_note, min_stay_note, verification, last_updated_at, lat, lng) on listings to anon;
grant select (id, partner_id, institution_id, name, type, area, address, description, house_rules, gender, gender_note, facilities,
              rent_unit, deposit_note, min_stay_note, moderation, verification, last_updated_at, lat, lng, created_at, updated_at)
  on listings to authenticated;
