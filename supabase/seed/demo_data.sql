-- =====================================================================
-- StudentStay: DEMO DATA (invented people, properties and payments)
-- Matches the prototypes: 8 properties, 468 beds, bed states Available 67, Held 18,
-- Pending Approval 9, Reserved 31, Occupied 335, Blocked for Maintenance 8.
--
-- BEFORE RUNNING: the 5 demo sign-in users must exist (create them in the dashboard
--   with Authentication > Users > Add user > Create new user, ticking "Auto Confirm User"):
--   natasha.mwale@example.com    (student)
--   rachael.musongo@example.com     (property owner)
--   johnson.kawemba@example.com    (university administrator, UNZA)
--   joseph.sakala@example.com    (technician)
--   platform.admin@example.com   (system administrator)
-- Choose your own passwords. Do not reuse real ones. Use demonstration data ONLY.
-- Run the schema migration first. Run this file once.
-- =====================================================================

do $$
declare v_missing text;
begin
  select string_agg(e, ', ') into v_missing
    from unnest(array['natasha.mwale@example.com', 'rachael.musongo@example.com', 'johnson.kawemba@example.com', 'joseph.sakala@example.com', 'platform.admin@example.com']) e where not exists (select 1 from auth.users u where u.email = e);
  if v_missing is not null then
    raise exception 'Create these demo users first (Authentication > Users > Add user, tick Auto Confirm User): %', v_missing;
  end if;
end $$;

-- Extra demo people who never sign in: five more students and a second technician.
do $$
begin
  if not exists (select 1 from auth.users where email = 'kelvin.sakala@example.com') then
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                            created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'kelvin.sakala@example.com', '', now(),
            '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', 'Kelvin Sakala'), now(), now(), '', '', '', '');
  end if;
  if not exists (select 1 from auth.users where email = 'chanda.phiri@example.com') then
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                            created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'chanda.phiri@example.com', '', now(),
            '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', 'Chanda Phiri'), now(), now(), '', '', '', '');
  end if;
  if not exists (select 1 from auth.users where email = 'thandiwe.sikazwe@example.com') then
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                            created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'thandiwe.sikazwe@example.com', '', now(),
            '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', 'Thandiwe Sikazwe'), now(), now(), '', '', '', '');
  end if;
  if not exists (select 1 from auth.users where email = 'bwalya.kabwe@example.com') then
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                            created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'bwalya.kabwe@example.com', '', now(),
            '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', 'Bwalya Kabwe'), now(), now(), '', '', '', '');
  end if;
  if not exists (select 1 from auth.users where email = 'lweendo.banda@example.com') then
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                            created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'lweendo.banda@example.com', '', now(),
            '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', 'Lweendo Banda'), now(), now(), '', '', '', '');
  end if;
  if not exists (select 1 from auth.users where email = 'mutinta.hamoonga@example.com') then
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                            created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'mutinta.hamoonga@example.com', '', now(),
            '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', 'Mutinta Hamoonga'), now(), now(), '', '', '', '');
  end if;
  if not exists (select 1 from auth.users where email = 'kondwani.musonda@example.com') then
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                            created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'kondwani.musonda@example.com', '', now(),
            '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', 'Kondwani Musonda'), now(), now(), '', '', '', '');
  end if;
  if not exists (select 1 from auth.users where email = 'brian.ngoma@example.com') then
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                            created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'brian.ngoma@example.com', '', now(),
            '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', 'Brian Ngoma'), now(), now(), '', '', '', '');
  end if;
exception when others then
  raise notice 'Extra demo people could not be created (%). Sample applications and tickets that need them will fail; see the design document.', sqlerrm;
end $$;

do $$
declare v_missing text;
begin
  select string_agg(e, ', ') into v_missing from unnest(array['kelvin.sakala@example.com', 'chanda.phiri@example.com', 'thandiwe.sikazwe@example.com', 'bwalya.kabwe@example.com', 'lweendo.banda@example.com', 'mutinta.hamoonga@example.com', 'kondwani.musonda@example.com', 'brian.ngoma@example.com']) e where not exists (select 1 from auth.users u where u.email = e);
  if v_missing is not null then
    raise exception 'The extra demo people could not be created automatically. Add these in Authentication > Users (tick Auto Confirm User), then run this file again: %', v_missing;
  end if;
end $$;

insert into institutions (code, name, status) values
  ('UNZA', 'University of Zambia', 'active'),
  ('UNILUS', 'University of Lusaka', 'active'),
  ('ZCAS', 'ZCAS University', 'active'),
  ('CAVENDISH', 'Cavendish University Zambia', 'active'),
  ('EHC', 'Evelyn Hone College', 'validation_pending');

update profiles set role = 'student'::user_role, full_name = 'Natasha Mwale', institution_id = (select id from institutions where code = 'UNZA'), student_number = '108-397', student_number_matched = true, programme = 'BSc Computing', study_year = 2, preferred_room_type = 'double', budget_zmw = 2000, preferred_facilities = '{wifi,guard,study}', phone = '+260 97 000 0000' where id = (select id from auth.users where email = 'natasha.mwale@example.com');
update profiles set role = 'owner'::user_role, full_name = 'Rachael Musongo' where id = (select id from auth.users where email = 'rachael.musongo@example.com');
update profiles set role = 'university_admin'::user_role, full_name = 'Johnson Kawemba', institution_id = (select id from institutions where code = 'UNZA') where id = (select id from auth.users where email = 'johnson.kawemba@example.com');
update profiles set role = 'technician'::user_role, full_name = 'Joseph Sakala' where id = (select id from auth.users where email = 'joseph.sakala@example.com');
update profiles set role = 'system_admin'::user_role, full_name = 'Platform Administrator' where id = (select id from auth.users where email = 'platform.admin@example.com');
update profiles set full_name = 'Kelvin Sakala', student_number = '123-307', student_number_matched = true, institution_id = (select id from institutions where code = 'CAVENDISH') where id = (select id from auth.users where email = 'kelvin.sakala@example.com');
update profiles set full_name = 'Chanda Phiri', student_number = '106-365', student_number_matched = false where id = (select id from auth.users where email = 'chanda.phiri@example.com');
update profiles set full_name = 'Thandiwe Sikazwe', student_number = '108-155', student_number_matched = true, institution_id = (select id from institutions where code = 'ZCAS') where id = (select id from auth.users where email = 'thandiwe.sikazwe@example.com');
update profiles set full_name = 'Bwalya Kabwe', student_number = '113-395', student_number_matched = false where id = (select id from auth.users where email = 'bwalya.kabwe@example.com');
update profiles set full_name = 'Lweendo Banda', institution_id = (select id from institutions where code = 'UNZA') where id = (select id from auth.users where email = 'lweendo.banda@example.com');
update profiles set full_name = 'Mutinta Hamoonga', student_number = '102-704', student_number_matched = false where id = (select id from auth.users where email = 'mutinta.hamoonga@example.com');
update profiles set full_name = 'Kondwani Musonda', student_number = '100-992', student_number_matched = true, institution_id = (select id from institutions where code = 'UNILUS') where id = (select id from auth.users where email = 'kondwani.musonda@example.com');
update profiles set role = 'technician', full_name = 'Brian Ngoma' where id = (select id from auth.users where email = 'brian.ngoma@example.com');

insert into partners (owner_id, business_name, verification) values
  (null, 'Chola Mwila', 'verified'),
  (null, 'Peter Sichone', 'verified'),
  ((select id from auth.users where email = 'rachael.musongo@example.com'), 'Rachael Musongo', 'verified'),
  (null, 'Daniel Kunda', 'pending'),
  (null, 'Martha Zulu', 'requires_review'),
  (null, 'UNZA Accommodation Office', 'verified');

insert into listings (partner_id, institution_id, name, type, area, address, description, house_rules, gender, gender_note, facilities, rent_unit, deposit_note, min_stay_note, moderation, verification) values
  ((select id from partners where business_name = 'Chola Mwila'), null, 'Great East Court', 'recognised_boarding_house', 'Great East Road', 'Great East Road, Lusaka', 'Student accommodation in Great East Road. Demonstration listing.', 'Visiting hours 08:00 to 20:00 in shared areas only.', 'mixed', 'Mixed, separate wings', '{wifi,water,guard,cctv,fire,study}', 'month', 'One month''s rent', 'One semester', 'published', 'verified'),
  ((select id from partners where business_name = 'Peter Sichone'), null, 'Kalingalinga Student Homes', 'private_rental', 'Kalingalinga', 'Kalingalinga, Lusaka', 'Student accommodation in Kalingalinga. Demonstration listing.', 'Visiting hours 08:00 to 20:00 in shared areas only.', 'male_only', 'Male only', '{water,guard,power}', 'month', 'One month''s rent', 'One semester', 'published', 'verified'),
  ((select id from partners where business_name = 'Rachael Musongo'), null, 'Olympia Park Residence', 'recognised_boarding_house', 'Olympia Park', 'Olympia Park, Lusaka', 'Student accommodation in Olympia Park. Demonstration listing.', 'Visiting hours 08:00 to 20:00 in shared areas only.', 'female_only', 'Female only', '{wifi,water,power,guard,cctv,fire,laundry,study}', 'month', 'One month''s rent', 'One semester', 'published', 'verified'),
  ((select id from partners where business_name = 'Rachael Musongo'), null, 'Northmead Scholars’ Lodge', 'recognised_boarding_house', 'Northmead', 'Northmead, Lusaka', 'Student accommodation in Northmead. Demonstration listing.', 'Visiting hours 08:00 to 20:00 in shared areas only.', 'female_only', 'Female only', '{wifi,water,guard,cctv,fire}', 'month', 'One month''s rent', 'One semester', 'published', 'verified'),
  ((select id from partners where business_name = 'Daniel Kunda'), null, 'Chelston Gardens Rooms', 'private_rental', 'Chelston', 'Chelston, Lusaka', 'Student accommodation in Chelston. Demonstration listing.', 'Visiting hours 08:00 to 20:00 in shared areas only.', 'mixed', 'Mixed', '{water,guard}', 'month', 'One month''s rent', 'One semester', 'published', 'pending'),
  ((select id from partners where business_name = 'Martha Zulu'), null, 'Rhodes Park Annex', 'private_rental', 'Rhodes Park', 'Rhodes Park, Lusaka', 'Student accommodation in Rhodes Park. Demonstration listing.', 'Visiting hours 08:00 to 20:00 in shared areas only.', 'mixed', 'Mixed', '{wifi,water,power,guard}', 'month', 'One month''s rent', 'One semester', 'published', 'requires_review'),
  ((select id from partners where business_name = 'UNZA Accommodation Office'), (select id from institutions where code = 'UNZA'), 'Riverside Hall', 'university_hostel', 'Great East Road Campus', 'Great East Road Campus, Lusaka', 'Student accommodation in Great East Road Campus. Demonstration listing.', 'Visiting hours 08:00 to 20:00 in shared areas only.', 'mixed', 'Female and male wings', '{wifi,water,power,guard,fire,study,laundry}', 'term', 'One month''s rent', 'One semester', 'published', 'verified'),
  ((select id from partners where business_name = 'Peter Sichone'), null, 'Woodlands Student Villas', 'private_rental', 'Woodlands', 'Woodlands, Lusaka', 'Student accommodation in Woodlands. Demonstration listing.', 'Visiting hours 08:00 to 20:00 in shared areas only.', 'mixed', 'Mixed', '{wifi,water,guard,power}', 'month', 'One month''s rent', 'One semester', 'published', 'verified');

insert into listing_distances (listing_id, institution_id, distance_km, partnered) values
  ((select id from listings where name = 'Great East Court'), (select id from institutions where code = 'UNZA'), 1.1, true),
  ((select id from listings where name = 'Great East Court'), (select id from institutions where code = 'CAVENDISH'), 7.4, true),
  ((select id from listings where name = 'Kalingalinga Student Homes'), (select id from institutions where code = 'UNZA'), 2.6, true),
  ((select id from listings where name = 'Kalingalinga Student Homes'), (select id from institutions where code = 'CAVENDISH'), 8.9, false),
  ((select id from listings where name = 'Olympia Park Residence'), (select id from institutions where code = 'CAVENDISH'), 2.2, true),
  ((select id from listings where name = 'Olympia Park Residence'), (select id from institutions where code = 'ZCAS'), 3.1, true),
  ((select id from listings where name = 'Olympia Park Residence'), (select id from institutions where code = 'UNZA'), 6.0, false),
  ((select id from listings where name = 'Northmead Scholars’ Lodge'), (select id from institutions where code = 'ZCAS'), 1.8, true),
  ((select id from listings where name = 'Northmead Scholars’ Lodge'), (select id from institutions where code = 'EHC'), 3.4, true),
  ((select id from listings where name = 'Chelston Gardens Rooms'), (select id from institutions where code = 'UNILUS'), 4.2, false),
  ((select id from listings where name = 'Chelston Gardens Rooms'), (select id from institutions where code = 'EHC'), 7.8, false),
  ((select id from listings where name = 'Rhodes Park Annex'), (select id from institutions where code = 'EHC'), 2.0, false),
  ((select id from listings where name = 'Rhodes Park Annex'), (select id from institutions where code = 'UNILUS'), 5.1, false),
  ((select id from listings where name = 'Riverside Hall'), (select id from institutions where code = 'UNZA'), 0.3, true),
  ((select id from listings where name = 'Woodlands Student Villas'), (select id from institutions where code = 'UNILUS'), 3.8, true),
  ((select id from listings where name = 'Woodlands Student Villas'), (select id from institutions where code = 'EHC'), 5.5, false),
  ((select id from listings where name = 'Woodlands Student Villas'), (select id from institutions where code = 'CAVENDISH'), 6.4, false);

-- Rooms. The automatic bed-creation trigger is paused so each bed can be inserted with its state.
alter table rooms disable trigger rooms_create_beds;
insert into rooms (listing_id, room_number, room_type, capacity, price_zmw, wing, floor)
select l.id, v.no, v.t::room_type, v.cap, v.price, v.wing, v.fl from (values
  ('Great East Court', '101', 'single', 1, 2400, null, 1),
  ('Great East Court', '102', 'single', 1, 2400, null, 1),
  ('Great East Court', '103', 'single', 1, 2400, null, 1),
  ('Great East Court', '104', 'single', 1, 2400, null, 1),
  ('Great East Court', '105', 'double', 2, 1900, null, 1),
  ('Great East Court', '106', 'double', 2, 1900, null, 1),
  ('Great East Court', '107', 'double', 2, 1900, null, 1),
  ('Great East Court', '108', 'double', 2, 1900, null, 1),
  ('Great East Court', '201', 'double', 2, 1900, null, 2),
  ('Great East Court', '202', 'double', 2, 1900, null, 2),
  ('Great East Court', '203', 'double', 2, 1900, null, 2),
  ('Great East Court', '204', 'double', 2, 1900, null, 2),
  ('Great East Court', '205', 'double', 2, 1900, null, 2),
  ('Great East Court', '206', 'double', 2, 1900, null, 2),
  ('Great East Court', '207', 'double', 2, 1900, null, 2),
  ('Great East Court', '208', 'double', 2, 1900, null, 2),
  ('Great East Court', '301', 'double', 2, 1900, null, 3),
  ('Great East Court', '302', 'double', 2, 1900, null, 3),
  ('Great East Court', '303', 'triple', 3, 1350, null, 3),
  ('Great East Court', '304', 'triple', 3, 1350, null, 3),
  ('Great East Court', '305', 'triple', 3, 1350, null, 3),
  ('Great East Court', '306', 'triple', 3, 1350, null, 3),
  ('Great East Court', '307', 'triple', 3, 1350, null, 3),
  ('Great East Court', '308', 'triple', 3, 1350, null, 3),
  ('Kalingalinga Student Homes', '01', 'triple', 3, 900, null, null),
  ('Kalingalinga Student Homes', '02', 'triple', 3, 900, null, null),
  ('Kalingalinga Student Homes', '03', 'triple', 3, 900, null, null),
  ('Kalingalinga Student Homes', '04', 'triple', 3, 900, null, null),
  ('Kalingalinga Student Homes', '05', 'triple', 3, 900, null, null),
  ('Kalingalinga Student Homes', '06', 'triple', 3, 900, null, null),
  ('Kalingalinga Student Homes', '07', 'triple', 3, 900, null, null),
  ('Kalingalinga Student Homes', '08', 'triple', 3, 900, null, null),
  ('Kalingalinga Student Homes', '09', 'double', 2, 1200, null, null),
  ('Kalingalinga Student Homes', '10', 'double', 2, 1200, null, null),
  ('Kalingalinga Student Homes', '11', 'double', 2, 1200, null, null),
  ('Kalingalinga Student Homes', '12', 'double', 2, 1200, null, null),
  ('Kalingalinga Student Homes', '13', 'double', 2, 1200, null, null),
  ('Kalingalinga Student Homes', '14', 'double', 2, 1200, null, null),
  ('Kalingalinga Student Homes', '15', 'double', 2, 1200, null, null),
  ('Kalingalinga Student Homes', '16', 'double', 2, 1200, null, null),
  ('Olympia Park Residence', '101', 'triple', 3, 1800, null, 1),
  ('Olympia Park Residence', '102', 'triple', 3, 1800, null, 1),
  ('Olympia Park Residence', '103', 'triple', 3, 1800, null, 1),
  ('Olympia Park Residence', '104', 'triple', 3, 1800, null, 1),
  ('Olympia Park Residence', '105', 'triple', 3, 1800, null, 1),
  ('Olympia Park Residence', '106', 'triple', 3, 1800, null, 1),
  ('Olympia Park Residence', '107', 'triple', 3, 1800, null, 1),
  ('Olympia Park Residence', '108', 'triple', 3, 1800, null, 1),
  ('Olympia Park Residence', '109', 'triple', 3, 1800, null, 1),
  ('Olympia Park Residence', '110', 'triple', 3, 1800, null, 1),
  ('Olympia Park Residence', '111', 'triple', 3, 1800, null, 1),
  ('Olympia Park Residence', '112', 'triple', 3, 1800, null, 1),
  ('Olympia Park Residence', '113', 'double', 2, 2500, null, 1),
  ('Olympia Park Residence', '114', 'double', 2, 2500, null, 1),
  ('Olympia Park Residence', '115', 'double', 2, 2500, null, 1),
  ('Olympia Park Residence', '201', 'double', 2, 2500, null, 2),
  ('Olympia Park Residence', '202', 'double', 2, 2500, null, 2),
  ('Olympia Park Residence', '203', 'double', 2, 2500, null, 2),
  ('Olympia Park Residence', '204', 'double', 2, 2500, null, 2),
  ('Olympia Park Residence', '205', 'double', 2, 2500, null, 2),
  ('Olympia Park Residence', '206', 'double', 2, 2500, null, 2),
  ('Olympia Park Residence', '207', 'double', 2, 2500, null, 2),
  ('Olympia Park Residence', '208', 'double', 2, 2500, null, 2),
  ('Olympia Park Residence', '209', 'double', 2, 2500, null, 2),
  ('Olympia Park Residence', '210', 'double', 2, 2500, null, 2),
  ('Olympia Park Residence', '211', 'double', 2, 2500, null, 2),
  ('Olympia Park Residence', '212', 'double', 2, 2500, null, 2),
  ('Olympia Park Residence', '213', 'double', 2, 2500, null, 2),
  ('Olympia Park Residence', '214', 'double', 2, 2500, null, 2),
  ('Olympia Park Residence', '215', 'double', 2, 2500, null, 2),
  ('Northmead Scholars’ Lodge', '101', 'triple', 3, 1600, null, 1),
  ('Northmead Scholars’ Lodge', '102', 'triple', 3, 1600, null, 1),
  ('Northmead Scholars’ Lodge', '103', 'triple', 3, 1600, null, 1),
  ('Northmead Scholars’ Lodge', '104', 'triple', 3, 1600, null, 1),
  ('Northmead Scholars’ Lodge', '105', 'double', 2, 2100, null, 1),
  ('Northmead Scholars’ Lodge', '106', 'double', 2, 2100, null, 1),
  ('Northmead Scholars’ Lodge', '107', 'double', 2, 2100, null, 1),
  ('Northmead Scholars’ Lodge', '108', 'double', 2, 2100, null, 1),
  ('Northmead Scholars’ Lodge', '109', 'double', 2, 2100, null, 1),
  ('Northmead Scholars’ Lodge', '110', 'double', 2, 2100, null, 1),
  ('Northmead Scholars’ Lodge', '111', 'double', 2, 2100, null, 1),
  ('Northmead Scholars’ Lodge', '112', 'double', 2, 2100, null, 1),
  ('Northmead Scholars’ Lodge', '201', 'double', 2, 2100, null, 2),
  ('Northmead Scholars’ Lodge', '202', 'double', 2, 2100, null, 2),
  ('Northmead Scholars’ Lodge', '203', 'double', 2, 2100, null, 2),
  ('Northmead Scholars’ Lodge', '204', 'double', 2, 2100, null, 2),
  ('Northmead Scholars’ Lodge', '205', 'double', 2, 2100, null, 2),
  ('Northmead Scholars’ Lodge', '206', 'double', 2, 2100, null, 2),
  ('Northmead Scholars’ Lodge', '207', 'double', 2, 2100, null, 2),
  ('Northmead Scholars’ Lodge', '208', 'double', 2, 2100, null, 2),
  ('Northmead Scholars’ Lodge', '209', 'double', 2, 2100, null, 2),
  ('Northmead Scholars’ Lodge', '210', 'double', 2, 2100, null, 2),
  ('Northmead Scholars’ Lodge', '211', 'double', 2, 2100, null, 2),
  ('Northmead Scholars’ Lodge', '212', 'double', 2, 2100, null, 2),
  ('Northmead Scholars’ Lodge', '301', 'double', 2, 2100, null, 3),
  ('Northmead Scholars’ Lodge', '302', 'double', 2, 2100, null, 3),
  ('Northmead Scholars’ Lodge', '303', 'double', 2, 2100, null, 3),
  ('Northmead Scholars’ Lodge', '304', 'double', 2, 2100, null, 3),
  ('Chelston Gardens Rooms', '101', 'single', 1, 1700, null, 1),
  ('Chelston Gardens Rooms', '102', 'triple', 3, 1000, null, 1),
  ('Chelston Gardens Rooms', '103', 'double', 2, 1350, null, 1),
  ('Chelston Gardens Rooms', '104', 'double', 2, 1350, null, 1),
  ('Chelston Gardens Rooms', '105', 'double', 2, 1350, null, 1),
  ('Chelston Gardens Rooms', '106', 'double', 2, 1350, null, 1),
  ('Chelston Gardens Rooms', '107', 'double', 2, 1350, null, 1),
  ('Chelston Gardens Rooms', '108', 'double', 2, 1350, null, 1),
  ('Chelston Gardens Rooms', '109', 'double', 2, 1350, null, 1),
  ('Chelston Gardens Rooms', '110', 'double', 2, 1350, null, 1),
  ('Chelston Gardens Rooms', '111', 'double', 2, 1350, null, 1),
  ('Chelston Gardens Rooms', '112', 'double', 2, 1350, null, 1),
  ('Rhodes Park Annex', '101', 'single', 1, 3500, null, 1),
  ('Rhodes Park Annex', '102', 'triple', 3, 2200, null, 1),
  ('Rhodes Park Annex', '103', 'double', 2, 2850, null, 1),
  ('Rhodes Park Annex', '104', 'double', 2, 2850, null, 1),
  ('Rhodes Park Annex', '105', 'double', 2, 2850, null, 1),
  ('Rhodes Park Annex', '106', 'double', 2, 2850, null, 1),
  ('Riverside Hall', '101', 'triple', 3, 3600, 'Block 1', null),
  ('Riverside Hall', '102', 'triple', 3, 3600, 'Block 1', null),
  ('Riverside Hall', '103', 'triple', 3, 3600, 'Block 1', null),
  ('Riverside Hall', '104', 'triple', 3, 3600, 'Block 1', null),
  ('Riverside Hall', '105', 'triple', 3, 3600, 'Block 1', null),
  ('Riverside Hall', '106', 'triple', 3, 3600, 'Block 1', null),
  ('Riverside Hall', '107', 'triple', 3, 3600, 'Block 1', null),
  ('Riverside Hall', '108', 'triple', 3, 3600, 'Block 1', null),
  ('Riverside Hall', '109', 'triple', 3, 3600, 'Block 1', null),
  ('Riverside Hall', '110', 'triple', 3, 3600, 'Block 1', null),
  ('Riverside Hall', '111', 'triple', 3, 3600, 'Block 1', null),
  ('Riverside Hall', '112', 'triple', 3, 3600, 'Block 1', null),
  ('Riverside Hall', '113', 'triple', 3, 3600, 'Block 1', null),
  ('Riverside Hall', '114', 'triple', 3, 3600, 'Block 1', null),
  ('Riverside Hall', '115', 'triple', 3, 3600, 'Block 1', null),
  ('Riverside Hall', '116', 'triple', 3, 3600, 'Block 1', null),
  ('Riverside Hall', '117', 'triple', 3, 3600, 'Block 1', null),
  ('Riverside Hall', '118', 'triple', 3, 3600, 'Block 1', null),
  ('Riverside Hall', '119', 'triple', 3, 3600, 'Block 1', null),
  ('Riverside Hall', '201', 'triple', 3, 3600, 'Block 2', null),
  ('Riverside Hall', '202', 'triple', 3, 3600, 'Block 2', null),
  ('Riverside Hall', '203', 'triple', 3, 3600, 'Block 2', null),
  ('Riverside Hall', '204', 'triple', 3, 3600, 'Block 2', null),
  ('Riverside Hall', '205', 'triple', 3, 3600, 'Block 2', null),
  ('Riverside Hall', '206', 'triple', 3, 3600, 'Block 2', null),
  ('Riverside Hall', '207', 'triple', 3, 3600, 'Block 2', null),
  ('Riverside Hall', '208', 'triple', 3, 3600, 'Block 2', null),
  ('Riverside Hall', '209', 'triple', 3, 3600, 'Block 2', null),
  ('Riverside Hall', '210', 'double', 2, 4400, 'Block 2', null),
  ('Riverside Hall', '211', 'double', 2, 4400, 'Block 2', null),
  ('Riverside Hall', '212', 'double', 2, 4400, 'Block 2', null),
  ('Riverside Hall', '213', 'double', 2, 4400, 'Block 2', null),
  ('Riverside Hall', '214', 'double', 2, 4400, 'Block 2', null),
  ('Riverside Hall', '215', 'double', 2, 4400, 'Block 2', null),
  ('Riverside Hall', '216', 'double', 2, 4400, 'Block 2', null),
  ('Riverside Hall', '217', 'double', 2, 4400, 'Block 2', null),
  ('Riverside Hall', '218', 'double', 2, 4400, 'Block 2', null),
  ('Riverside Hall', '219', 'double', 2, 4400, 'Block 2', null),
  ('Riverside Hall', '301', 'double', 2, 4400, 'Block 3', null),
  ('Riverside Hall', '302', 'double', 2, 4400, 'Block 3', null),
  ('Riverside Hall', '303', 'double', 2, 4400, 'Block 3', null),
  ('Riverside Hall', '304', 'double', 2, 4400, 'Block 3', null),
  ('Riverside Hall', '305', 'double', 2, 4400, 'Block 3', null),
  ('Riverside Hall', '306', 'double', 2, 4400, 'Block 3', null),
  ('Riverside Hall', '307', 'double', 2, 4400, 'Block 3', null),
  ('Riverside Hall', '308', 'double', 2, 4400, 'Block 3', null),
  ('Riverside Hall', '309', 'double', 2, 4400, 'Block 3', null),
  ('Riverside Hall', '310', 'double', 2, 4400, 'Block 3', null),
  ('Riverside Hall', '311', 'double', 2, 4400, 'Block 3', null),
  ('Riverside Hall', '312', 'double', 2, 4400, 'Block 3', null),
  ('Riverside Hall', '313', 'double', 2, 4400, 'Block 3', null),
  ('Riverside Hall', '314', 'double', 2, 4400, 'Block 3', null),
  ('Riverside Hall', '315', 'double', 2, 4400, 'Block 3', null),
  ('Riverside Hall', '316', 'double', 2, 4400, 'Block 3', null),
  ('Riverside Hall', '317', 'double', 2, 4400, 'Block 3', null),
  ('Riverside Hall', '318', 'double', 2, 4400, 'Block 3', null),
  ('Riverside Hall', '319', 'double', 2, 4400, 'Block 3', null),
  ('Riverside Hall', '401', 'double', 2, 4400, 'Block 4', null),
  ('Riverside Hall', '402', 'double', 2, 4400, 'Block 4', null),
  ('Riverside Hall', '403', 'double', 2, 4400, 'Block 4', null),
  ('Riverside Hall', '404', 'double', 2, 4400, 'Block 4', null),
  ('Riverside Hall', '405', 'double', 2, 4400, 'Block 4', null),
  ('Riverside Hall', '406', 'double', 2, 4400, 'Block 4', null),
  ('Riverside Hall', '407', 'double', 2, 4400, 'Block 4', null),
  ('Riverside Hall', '408', 'double', 2, 4400, 'Block 4', null),
  ('Riverside Hall', '409', 'double', 2, 4400, 'Block 4', null),
  ('Riverside Hall', '410', 'double', 2, 4400, 'Block 4', null),
  ('Riverside Hall', '411', 'double', 2, 4400, 'Block 4', null),
  ('Riverside Hall', '412', 'double', 2, 4400, 'Block 4', null),
  ('Riverside Hall', '413', 'double', 2, 4400, 'Block 4', null),
  ('Riverside Hall', '414', 'double', 2, 4400, 'Block 4', null),
  ('Riverside Hall', '415', 'double', 2, 4400, 'Block 4', null),
  ('Riverside Hall', '416', 'double', 2, 4400, 'Block 4', null),
  ('Riverside Hall', '417', 'double', 2, 4400, 'Block 4', null),
  ('Riverside Hall', '418', 'double', 2, 4400, 'Block 4', null),
  ('Riverside Hall', '419', 'double', 2, 4400, 'Block 4', null),
  ('Woodlands Student Villas', '101', 'triple', 3, 1400, null, 1),
  ('Woodlands Student Villas', '102', 'triple', 3, 1400, null, 1),
  ('Woodlands Student Villas', '103', 'double', 2, 1700, null, 1),
  ('Woodlands Student Villas', '104', 'double', 2, 1700, null, 1),
  ('Woodlands Student Villas', '105', 'double', 2, 1700, null, 1),
  ('Woodlands Student Villas', '106', 'double', 2, 1700, null, 1),
  ('Woodlands Student Villas', '107', 'double', 2, 1700, null, 1),
  ('Woodlands Student Villas', '108', 'double', 2, 1700, null, 1),
  ('Woodlands Student Villas', '109', 'double', 2, 1700, null, 1),
  ('Woodlands Student Villas', '110', 'double', 2, 1700, null, 1),
  ('Woodlands Student Villas', '111', 'double', 2, 1700, null, 1),
  ('Woodlands Student Villas', '112', 'double', 2, 1700, null, 1),
  ('Woodlands Student Villas', '201', 'double', 2, 1700, null, 2),
  ('Woodlands Student Villas', '202', 'double', 2, 1700, null, 2)
) as v(listing, no, t, cap, price, wing, fl) join listings l on l.name = v.listing;
alter table rooms enable trigger rooms_create_beds;

insert into beds (room_id, label, state, hold_expires_at)
select r.id, v.lab, v.s::bed_state, case when v.s = 'held' then now() + (v.hrs || ' hours')::interval end from (values
  ('Great East Court', '101', 'A', 'available', null),
  ('Great East Court', '102', 'A', 'occupied', null),
  ('Great East Court', '103', 'A', 'occupied', null),
  ('Great East Court', '104', 'A', 'held', 35),
  ('Great East Court', '105', 'A', 'available', null),
  ('Great East Court', '105', 'B', 'occupied', null),
  ('Great East Court', '106', 'A', 'occupied', null),
  ('Great East Court', '106', 'B', 'reserved', null),
  ('Great East Court', '107', 'A', 'occupied', null),
  ('Great East Court', '107', 'B', 'held', 24),
  ('Great East Court', '108', 'A', 'available', null),
  ('Great East Court', '108', 'B', 'occupied', null),
  ('Great East Court', '201', 'A', 'occupied', null),
  ('Great East Court', '201', 'B', 'pending_approval', null),
  ('Great East Court', '202', 'A', 'occupied', null),
  ('Great East Court', '202', 'B', 'occupied', null),
  ('Great East Court', '203', 'A', 'available', null),
  ('Great East Court', '203', 'B', 'occupied', null),
  ('Great East Court', '204', 'A', 'reserved', null),
  ('Great East Court', '204', 'B', 'occupied', null),
  ('Great East Court', '205', 'A', 'occupied', null),
  ('Great East Court', '205', 'B', 'occupied', null),
  ('Great East Court', '206', 'A', 'available', null),
  ('Great East Court', '206', 'B', 'reserved', null),
  ('Great East Court', '207', 'A', 'pending_approval', null),
  ('Great East Court', '207', 'B', 'occupied', null),
  ('Great East Court', '208', 'A', 'blocked_for_maintenance', null),
  ('Great East Court', '208', 'B', 'occupied', null),
  ('Great East Court', '301', 'A', 'held', 34),
  ('Great East Court', '301', 'B', 'blocked_for_maintenance', null),
  ('Great East Court', '302', 'A', 'occupied', null),
  ('Great East Court', '302', 'B', 'occupied', null),
  ('Great East Court', '303', 'A', 'available', null),
  ('Great East Court', '303', 'B', 'occupied', null),
  ('Great East Court', '303', 'C', 'occupied', null),
  ('Great East Court', '304', 'A', 'available', null),
  ('Great East Court', '304', 'B', 'occupied', null),
  ('Great East Court', '304', 'C', 'occupied', null),
  ('Great East Court', '305', 'A', 'available', null),
  ('Great East Court', '305', 'B', 'occupied', null),
  ('Great East Court', '305', 'C', 'occupied', null),
  ('Great East Court', '306', 'A', 'available', null),
  ('Great East Court', '306', 'B', 'occupied', null),
  ('Great East Court', '306', 'C', 'reserved', null),
  ('Great East Court', '307', 'A', 'occupied', null),
  ('Great East Court', '307', 'B', 'occupied', null),
  ('Great East Court', '307', 'C', 'occupied', null),
  ('Great East Court', '308', 'A', 'occupied', null),
  ('Great East Court', '308', 'B', 'reserved', null),
  ('Great East Court', '308', 'C', 'occupied', null),
  ('Kalingalinga Student Homes', '01', 'A', 'occupied', null),
  ('Kalingalinga Student Homes', '01', 'B', 'available', null),
  ('Kalingalinga Student Homes', '01', 'C', 'occupied', null),
  ('Kalingalinga Student Homes', '02', 'A', 'blocked_for_maintenance', null),
  ('Kalingalinga Student Homes', '02', 'B', 'occupied', null),
  ('Kalingalinga Student Homes', '02', 'C', 'occupied', null),
  ('Kalingalinga Student Homes', '03', 'A', 'occupied', null),
  ('Kalingalinga Student Homes', '03', 'B', 'held', 18),
  ('Kalingalinga Student Homes', '03', 'C', 'occupied', null),
  ('Kalingalinga Student Homes', '04', 'A', 'occupied', null),
  ('Kalingalinga Student Homes', '04', 'B', 'reserved', null),
  ('Kalingalinga Student Homes', '04', 'C', 'occupied', null),
  ('Kalingalinga Student Homes', '05', 'A', 'occupied', null),
  ('Kalingalinga Student Homes', '05', 'B', 'occupied', null),
  ('Kalingalinga Student Homes', '05', 'C', 'available', null),
  ('Kalingalinga Student Homes', '06', 'A', 'occupied', null),
  ('Kalingalinga Student Homes', '06', 'B', 'available', null),
  ('Kalingalinga Student Homes', '06', 'C', 'occupied', null),
  ('Kalingalinga Student Homes', '07', 'A', 'occupied', null),
  ('Kalingalinga Student Homes', '07', 'B', 'occupied', null),
  ('Kalingalinga Student Homes', '07', 'C', 'available', null),
  ('Kalingalinga Student Homes', '08', 'A', 'occupied', null),
  ('Kalingalinga Student Homes', '08', 'B', 'occupied', null),
  ('Kalingalinga Student Homes', '08', 'C', 'occupied', null),
  ('Kalingalinga Student Homes', '09', 'A', 'occupied', null),
  ('Kalingalinga Student Homes', '09', 'B', 'available', null),
  ('Kalingalinga Student Homes', '10', 'A', 'occupied', null),
  ('Kalingalinga Student Homes', '10', 'B', 'occupied', null),
  ('Kalingalinga Student Homes', '11', 'A', 'available', null),
  ('Kalingalinga Student Homes', '11', 'B', 'reserved', null),
  ('Kalingalinga Student Homes', '12', 'A', 'occupied', null),
  ('Kalingalinga Student Homes', '12', 'B', 'occupied', null),
  ('Kalingalinga Student Homes', '13', 'A', 'occupied', null),
  ('Kalingalinga Student Homes', '13', 'B', 'reserved', null),
  ('Kalingalinga Student Homes', '14', 'A', 'occupied', null),
  ('Kalingalinga Student Homes', '14', 'B', 'occupied', null),
  ('Kalingalinga Student Homes', '15', 'A', 'occupied', null),
  ('Kalingalinga Student Homes', '15', 'B', 'occupied', null),
  ('Kalingalinga Student Homes', '16', 'A', 'occupied', null),
  ('Kalingalinga Student Homes', '16', 'B', 'held', 16),
  ('Olympia Park Residence', '101', 'A', 'occupied', null),
  ('Olympia Park Residence', '101', 'B', 'occupied', null),
  ('Olympia Park Residence', '101', 'C', 'available', null),
  ('Olympia Park Residence', '102', 'A', 'occupied', null),
  ('Olympia Park Residence', '102', 'B', 'available', null),
  ('Olympia Park Residence', '102', 'C', 'reserved', null),
  ('Olympia Park Residence', '103', 'A', 'occupied', null),
  ('Olympia Park Residence', '103', 'B', 'occupied', null),
  ('Olympia Park Residence', '103', 'C', 'available', null),
  ('Olympia Park Residence', '104', 'A', 'occupied', null),
  ('Olympia Park Residence', '104', 'B', 'occupied', null),
  ('Olympia Park Residence', '104', 'C', 'occupied', null),
  ('Olympia Park Residence', '105', 'A', 'occupied', null),
  ('Olympia Park Residence', '105', 'B', 'occupied', null),
  ('Olympia Park Residence', '105', 'C', 'reserved', null),
  ('Olympia Park Residence', '106', 'A', 'occupied', null),
  ('Olympia Park Residence', '106', 'B', 'occupied', null),
  ('Olympia Park Residence', '106', 'C', 'occupied', null),
  ('Olympia Park Residence', '107', 'A', 'occupied', null),
  ('Olympia Park Residence', '107', 'B', 'available', null),
  ('Olympia Park Residence', '107', 'C', 'occupied', null),
  ('Olympia Park Residence', '108', 'A', 'available', null),
  ('Olympia Park Residence', '108', 'B', 'available', null),
  ('Olympia Park Residence', '108', 'C', 'occupied', null),
  ('Olympia Park Residence', '109', 'A', 'occupied', null),
  ('Olympia Park Residence', '109', 'B', 'available', null),
  ('Olympia Park Residence', '109', 'C', 'occupied', null),
  ('Olympia Park Residence', '110', 'A', 'occupied', null),
  ('Olympia Park Residence', '110', 'B', 'reserved', null),
  ('Olympia Park Residence', '110', 'C', 'occupied', null),
  ('Olympia Park Residence', '111', 'A', 'reserved', null),
  ('Olympia Park Residence', '111', 'B', 'available', null),
  ('Olympia Park Residence', '111', 'C', 'available', null),
  ('Olympia Park Residence', '112', 'A', 'occupied', null),
  ('Olympia Park Residence', '112', 'B', 'occupied', null),
  ('Olympia Park Residence', '112', 'C', 'occupied', null),
  ('Olympia Park Residence', '113', 'A', 'occupied', null),
  ('Olympia Park Residence', '113', 'B', 'held', 44),
  ('Olympia Park Residence', '114', 'A', 'occupied', null),
  ('Olympia Park Residence', '114', 'B', 'available', null),
  ('Olympia Park Residence', '115', 'A', 'available', null),
  ('Olympia Park Residence', '115', 'B', 'available', null),
  ('Olympia Park Residence', '201', 'A', 'occupied', null),
  ('Olympia Park Residence', '201', 'B', 'held', 31),
  ('Olympia Park Residence', '202', 'A', 'occupied', null),
  ('Olympia Park Residence', '202', 'B', 'occupied', null),
  ('Olympia Park Residence', '203', 'A', 'occupied', null),
  ('Olympia Park Residence', '203', 'B', 'occupied', null),
  ('Olympia Park Residence', '204', 'A', 'occupied', null),
  ('Olympia Park Residence', '204', 'B', 'occupied', null),
  ('Olympia Park Residence', '205', 'A', 'occupied', null),
  ('Olympia Park Residence', '205', 'B', 'occupied', null),
  ('Olympia Park Residence', '206', 'A', 'occupied', null),
  ('Olympia Park Residence', '206', 'B', 'available', null),
  ('Olympia Park Residence', '207', 'A', 'occupied', null),
  ('Olympia Park Residence', '207', 'B', 'occupied', null),
  ('Olympia Park Residence', '208', 'A', 'occupied', null),
  ('Olympia Park Residence', '208', 'B', 'held', 30),
  ('Olympia Park Residence', '209', 'A', 'held', 20),
  ('Olympia Park Residence', '209', 'B', 'occupied', null),
  ('Olympia Park Residence', '210', 'A', 'occupied', null),
  ('Olympia Park Residence', '210', 'B', 'blocked_for_maintenance', null),
  ('Olympia Park Residence', '211', 'A', 'occupied', null),
  ('Olympia Park Residence', '211', 'B', 'occupied', null),
  ('Olympia Park Residence', '212', 'A', 'occupied', null),
  ('Olympia Park Residence', '212', 'B', 'reserved', null),
  ('Olympia Park Residence', '213', 'A', 'occupied', null),
  ('Olympia Park Residence', '213', 'B', 'available', null),
  ('Olympia Park Residence', '214', 'A', 'occupied', null),
  ('Olympia Park Residence', '214', 'B', 'reserved', null),
  ('Olympia Park Residence', '215', 'A', 'occupied', null),
  ('Olympia Park Residence', '215', 'B', 'occupied', null),
  ('Northmead Scholars’ Lodge', '101', 'A', 'occupied', null),
  ('Northmead Scholars’ Lodge', '101', 'B', 'occupied', null),
  ('Northmead Scholars’ Lodge', '101', 'C', 'occupied', null),
  ('Northmead Scholars’ Lodge', '102', 'A', 'occupied', null),
  ('Northmead Scholars’ Lodge', '102', 'B', 'occupied', null),
  ('Northmead Scholars’ Lodge', '102', 'C', 'occupied', null),
  ('Northmead Scholars’ Lodge', '103', 'A', 'occupied', null),
  ('Northmead Scholars’ Lodge', '103', 'B', 'occupied', null),
  ('Northmead Scholars’ Lodge', '103', 'C', 'blocked_for_maintenance', null),
  ('Northmead Scholars’ Lodge', '104', 'A', 'reserved', null),
  ('Northmead Scholars’ Lodge', '104', 'B', 'occupied', null),
  ('Northmead Scholars’ Lodge', '104', 'C', 'occupied', null),
  ('Northmead Scholars’ Lodge', '105', 'A', 'occupied', null),
  ('Northmead Scholars’ Lodge', '105', 'B', 'reserved', null),
  ('Northmead Scholars’ Lodge', '106', 'A', 'occupied', null),
  ('Northmead Scholars’ Lodge', '106', 'B', 'occupied', null),
  ('Northmead Scholars’ Lodge', '107', 'A', 'reserved', null),
  ('Northmead Scholars’ Lodge', '107', 'B', 'occupied', null),
  ('Northmead Scholars’ Lodge', '108', 'A', 'occupied', null),
  ('Northmead Scholars’ Lodge', '108', 'B', 'occupied', null),
  ('Northmead Scholars’ Lodge', '109', 'A', 'occupied', null),
  ('Northmead Scholars’ Lodge', '109', 'B', 'occupied', null),
  ('Northmead Scholars’ Lodge', '110', 'A', 'occupied', null),
  ('Northmead Scholars’ Lodge', '110', 'B', 'occupied', null),
  ('Northmead Scholars’ Lodge', '111', 'A', 'occupied', null),
  ('Northmead Scholars’ Lodge', '111', 'B', 'occupied', null),
  ('Northmead Scholars’ Lodge', '112', 'A', 'occupied', null),
  ('Northmead Scholars’ Lodge', '112', 'B', 'reserved', null),
  ('Northmead Scholars’ Lodge', '201', 'A', 'occupied', null),
  ('Northmead Scholars’ Lodge', '201', 'B', 'occupied', null),
  ('Northmead Scholars’ Lodge', '202', 'A', 'occupied', null),
  ('Northmead Scholars’ Lodge', '202', 'B', 'occupied', null),
  ('Northmead Scholars’ Lodge', '203', 'A', 'occupied', null),
  ('Northmead Scholars’ Lodge', '203', 'B', 'occupied', null),
  ('Northmead Scholars’ Lodge', '204', 'A', 'occupied', null),
  ('Northmead Scholars’ Lodge', '204', 'B', 'occupied', null),
  ('Northmead Scholars’ Lodge', '205', 'A', 'occupied', null),
  ('Northmead Scholars’ Lodge', '205', 'B', 'occupied', null),
  ('Northmead Scholars’ Lodge', '206', 'A', 'occupied', null),
  ('Northmead Scholars’ Lodge', '206', 'B', 'occupied', null),
  ('Northmead Scholars’ Lodge', '207', 'A', 'occupied', null),
  ('Northmead Scholars’ Lodge', '207', 'B', 'occupied', null),
  ('Northmead Scholars’ Lodge', '208', 'A', 'occupied', null),
  ('Northmead Scholars’ Lodge', '208', 'B', 'occupied', null),
  ('Northmead Scholars’ Lodge', '209', 'A', 'occupied', null),
  ('Northmead Scholars’ Lodge', '209', 'B', 'occupied', null),
  ('Northmead Scholars’ Lodge', '210', 'A', 'held', 32),
  ('Northmead Scholars’ Lodge', '210', 'B', 'occupied', null),
  ('Northmead Scholars’ Lodge', '211', 'A', 'occupied', null),
  ('Northmead Scholars’ Lodge', '211', 'B', 'occupied', null),
  ('Northmead Scholars’ Lodge', '212', 'A', 'occupied', null),
  ('Northmead Scholars’ Lodge', '212', 'B', 'occupied', null),
  ('Northmead Scholars’ Lodge', '301', 'A', 'occupied', null),
  ('Northmead Scholars’ Lodge', '301', 'B', 'occupied', null),
  ('Northmead Scholars’ Lodge', '302', 'A', 'occupied', null),
  ('Northmead Scholars’ Lodge', '302', 'B', 'held', 42),
  ('Northmead Scholars’ Lodge', '303', 'A', 'occupied', null),
  ('Northmead Scholars’ Lodge', '303', 'B', 'occupied', null),
  ('Northmead Scholars’ Lodge', '304', 'A', 'occupied', null),
  ('Northmead Scholars’ Lodge', '304', 'B', 'occupied', null),
  ('Chelston Gardens Rooms', '101', 'A', 'occupied', null),
  ('Chelston Gardens Rooms', '102', 'A', 'held', 24),
  ('Chelston Gardens Rooms', '102', 'B', 'available', null),
  ('Chelston Gardens Rooms', '102', 'C', 'available', null),
  ('Chelston Gardens Rooms', '103', 'A', 'available', null),
  ('Chelston Gardens Rooms', '103', 'B', 'available', null),
  ('Chelston Gardens Rooms', '104', 'A', 'occupied', null),
  ('Chelston Gardens Rooms', '104', 'B', 'available', null),
  ('Chelston Gardens Rooms', '105', 'A', 'available', null),
  ('Chelston Gardens Rooms', '105', 'B', 'occupied', null),
  ('Chelston Gardens Rooms', '106', 'A', 'occupied', null),
  ('Chelston Gardens Rooms', '106', 'B', 'occupied', null),
  ('Chelston Gardens Rooms', '107', 'A', 'reserved', null),
  ('Chelston Gardens Rooms', '107', 'B', 'occupied', null),
  ('Chelston Gardens Rooms', '108', 'A', 'occupied', null),
  ('Chelston Gardens Rooms', '108', 'B', 'occupied', null),
  ('Chelston Gardens Rooms', '109', 'A', 'available', null),
  ('Chelston Gardens Rooms', '109', 'B', 'available', null),
  ('Chelston Gardens Rooms', '110', 'A', 'occupied', null),
  ('Chelston Gardens Rooms', '110', 'B', 'available', null),
  ('Chelston Gardens Rooms', '111', 'A', 'occupied', null),
  ('Chelston Gardens Rooms', '111', 'B', 'occupied', null),
  ('Chelston Gardens Rooms', '112', 'A', 'occupied', null),
  ('Chelston Gardens Rooms', '112', 'B', 'occupied', null),
  ('Rhodes Park Annex', '101', 'A', 'available', null),
  ('Rhodes Park Annex', '102', 'A', 'occupied', null),
  ('Rhodes Park Annex', '102', 'B', 'occupied', null),
  ('Rhodes Park Annex', '102', 'C', 'occupied', null),
  ('Rhodes Park Annex', '103', 'A', 'available', null),
  ('Rhodes Park Annex', '103', 'B', 'occupied', null),
  ('Rhodes Park Annex', '104', 'A', 'occupied', null),
  ('Rhodes Park Annex', '104', 'B', 'occupied', null),
  ('Rhodes Park Annex', '105', 'A', 'available', null),
  ('Rhodes Park Annex', '105', 'B', 'occupied', null),
  ('Rhodes Park Annex', '106', 'A', 'reserved', null),
  ('Rhodes Park Annex', '106', 'B', 'occupied', null),
  ('Riverside Hall', '101', 'A', 'occupied', null),
  ('Riverside Hall', '101', 'B', 'occupied', null),
  ('Riverside Hall', '101', 'C', 'occupied', null),
  ('Riverside Hall', '102', 'A', 'occupied', null),
  ('Riverside Hall', '102', 'B', 'occupied', null),
  ('Riverside Hall', '102', 'C', 'occupied', null),
  ('Riverside Hall', '103', 'A', 'occupied', null),
  ('Riverside Hall', '103', 'B', 'occupied', null),
  ('Riverside Hall', '103', 'C', 'occupied', null),
  ('Riverside Hall', '104', 'A', 'pending_approval', null),
  ('Riverside Hall', '104', 'B', 'available', null),
  ('Riverside Hall', '104', 'C', 'available', null),
  ('Riverside Hall', '105', 'A', 'occupied', null),
  ('Riverside Hall', '105', 'B', 'available', null),
  ('Riverside Hall', '105', 'C', 'occupied', null),
  ('Riverside Hall', '106', 'A', 'occupied', null),
  ('Riverside Hall', '106', 'B', 'occupied', null),
  ('Riverside Hall', '106', 'C', 'occupied', null),
  ('Riverside Hall', '107', 'A', 'occupied', null),
  ('Riverside Hall', '107', 'B', 'occupied', null),
  ('Riverside Hall', '107', 'C', 'occupied', null),
  ('Riverside Hall', '108', 'A', 'occupied', null),
  ('Riverside Hall', '108', 'B', 'occupied', null),
  ('Riverside Hall', '108', 'C', 'occupied', null),
  ('Riverside Hall', '109', 'A', 'occupied', null),
  ('Riverside Hall', '109', 'B', 'occupied', null),
  ('Riverside Hall', '109', 'C', 'held', 20),
  ('Riverside Hall', '110', 'A', 'occupied', null),
  ('Riverside Hall', '110', 'B', 'occupied', null),
  ('Riverside Hall', '110', 'C', 'occupied', null),
  ('Riverside Hall', '111', 'A', 'occupied', null),
  ('Riverside Hall', '111', 'B', 'occupied', null),
  ('Riverside Hall', '111', 'C', 'occupied', null),
  ('Riverside Hall', '112', 'A', 'pending_approval', null),
  ('Riverside Hall', '112', 'B', 'occupied', null),
  ('Riverside Hall', '112', 'C', 'occupied', null),
  ('Riverside Hall', '113', 'A', 'available', null),
  ('Riverside Hall', '113', 'B', 'reserved', null),
  ('Riverside Hall', '113', 'C', 'occupied', null),
  ('Riverside Hall', '114', 'A', 'occupied', null),
  ('Riverside Hall', '114', 'B', 'occupied', null),
  ('Riverside Hall', '114', 'C', 'pending_approval', null),
  ('Riverside Hall', '115', 'A', 'occupied', null),
  ('Riverside Hall', '115', 'B', 'occupied', null),
  ('Riverside Hall', '115', 'C', 'reserved', null),
  ('Riverside Hall', '116', 'A', 'reserved', null),
  ('Riverside Hall', '116', 'B', 'occupied', null),
  ('Riverside Hall', '116', 'C', 'occupied', null),
  ('Riverside Hall', '117', 'A', 'occupied', null),
  ('Riverside Hall', '117', 'B', 'occupied', null),
  ('Riverside Hall', '117', 'C', 'occupied', null),
  ('Riverside Hall', '118', 'A', 'occupied', null),
  ('Riverside Hall', '118', 'B', 'occupied', null),
  ('Riverside Hall', '118', 'C', 'available', null),
  ('Riverside Hall', '119', 'A', 'occupied', null),
  ('Riverside Hall', '119', 'B', 'occupied', null),
  ('Riverside Hall', '119', 'C', 'reserved', null),
  ('Riverside Hall', '201', 'A', 'occupied', null),
  ('Riverside Hall', '201', 'B', 'occupied', null),
  ('Riverside Hall', '201', 'C', 'occupied', null),
  ('Riverside Hall', '202', 'A', 'occupied', null),
  ('Riverside Hall', '202', 'B', 'available', null),
  ('Riverside Hall', '202', 'C', 'occupied', null),
  ('Riverside Hall', '203', 'A', 'occupied', null),
  ('Riverside Hall', '203', 'B', 'reserved', null),
  ('Riverside Hall', '203', 'C', 'available', null),
  ('Riverside Hall', '204', 'A', 'occupied', null),
  ('Riverside Hall', '204', 'B', 'occupied', null),
  ('Riverside Hall', '204', 'C', 'occupied', null),
  ('Riverside Hall', '205', 'A', 'occupied', null),
  ('Riverside Hall', '205', 'B', 'occupied', null),
  ('Riverside Hall', '205', 'C', 'occupied', null),
  ('Riverside Hall', '206', 'A', 'available', null),
  ('Riverside Hall', '206', 'B', 'occupied', null),
  ('Riverside Hall', '206', 'C', 'occupied', null),
  ('Riverside Hall', '207', 'A', 'occupied', null),
  ('Riverside Hall', '207', 'B', 'occupied', null),
  ('Riverside Hall', '207', 'C', 'occupied', null),
  ('Riverside Hall', '208', 'A', 'occupied', null),
  ('Riverside Hall', '208', 'B', 'occupied', null),
  ('Riverside Hall', '208', 'C', 'occupied', null),
  ('Riverside Hall', '209', 'A', 'occupied', null),
  ('Riverside Hall', '209', 'B', 'available', null),
  ('Riverside Hall', '209', 'C', 'occupied', null),
  ('Riverside Hall', '210', 'A', 'held', 43),
  ('Riverside Hall', '210', 'B', 'reserved', null),
  ('Riverside Hall', '211', 'A', 'occupied', null),
  ('Riverside Hall', '211', 'B', 'occupied', null),
  ('Riverside Hall', '212', 'A', 'occupied', null),
  ('Riverside Hall', '212', 'B', 'blocked_for_maintenance', null),
  ('Riverside Hall', '213', 'A', 'held', 39),
  ('Riverside Hall', '213', 'B', 'available', null),
  ('Riverside Hall', '214', 'A', 'reserved', null),
  ('Riverside Hall', '214', 'B', 'pending_approval', null),
  ('Riverside Hall', '215', 'A', 'available', null),
  ('Riverside Hall', '215', 'B', 'occupied', null),
  ('Riverside Hall', '216', 'A', 'occupied', null),
  ('Riverside Hall', '216', 'B', 'occupied', null),
  ('Riverside Hall', '217', 'A', 'occupied', null),
  ('Riverside Hall', '217', 'B', 'occupied', null),
  ('Riverside Hall', '218', 'A', 'occupied', null),
  ('Riverside Hall', '218', 'B', 'occupied', null),
  ('Riverside Hall', '219', 'A', 'held', 15),
  ('Riverside Hall', '219', 'B', 'occupied', null),
  ('Riverside Hall', '301', 'A', 'occupied', null),
  ('Riverside Hall', '301', 'B', 'occupied', null),
  ('Riverside Hall', '302', 'A', 'occupied', null),
  ('Riverside Hall', '302', 'B', 'occupied', null),
  ('Riverside Hall', '303', 'A', 'occupied', null),
  ('Riverside Hall', '303', 'B', 'occupied', null),
  ('Riverside Hall', '304', 'A', 'occupied', null),
  ('Riverside Hall', '304', 'B', 'occupied', null),
  ('Riverside Hall', '305', 'A', 'occupied', null),
  ('Riverside Hall', '305', 'B', 'pending_approval', null),
  ('Riverside Hall', '306', 'A', 'occupied', null),
  ('Riverside Hall', '306', 'B', 'occupied', null),
  ('Riverside Hall', '307', 'A', 'occupied', null),
  ('Riverside Hall', '307', 'B', 'occupied', null),
  ('Riverside Hall', '308', 'A', 'occupied', null),
  ('Riverside Hall', '308', 'B', 'occupied', null),
  ('Riverside Hall', '309', 'A', 'available', null),
  ('Riverside Hall', '309', 'B', 'held', 29),
  ('Riverside Hall', '310', 'A', 'occupied', null),
  ('Riverside Hall', '310', 'B', 'available', null),
  ('Riverside Hall', '311', 'A', 'available', null),
  ('Riverside Hall', '311', 'B', 'occupied', null),
  ('Riverside Hall', '312', 'A', 'occupied', null),
  ('Riverside Hall', '312', 'B', 'occupied', null),
  ('Riverside Hall', '313', 'A', 'available', null),
  ('Riverside Hall', '313', 'B', 'occupied', null),
  ('Riverside Hall', '314', 'A', 'occupied', null),
  ('Riverside Hall', '314', 'B', 'pending_approval', null),
  ('Riverside Hall', '315', 'A', 'occupied', null),
  ('Riverside Hall', '315', 'B', 'pending_approval', null),
  ('Riverside Hall', '316', 'A', 'occupied', null),
  ('Riverside Hall', '316', 'B', 'occupied', null),
  ('Riverside Hall', '317', 'A', 'available', null),
  ('Riverside Hall', '317', 'B', 'occupied', null),
  ('Riverside Hall', '318', 'A', 'occupied', null),
  ('Riverside Hall', '318', 'B', 'available', null),
  ('Riverside Hall', '319', 'A', 'occupied', null),
  ('Riverside Hall', '319', 'B', 'occupied', null),
  ('Riverside Hall', '401', 'A', 'reserved', null),
  ('Riverside Hall', '401', 'B', 'occupied', null),
  ('Riverside Hall', '402', 'A', 'occupied', null),
  ('Riverside Hall', '402', 'B', 'available', null),
  ('Riverside Hall', '403', 'A', 'occupied', null),
  ('Riverside Hall', '403', 'B', 'occupied', null),
  ('Riverside Hall', '404', 'A', 'occupied', null),
  ('Riverside Hall', '404', 'B', 'occupied', null),
  ('Riverside Hall', '405', 'A', 'occupied', null),
  ('Riverside Hall', '405', 'B', 'occupied', null),
  ('Riverside Hall', '406', 'A', 'occupied', null),
  ('Riverside Hall', '406', 'B', 'occupied', null),
  ('Riverside Hall', '407', 'A', 'available', null),
  ('Riverside Hall', '407', 'B', 'occupied', null),
  ('Riverside Hall', '408', 'A', 'occupied', null),
  ('Riverside Hall', '408', 'B', 'available', null),
  ('Riverside Hall', '409', 'A', 'occupied', null),
  ('Riverside Hall', '409', 'B', 'occupied', null),
  ('Riverside Hall', '410', 'A', 'occupied', null),
  ('Riverside Hall', '410', 'B', 'occupied', null),
  ('Riverside Hall', '411', 'A', 'occupied', null),
  ('Riverside Hall', '411', 'B', 'blocked_for_maintenance', null),
  ('Riverside Hall', '412', 'A', 'available', null),
  ('Riverside Hall', '412', 'B', 'occupied', null),
  ('Riverside Hall', '413', 'A', 'occupied', null),
  ('Riverside Hall', '413', 'B', 'occupied', null),
  ('Riverside Hall', '414', 'A', 'occupied', null),
  ('Riverside Hall', '414', 'B', 'occupied', null),
  ('Riverside Hall', '415', 'A', 'blocked_for_maintenance', null),
  ('Riverside Hall', '415', 'B', 'available', null),
  ('Riverside Hall', '416', 'A', 'occupied', null),
  ('Riverside Hall', '416', 'B', 'occupied', null),
  ('Riverside Hall', '417', 'A', 'occupied', null),
  ('Riverside Hall', '417', 'B', 'reserved', null),
  ('Riverside Hall', '418', 'A', 'occupied', null),
  ('Riverside Hall', '418', 'B', 'occupied', null),
  ('Riverside Hall', '419', 'A', 'occupied', null),
  ('Riverside Hall', '419', 'B', 'occupied', null),
  ('Woodlands Student Villas', '101', 'A', 'occupied', null),
  ('Woodlands Student Villas', '101', 'B', 'occupied', null),
  ('Woodlands Student Villas', '101', 'C', 'occupied', null),
  ('Woodlands Student Villas', '102', 'A', 'available', null),
  ('Woodlands Student Villas', '102', 'B', 'available', null),
  ('Woodlands Student Villas', '102', 'C', 'available', null),
  ('Woodlands Student Villas', '103', 'A', 'held', 21),
  ('Woodlands Student Villas', '103', 'B', 'occupied', null),
  ('Woodlands Student Villas', '104', 'A', 'occupied', null),
  ('Woodlands Student Villas', '104', 'B', 'occupied', null),
  ('Woodlands Student Villas', '105', 'A', 'occupied', null),
  ('Woodlands Student Villas', '105', 'B', 'reserved', null),
  ('Woodlands Student Villas', '106', 'A', 'occupied', null),
  ('Woodlands Student Villas', '106', 'B', 'occupied', null),
  ('Woodlands Student Villas', '107', 'A', 'occupied', null),
  ('Woodlands Student Villas', '107', 'B', 'available', null),
  ('Woodlands Student Villas', '108', 'A', 'occupied', null),
  ('Woodlands Student Villas', '108', 'B', 'occupied', null),
  ('Woodlands Student Villas', '109', 'A', 'occupied', null),
  ('Woodlands Student Villas', '109', 'B', 'occupied', null),
  ('Woodlands Student Villas', '110', 'A', 'occupied', null),
  ('Woodlands Student Villas', '110', 'B', 'occupied', null),
  ('Woodlands Student Villas', '111', 'A', 'occupied', null),
  ('Woodlands Student Villas', '111', 'B', 'reserved', null),
  ('Woodlands Student Villas', '112', 'A', 'occupied', null),
  ('Woodlands Student Villas', '112', 'B', 'occupied', null),
  ('Woodlands Student Villas', '201', 'A', 'occupied', null),
  ('Woodlands Student Villas', '201', 'B', 'occupied', null),
  ('Woodlands Student Villas', '202', 'A', 'occupied', null),
  ('Woodlands Student Villas', '202', 'B', 'occupied', null)
) as v(listing, no, lab, s, hrs) join listings l on l.name = v.listing join rooms r on r.listing_id = l.id and r.room_number = v.no;

insert into allocation_rules (institution_id, name, version, w_room_type, w_budget, w_distance, w_facilities, w_availability, active, created_by)
select i.id, 'Standard allocation rule', 1, 25, 25, 25, 15, 10, true, (select id from auth.users where email = 'johnson.kawemba@example.com') from institutions i where i.code in ('UNZA','UNILUS','ZCAS','CAVENDISH');
insert into allocation_rules (institution_id, name, version, w_room_type, w_budget, w_distance, w_facilities, w_availability, active, created_by)
select i.id, 'Distance-weighted draft', 2, 20, 25, 30, 15, 10, false, (select id from auth.users where email = 'johnson.kawemba@example.com') from institutions i where i.code = 'UNZA';

insert into applications (reference, student_id, route, institution_id, listing_id, requested_room_type, budget_zmw, gender_needed, intake, preferred_facilities) values ('APP-2026-0412', (select id from auth.users where email = 'natasha.mwale@example.com'), 'university_allocation', (select id from institutions where code = 'UNZA'), null, 'double', 2000, 'female_only', 'Semester I 2027', '{wifi,guard,study}');
update applications set status = 'submitted' where reference = 'APP-2026-0412';
update applications set status = 'recommended' where reference = 'APP-2026-0412';
update applications set status = 'pending_approval' where reference = 'APP-2026-0412';
update applications set created_at = now() - interval '5 hours', submitted_at = now() - interval '5 hours' where reference = 'APP-2026-0412';
insert into applications (reference, student_id, route, institution_id, listing_id, requested_room_type, budget_zmw, gender_needed, intake, preferred_facilities) values ('APP-2026-0411', (select id from auth.users where email = 'kelvin.sakala@example.com'), 'university_allocation', (select id from institutions where code = 'CAVENDISH'), null, 'double', 1800, 'mixed', 'Semester I 2027', '{}');
update applications set status = 'submitted' where reference = 'APP-2026-0411';
update applications set status = 'recommended' where reference = 'APP-2026-0411';
update applications set created_at = now() - interval '6 hours', submitted_at = now() - interval '6 hours' where reference = 'APP-2026-0411';
insert into applications (reference, student_id, route, institution_id, listing_id, requested_room_type, budget_zmw, gender_needed, intake, preferred_facilities) values ('APP-2026-0409', (select id from auth.users where email = 'chanda.phiri@example.com'), 'private', null, (select id from listings where name = 'Kalingalinga Student Homes'), 'double', 1800, 'mixed', 'Semester I 2027', '{}');
update applications set status = 'submitted' where reference = 'APP-2026-0409';
update applications set status = 'under_review' where reference = 'APP-2026-0409';
update applications set created_at = now() - interval '1 day', submitted_at = now() - interval '1 day' where reference = 'APP-2026-0409';
insert into applications (reference, student_id, route, institution_id, listing_id, requested_room_type, budget_zmw, gender_needed, intake, preferred_facilities) values ('APP-2026-0407', (select id from auth.users where email = 'thandiwe.sikazwe@example.com'), 'university_allocation', (select id from institutions where code = 'ZCAS'), null, 'double', 1800, 'female_only', 'Semester I 2027', '{}');
update applications set status = 'submitted' where reference = 'APP-2026-0407';
update applications set status = 'no_eligible_room', status_reason = 'No room matched the hard requirements' where reference = 'APP-2026-0407';
update applications set created_at = now() - interval '1 day', submitted_at = now() - interval '1 day' where reference = 'APP-2026-0407';
insert into applications (reference, student_id, route, institution_id, listing_id, requested_room_type, budget_zmw, gender_needed, intake, preferred_facilities) values ('APP-2026-0405', (select id from auth.users where email = 'bwalya.kabwe@example.com'), 'private', null, (select id from listings where name = 'Great East Court'), 'double', 1800, 'mixed', 'Semester I 2027', '{}');
update applications set status = 'submitted' where reference = 'APP-2026-0405';
update applications set status = 'under_review' where reference = 'APP-2026-0405';
update applications set status = 'accepted' where reference = 'APP-2026-0405';
update applications set created_at = now() - interval '2 days', submitted_at = now() - interval '2 days' where reference = 'APP-2026-0405';
insert into applications (reference, student_id, route, institution_id, listing_id, requested_room_type, budget_zmw, gender_needed, intake, preferred_facilities) values ('APP-2026-0401', (select id from auth.users where email = 'lweendo.banda@example.com'), 'university_allocation', (select id from institutions where code = 'UNZA'), null, 'double', 1800, 'mixed', 'Semester I 2027', '{}');
update applications set status = 'submitted' where reference = 'APP-2026-0401';
update applications set status = 'profile_incomplete', status_reason = 'Missing: student number' where reference = 'APP-2026-0401';
update applications set created_at = now() - interval '2 days', submitted_at = now() - interval '2 days' where reference = 'APP-2026-0401';
insert into applications (reference, student_id, route, institution_id, listing_id, requested_room_type, budget_zmw, gender_needed, intake, preferred_facilities) values ('APP-2026-0398', (select id from auth.users where email = 'mutinta.hamoonga@example.com'), 'private', null, (select id from listings where name = 'Woodlands Student Villas'), 'double', 1800, 'mixed', 'Semester I 2027', '{}');
update applications set status = 'submitted' where reference = 'APP-2026-0398';
update applications set status = 'under_review' where reference = 'APP-2026-0398';
update applications set status = 'declined', status_reason = 'No room matching the request is free' where reference = 'APP-2026-0398';
update applications set created_at = now() - interval '3 days', submitted_at = now() - interval '3 days' where reference = 'APP-2026-0398';
insert into applications (reference, student_id, route, institution_id, listing_id, requested_room_type, budget_zmw, gender_needed, intake, preferred_facilities) values ('APP-2026-0392', (select id from auth.users where email = 'kondwani.musonda@example.com'), 'university_allocation', (select id from institutions where code = 'UNILUS'), null, 'double', 1800, 'mixed', 'Semester I 2027', '{}');
update applications set status = 'submitted' where reference = 'APP-2026-0392';
update applications set status = 'recommended' where reference = 'APP-2026-0392';
update applications set status = 'pending_approval' where reference = 'APP-2026-0392';
update applications set status = 'approved' where reference = 'APP-2026-0392';
update applications set created_at = now() - interval '4 days', submitted_at = now() - interval '4 days' where reference = 'APP-2026-0392';

insert into allocation_runs (application_id, rule_id, run_by, explanation)
select a.id, r.id, (select id from auth.users where email = 'johnson.kawemba@example.com'),
       'Rooms were filtered by free bed, gender policy, room type and budget, then ranked by room type, budget, distance, facilities and availability confidence.'
  from applications a join allocation_rules r on r.institution_id = a.institution_id and r.active where a.reference = 'APP-2026-0412';
insert into allocation_candidates (run_id, room_id, bed_id, excluded, exclusion_reason, rank, score_total, score_room_type, score_budget, score_distance, score_facilities, score_availability, explanation)
select (select id from allocation_runs where application_id = (select id from applications where reference = 'APP-2026-0412')), x.* from (values
  ((select r.id from rooms r join listings l on l.id = r.listing_id where l.name = 'Riverside Hall' and r.room_number = '314'), (select b.id from beds b join rooms r on r.id = b.room_id join listings l on l.id = r.listing_id where l.name = 'Riverside Hall' and r.room_number = '314' and b.label = 'B'), false, null, 1, 93.25, 100, 90, 98, 75, 100, 'Double room within budget, 0.3 km to UNZA, Wi-Fi and security guard.'),
  ((select r.id from rooms r join listings l on l.id = r.listing_id where l.name = 'Riverside Hall' and r.room_number = '310'), (select b.id from beds b join rooms r on r.id = b.room_id join listings l on l.id = r.listing_id where l.name = 'Riverside Hall' and r.room_number = '310' and b.label = 'B'), false, null, 2, 90.75, 100, 80, 98, 75, 100, 'Double room, slightly above your preferred price, 0.3 km to UNZA.'),
  ((select r.id from rooms r join listings l on l.id = r.listing_id where l.name = 'Great East Court' and r.room_number = '105'), (select b.id from beds b join rooms r on r.id = b.room_id join listings l on l.id = r.listing_id where l.name = 'Great East Court' and r.room_number = '105' and b.label = 'A'), false, null, 3, 87.75, 100, 100, 70, 75, 90, 'Cheaper double room, 1.1 km to UNZA. Scores lower on distance.'),
  ((select r.id from rooms r join listings l on l.id = r.listing_id where l.name = 'Great East Court' and r.room_number = '101'), null, true, 'Room type not requested (single room)', null, null, null, null, null, null, null, null),
  ((select r.id from rooms r join listings l on l.id = r.listing_id where l.name = 'Kalingalinga Student Homes' and r.room_number = '01'), null, true, 'Gender policy: male only', null, null, null, null, null, null, null, null),
  ((select r.id from rooms r join listings l on l.id = r.listing_id where l.name = 'Riverside Hall' and r.room_number = '101'), null, true, 'No free bed in this room', null, null, null, null, null, null, null, null)
) as x(room_id, bed_id, excluded, reason, rank, total, s_type, s_budget, s_dist, s_fac, s_avail, explanation);
update beds set held_for_application_id = (select id from applications where reference = 'APP-2026-0412')
 where id = (select b.id from beds b join rooms r on r.id = b.room_id join listings l on l.id = r.listing_id where l.name = 'Riverside Hall' and r.room_number = '314' and b.label = 'B');
update beds set held_for_application_id = (select id from applications where reference = 'APP-2026-0405')
 where id = (select b.id from beds b join rooms r on r.id = b.room_id join listings l on l.id = r.listing_id where l.name = 'Great East Court' and r.room_number = '107' and b.label = 'B');
insert into bookings (application_id, student_id, bed_id, start_date, end_date, deposit_due_at)
select a.id, a.student_id, b.id, current_date, current_date + 180, now() + interval '2 days'
  from applications a, beds b join rooms r on r.id = b.room_id join listings l on l.id = r.listing_id
 where a.reference = 'APP-2026-0392' and l.name = 'Chelston Gardens Rooms' and r.room_number = '107' and b.label = 'A';

insert into payments (reference, application_id, payer_id, purpose, amount_zmw, status, created_at)
select v.ref, a.id, a.student_id, v.purpose::payment_purpose, v.amt, v.st::payment_status, now() - v.age::interval from (values
  ('SIM-30871', 'APP-2026-0412', 'application_fee', 150, 'successful', '4 hours'),
  ('SIM-30870', 'APP-2026-0405', 'deposit', 1600, 'pending', '4 hours'),
  ('SIM-30866', 'APP-2026-0392', 'rent', 3900, 'successful', '1 day'),
  ('SIM-30861', 'APP-2026-0409', 'deposit', 1200, 'failed', '1 day'),
  ('SIM-30855', 'APP-2026-0398', 'deposit', 1500, 'refunded', '3 days'),
  ('SIM-30850', 'APP-2026-0411', 'application_fee', 150, 'successful', '3 days')
) as v(ref, appref, purpose, amt, st, age) join applications a on a.reference = v.appref;
update payments set booking_id = (select id from bookings where application_id = payments.application_id) where reference = 'SIM-30866';

insert into maintenance_tickets (reference, listing_id, reporter_id, location_text, category, title, description, priority) values ('TKT-1042', (select id from listings where name = 'Great East Court'), (select id from auth.users where email = 'kelvin.sakala@example.com'), 'Great East Court · Room 108', 'Plumbing', 'Leaking tap in shared bathroom', 'Reported by a tenant. Demonstration ticket.', 'high');
update maintenance_tickets set status = 'assigned', assigned_to = (select id from auth.users where email = 'joseph.sakala@example.com') where reference = 'TKT-1042';
update maintenance_tickets set created_at = now() - interval '3 hours' where reference = 'TKT-1042';
insert into maintenance_tickets (reference, listing_id, reporter_id, location_text, category, title, description, priority) values ('TKT-1041', (select id from listings where name = 'Olympia Park Residence'), (select id from auth.users where email = 'chanda.phiri@example.com'), 'Olympia Park · Room 214', 'Security', 'Broken window latch', 'Reported by a tenant. Demonstration ticket.', 'high');
update maintenance_tickets set status = 'assigned', assigned_to = (select id from auth.users where email = 'brian.ngoma@example.com') where reference = 'TKT-1041';
update maintenance_tickets set status = 'in_progress' where reference = 'TKT-1041';
update maintenance_tickets set created_at = now() - interval '1 day' where reference = 'TKT-1041';
insert into maintenance_tickets (reference, listing_id, reporter_id, location_text, category, title, description, priority) values ('TKT-1039', (select id from listings where name = 'Kalingalinga Student Homes'), (select id from auth.users where email = 'thandiwe.sikazwe@example.com'), 'Kalingalinga · Room 06', 'Electrical', 'No power in two sockets', 'Reported by a tenant. Demonstration ticket.', 'medium');
update maintenance_tickets set created_at = now() - interval '2 days' where reference = 'TKT-1039';
insert into maintenance_tickets (reference, listing_id, reporter_id, location_text, category, title, description, priority) values ('TKT-1036', (select id from listings where name = 'Riverside Hall'), (select id from auth.users where email = 'natasha.mwale@example.com'), 'Riverside Hall · Block C', 'Electrical', 'Corridor light not working', 'Reported by a tenant. Demonstration ticket.', 'low');
update maintenance_tickets set status = 'assigned', assigned_to = (select id from auth.users where email = 'joseph.sakala@example.com') where reference = 'TKT-1036';
update maintenance_tickets set status = 'in_progress' where reference = 'TKT-1036';
update maintenance_tickets set status = 'completed', completed_at = now() - interval '3 days' where reference = 'TKT-1036';
update maintenance_tickets set created_at = now() - interval '3 days' where reference = 'TKT-1036';
insert into maintenance_tickets (reference, listing_id, reporter_id, location_text, category, title, description, priority) values ('TKT-1033', (select id from listings where name = 'Olympia Park Residence'), (select id from auth.users where email = 'lweendo.banda@example.com'), 'Olympia Park · Study room', 'Internet', 'Wi-Fi drops in evenings', 'Reported by a tenant. Demonstration ticket.', 'medium');
update maintenance_tickets set status = 'assigned', assigned_to = (select id from auth.users where email = 'brian.ngoma@example.com') where reference = 'TKT-1033';
update maintenance_tickets set status = 'in_progress' where reference = 'TKT-1033';
update maintenance_tickets set status = 'completed', completed_at = now() - interval '3 days' where reference = 'TKT-1033';
update maintenance_tickets set status = 'reopened' where reference = 'TKT-1033';
update maintenance_tickets set created_at = now() - interval '5 days' where reference = 'TKT-1033';
insert into maintenance_tickets (reference, listing_id, reporter_id, location_text, category, title, description, priority) values ('TKT-1030', (select id from listings where name = 'Great East Court'), (select id from auth.users where email = 'natasha.mwale@example.com'), 'Great East Court · Room 203', 'Security', 'Door lock sticks', 'Reported by a tenant. Demonstration ticket.', 'medium');
update maintenance_tickets set status = 'assigned', assigned_to = (select id from auth.users where email = 'joseph.sakala@example.com') where reference = 'TKT-1030';
update maintenance_tickets set status = 'escalated' where reference = 'TKT-1030';
update maintenance_tickets set created_at = now() - interval '6 days' where reference = 'TKT-1030';

insert into documents (uploader_id, application_id, listing_id, kind, storage_path, original_name, mime_type, size_bytes, auto_result, auto_checked_at, review_decision)
select u.id, a.id, null, 'national_id', u.id || '/seed-national-id.pdf', 'national-id.pdf', 'application/pdf', 120000, 'clear', now(), 'pending'
  from auth.users u join applications a on a.student_id = u.id where u.email = 'natasha.mwale@example.com';
insert into documents (uploader_id, application_id, listing_id, kind, storage_path, original_name, mime_type, size_bytes, auto_result, auto_checked_at, review_decision)
select u.id, a.id, null, 'proof_of_enrolment', u.id || '/seed-enrolment.jpg', 'enrolment.jpg', 'image/jpeg', 340000, 'unclear', now(), 'pending'
  from auth.users u join applications a on a.student_id = u.id where u.email = 'natasha.mwale@example.com';
insert into documents (uploader_id, application_id, listing_id, kind, storage_path, original_name, mime_type, size_bytes, auto_result, auto_checked_at, review_decision)
select u.id, null, l.id, 'ownership_proof', u.id || '/seed-ownership.pdf', 'ownership.pdf', 'application/pdf', 210000, 'clear', now(), 'pending'
  from auth.users u, listings l where u.email = 'rachael.musongo@example.com' and l.name = 'Olympia Park Residence';
insert into documents (uploader_id, application_id, listing_id, kind, storage_path, original_name, mime_type, size_bytes, auto_result, auto_checked_at, review_decision, reviewer_note)
select u.id, null, l.id, 'national_id', u.id || '/seed-owner-id.jpg', 'owner-id.jpg', 'image/jpeg', 180000, 'unclear', now(), 'resubmission_required', 'The image was unclear. Please upload a clearer copy.'
  from auth.users u, listings l where u.email = 'rachael.musongo@example.com' and l.name = 'Northmead Scholars’ Lodge';

insert into announcements (author_id, title, body, audience, audience_institution_id, sent_at, recipient_count)
select (select id from auth.users where email = 'johnson.kawemba@example.com'), 'Semester I 2027 intake dates', 'UNZA accommodation office: check-in opens on 12 January.',
       'institution', (select id from institutions where code = 'UNZA'), now() - interval '1 day', 3;
insert into notifications (recipient_id, kind, title, body, link, read_at, created_at)
select u.id, v.kind, v.title, v.body, v.link, case when v.is_read then now() end, now() - v.age::interval
  from auth.users u, (values
   ('application', 'Room recommended', 'Riverside Hall block 3 matched your preferences. An administrator will review it.', '/applications/APP-2026-0412', false, '4 hours'),
   ('payment', 'Application fee received', 'Simulated payment SIM-30871 for K150.', '/payments', false, '5 hours'),
   ('announcement', 'Semester I 2027 intake dates', 'UNZA accommodation office: check-in opens on 12 January.', null, true, '1 day'),
   ('ticket', 'Repair completed', 'Corridor light in Block C is fixed.', null, true, '3 days')
  ) as v(kind, title, body, link, is_read, age) where u.email = 'natasha.mwale@example.com';
insert into shortlist (student_id, listing_id)
select (select id from auth.users where email = 'natasha.mwale@example.com'), id from listings where name in ('Great East Court', 'Olympia Park Residence');

update listings set last_updated_at = now() - interval '2 days' where name = 'Great East Court';
update listings set last_updated_at = now() - interval '5 days' where name = 'Kalingalinga Student Homes';
update listings set last_updated_at = now() - interval '2 hours' where name = 'Olympia Park Residence';
update listings set last_updated_at = now() - interval '1 days' where name = 'Northmead Scholars’ Lodge';
update listings set last_updated_at = now() - interval '3 days' where name = 'Chelston Gardens Rooms';
update listings set last_updated_at = now() - interval '12 days' where name = 'Rhodes Park Annex';
update listings set last_updated_at = now() - interval '2 hours' where name = 'Riverside Hall';
update listings set last_updated_at = now() - interval '34 days' where name = 'Woodlands Student Villas';

-- Check: these should read 468 beds and the state counts above.
do $$
declare r record;
begin
  raise notice 'beds in total: %', (select count(*) from beds);
  for r in select state, count(*) c from beds group by state order by state loop raise notice '  %: %', r.state, r.c; end loop;
end $$;

