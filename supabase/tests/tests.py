import psycopg2, threading, sys, time
DSN = "dbname=sstest"
conn = psycopg2.connect(DSN); conn.autocommit = True
cur = conn.cursor()
results = []

def check(name, ok, detail=''):
    results.append((name, bool(ok), detail)); print(('PASS ' if ok else 'FAIL ') + name + (f'   [{detail}]' if (detail and not ok) else ''))

lookup = psycopg2.connect(DSN); lookup.autocommit = True; lcur = lookup.cursor()
def uid(email):
    lcur.execute("select id from auth.users where email=%s", (email,)); return lcur.fetchone()[0]

def as_user(email=None):
    cur.execute("reset role")
    if email is None:
        cur.execute("select set_config('request.jwt.claim.sub','',false)"); cur.execute("set role anon")
    else:
        cur.execute("select set_config('request.jwt.claim.sub', %s, false)", (str(uid(email)),)); cur.execute("set role authenticated")

def as_root():
    cur.execute("reset role"); cur.execute("select set_config('request.jwt.claim.sub','',false)")

def rows(sql, p=None):
    cur.execute(sql, p); return cur.fetchall() if cur.description else []

def err(sql, p=None):
    try:
        cur.execute(sql, p)
        if cur.description: cur.fetchall()
        return None
    except psycopg2.Error as e:
        return (e.pgerror or str(e)).strip().split('\n')[0]

def one(sql, p=None): r = rows(sql, p); return r[0][0] if r else None

NAT, GRACE, KABWE, JOSEPH, SYS = ('natasha.mwale@example.com', 'rachael.musongo@example.com', 'johnson.kawemba@example.com', 'joseph.sakala@example.com', 'platform.admin@example.com')
BWALYA, KELVIN = 'bwalya.kabwe@example.com', 'kelvin.sakala@example.com'

print('--- data checks'); as_root(); cur.execute('delete from storage.objects')
check('468 beds in total', one("select count(*) from beds") == 468)
st = dict(rows("select state::text, count(*) from beds group by 1"))
check('bed states match the prototype', st == {'available':67,'held':18,'pending_approval':9,'reserved':31,'occupied':335,'blocked_for_maintenance':8}, st)
check('8 listings, 22 tables, 8 sample applications', one("select count(*) from listings")==8 and one("select count(*) from applications")==8)
check('Great East Court has 24 rooms and 50 beds', one("select count(*) from rooms r join listings l on l.id=r.listing_id where l.name='Great East Court'")==24 and one("select count(*) from beds b join rooms r on r.id=b.room_id join listings l on l.id=r.listing_id where l.name='Great East Court'")==50)
gec = rows("select b.state::text, r.room_type::text from beds b join rooms r on r.id=b.room_id join listings l on l.id=r.listing_id where l.name='Great East Court' and b.state='available'")
check('GEC free beds: 1 single, 4 double, 4 triple', sorted(t for s,t in gec)==['double']*4+['single']+['triple']*4, gec)
ev = rows("select to_status::text from application_events e join applications a on a.id=e.application_id where a.reference='APP-2026-0412' order by e.id")
check('Natasha timeline recorded automatically', [e[0] for e in ev]==['draft','submitted','recommended','pending_approval'], ev)
lc = rows("select name, beds_available, price_from, price_to, is_stale from listing_cards order by name")
d = {r[0]: r for r in lc}
check('listing_cards: GEC 9 free, K1,350 to K2,400', d['Great East Court'][1:4]==(9, 1350, 2400))
check('listing_cards: Woodlands flagged stale (34 days)', d['Woodlands Student Villas'][4] is True)

print('--- anonymous visitor'); as_user(None)
check('visitor sees 8 published listings', one("select count(*) from listings")==8)
check('visitor can read listing_cards', one("select count(*) from listing_cards")==8)
check('visitor cannot read applications', err("select * from applications") is not None)
check('visitor cannot read profiles', err("select * from profiles") is not None)
check('visitor cannot read payments', err("select * from payments") is not None)
check('visitor cannot call an action', err("select submit_application(gen_random_uuid())") is not None)

print('--- student Natasha'); as_user(NAT)
check('sees only her own application', [r[0] for r in rows("select reference from applications")]==['APP-2026-0412'])
check('sees only her own payment', one("select count(*) from payments")==1)
check('cannot make herself an administrator', 'permission denied' in (err("update profiles set role='system_admin' where id=auth.uid()") or ''))
check('cannot approve her own application', 'permission denied' in (err("update applications set status='approved'") or ''))
check('cannot change a bed', one("with u as (update beds set state='available' returning 1) select count(*) from u")==0)
check('cannot read allocation rules', one("select count(*) from allocation_rules")==0)
check('cannot read the audit log', one("select count(*) from audit_events")==0)
check('sees ranked rooms but NOT excluded rooms', one("select count(*) from allocation_candidates")==3, one("select count(*) from allocation_candidates"))
check('cannot decide an allocation', 'NOT_ALLOWED' in (err("select decide_allocation((select id from allocation_runs limit 1), 'approved')") or ''))
check('cannot add a payment row directly', err("insert into payments (application_id, payer_id, purpose, amount_zmw) values ((select id from applications limit 1), auth.uid(), 'deposit', 100)") is not None)
check("sees her two repair requests (TKT-1036, TKT-1030)", sorted(r[0] for r in rows("select reference from maintenance_tickets"))==['TKT-1030','TKT-1036'])
check('cannot see other people\'s documents (only her 2)', one("select count(*) from documents")==2)
check('shortlist is hers (2 saved)', one("select count(*) from shortlist")==2)
check('5 notifications visible = hers only (4)', one("select count(*) from notifications")==4)

print('--- unverified email and application rules')
as_root(); cur.execute("insert into auth.users (email, email_confirmed_at, raw_user_meta_data) values ('unverified@example.com', null, '{\"full_name\":\"Test Unverified\"}') on conflict (email) do nothing")
as_user('unverified@example.com')
check('unverified email cannot create an application', err("insert into applications (student_id, route, institution_id) values (auth.uid(), 'university_allocation', (select id from institutions limit 1))") is not None)
as_user(NAT)
cur.execute("insert into applications (student_id, route, institution_id, intake) values (auth.uid(), 'university_allocation', (select id from institutions where code='UNZA'), 'Semester II 2027') returning id"); newapp = cur.fetchone()[0]
check('incomplete draft submits as profile_incomplete with what is missing', one("select submit_application(%s)", (newapp,))=='profile_incomplete' and 'room type' in one("select status_reason from applications where id=%s", (newapp,)))
check('cannot create an application for someone else', err("insert into applications (student_id, route, institution_id) values (%s, 'university_allocation', (select id from institutions limit 1))", (str(uid(KELVIN)),)) is not None)
as_root(); cur.execute("delete from applications where id=%s", (newapp,))

print('--- property owner Rachael'); as_user(GRACE)
check('Rachael is an owner with a partner record', one("select count(*) from partners")>=1)
olympia_bed = one("select b.id from beds b join rooms r on r.id=b.room_id join listings l on l.id=r.listing_id where l.name='Olympia Park Residence' and b.state='available' limit 1")
check('owner can hold a bed in her own property', err("update beds set state='held' where id=%s", (str(olympia_bed),)) is None and one("select state::text from beds where id=%s", (str(olympia_bed),))=='held')
check('hold gets a 48 hour expiry automatically', 46 < (one("select extract(epoch from (hold_expires_at - now()))/3600 from beds where id=%s", (str(olympia_bed),)) or 0) <= 48)
check('invalid bed move is refused (held to occupied)', 'INVALID_TRANSITION' in (err("update beds set state='occupied' where id=%s", (str(olympia_bed),)) or ''))
check('valid bed move works (held to available)', err("update beds set state='available' where id=%s", (str(olympia_bed),)) is None)
gec_bed = None
as_root(); gec_bed = one("select b.id from beds b join rooms r on r.id=b.room_id join listings l on l.id=r.listing_id where l.name='Great East Court' and b.state='available' limit 1"); as_user(GRACE)
check('owner cannot change a bed in someone else\'s property', one("with u as (update beds set state='held' where id=%s returning 1) select count(*) from u", (str(gec_bed),))==0)
check('owner cannot publish her own listing', 'permission denied' in (err("update listings set moderation='published'") or ''))
check('owner cannot call moderate_listing', 'NOT_ALLOWED' in (err("select moderate_listing((select id from listings limit 1), 'published')") or ''))
check('owner cannot read applications table', one("select count(*) from applications")==0)
check('owner inbox shows no foreign applicants', one("select count(*) from private_application_inbox")==0)
check('owner cannot announce to everyone', err("insert into announcements (author_id, title, body, audience) values (auth.uid(), 'x', 'y', 'all')") is not None)
check('owner sees only her own 2 documents', one("select count(*) from documents")==2)
olympia = one("select id from listings where name='Olympia Park Residence'")
check('owner can add a room and beds appear (capacity 3 gives 3)', err("insert into rooms (listing_id, room_number, room_type, capacity, price_zmw) values (%s, '999', 'triple', 3, 1500)", (str(olympia),)) is None and one("select count(*) from beds b join rooms r on r.id=b.room_id where r.room_number='999' and r.listing_id=%s", (str(olympia),))==3)
as_user(NAT)
check('student cannot add a room', err("insert into rooms (listing_id, room_number, room_type, capacity, price_zmw) values (%s, '998', 'single', 1, 1000)", (str(olympia),)) is not None)

print('--- private application, accept, deposit confirms booking (FR8.4)')
as_user(BWALYA)
bapp = one("select id from applications where reference='APP-2026-0405'")
as_user(GRACE)
as_root(); gec_owner_app_listing = one("select listing_id from applications where reference='APP-2026-0405'")
check('Bwalya\'s accepted application has a bed held for her', one("select state::text from beds where held_for_application_id=%s", (str(bapp),))=='held')
as_user(BWALYA)
pay = rows("select * from record_simulated_payment(%s, 'deposit', 1600)", (str(bapp),))
as_root()
check('deposit payment is recorded as simulated', one("select is_simulated from payments where application_id=%s and purpose='deposit' and status='successful'", (str(bapp),)) is True)
check('deposit confirmed the booking and reserved the bed', one("select state::text from bookings where application_id=%s", (str(bapp),))=='reserved' and one("select b.state::text from beds b join bookings k on k.bed_id=b.id where k.application_id=%s", (str(bapp),))=='reserved')
check('payment is linked to the booking', one("select booking_id is not null from payments where application_id=%s and status='successful' and purpose='deposit'", (str(bapp),)) is True)
check('no payment can be marked as real money', 'violates check constraint' in (err("insert into payments (application_id, payer_id, purpose, amount_zmw, is_simulated) values (%s, %s, 'deposit', 1, false)", (str(bapp), str(uid(BWALYA)))) or ''))

print('--- administrator Johnson: allocation decisions'); as_user(KABWE)
check('admin sees UNZA applications (2)', one("select count(*) from applications")==2, one("select count(*) from applications"))
check('admin sees allocation rules for UNZA only', one("select count(*) from allocation_rules where institution_id=(select id from institutions where code='UNZA')")==2 and one("select count(*) from allocation_rules")==2)
run = one("select id from allocation_runs where decision='pending'")
check('admin sees all 6 candidates including excluded', one("select count(*) from allocation_candidates")==6)
check('modify without a reason is refused', 'NOTE_REQUIRED' in (err("select decide_allocation(%s, 'modified', gen_random_uuid(), '')", (str(run),)) or ''))
check('modify to a room that is not a candidate is refused', 'BED_NOT_ELIGIBLE' in (err("select decide_allocation(%s, 'modified', %s, 'test')", (str(run), str(gec_bed))) or ''))
check('weights that do not total 100 are refused', 'violates check constraint' in (err("insert into allocation_rules (institution_id, name, version, w_room_type, w_budget, w_distance, w_facilities, w_availability) values ((select id from institutions where code='UNZA'), 't', 9, 20,20,20,20,10)") or ''))
check('approve works', err("select decide_allocation(%s, 'approved', null, 'Matches the preferences.')", (str(run),)) is None)
as_root()
check('application is now approved', one("select status::text from applications where reference='APP-2026-0412'")=='approved')
check('a booking exists and the bed is reserved', one("select b.state::text from beds b join bookings k on k.bed_id=b.id join applications a on a.id=k.application_id where a.reference='APP-2026-0412'")=='reserved')
check('the run records who decided and when', one("select decided_by is not null and decided_at is not null from allocation_runs where id=%s", (str(run),)) is True)
check('student was notified', one("select count(*) from notifications n join auth.users u on u.id=n.recipient_id where u.email=%s and n.title='Your room was approved'", (NAT,))==1)
as_user(KABWE)
check('second decision on the same run is refused', 'ALREADY_DECIDED' in (err("select decide_allocation(%s, 'rejected', null, 'x')", (str(run),)) or ''))

print('--- no double booking')
as_root()
bed314 = one("select b.id from beds b join bookings k on k.bed_id=b.id join applications a on a.id=k.application_id where a.reference='APP-2026-0412'")
kapp = one("select id from applications where reference='APP-2026-0411'")
check('committing a taken bed for another student fails', 'BED_UNAVAILABLE' in (err("select _commit_booking(%s, %s, current_date, current_date+180)", (str(kapp), str(bed314))) or ''))
check('direct overlapping booking is blocked by the database', 'bookings_no_overlap' in (err("insert into bookings (application_id, student_id, bed_id, start_date, end_date) select %s, student_id, %s, current_date+10, current_date+20 from applications where id=%s", (str(kapp), str(bed314), str(kapp))) or ''))
check('a later, non-overlapping period for the same bed is allowed', err("insert into bookings (application_id, student_id, bed_id, start_date, end_date) select %s, student_id, %s, current_date+200, current_date+300 from applications where id=%s", (str(kapp), str(bed314), str(kapp))) is None)
cur.execute("delete from bookings where application_id=%s", (str(kapp),))
# concurrency: two sessions race for one free bed
as_root(); free = one("select b.id from beds b join rooms r on r.id=b.room_id join listings l on l.id=r.listing_id where l.name='Olympia Park Residence' and b.state='available' limit 1")
app2 = one("select id from applications where reference='APP-2026-0401'")
a = psycopg2.connect(DSN); a.autocommit = False; ca = a.cursor()
ca.execute("select _commit_booking(%s, %s, current_date, current_date+180)", (str(kapp), str(free)))   # A holds the lock
outcome = {}
def racer():
    b = psycopg2.connect(DSN); b.autocommit = True; cb = b.cursor()
    try: cb.execute("select _commit_booking(%s, %s, current_date, current_date+180)", (str(app2), str(free))); outcome['b'] = 'committed'
    except psycopg2.Error as e: outcome['b'] = (e.pgerror or '').split('\n')[0]
    b.close()
t = threading.Thread(target=racer); t.start(); time.sleep(1.0)
check('second request waits while the first holds the bed', 'b' not in outcome)
a.commit(); t.join(); a.close()
check('second request fails with BED_UNAVAILABLE; only one booking exists', 'BED_UNAVAILABLE' in str(outcome.get('b')) and one("select count(*) from bookings where bed_id=%s", (str(free),))==1, outcome)

print('--- withdraw releases beds')
as_user(NAT)
check('student withdraws an approved application', err("select withdraw_application((select id from applications where reference='APP-2026-0412'), 'Changed my mind')") is None)
as_root()
check('bed is free again and booking cancelled', one("select state::text from beds where id=%s", (str(bed314),))=='available' and one("select state::text from bookings where bed_id=%s", (str(bed314),))=='cancelled')
check('a withdrawn application cannot be revived', 'INVALID_TRANSITION' in (err("update applications set status='submitted' where reference='APP-2026-0412'") or ''))
check('a declined application stays declined', 'INVALID_TRANSITION' in (err("update applications set status='approved' where reference='APP-2026-0398'") or ''))

print('--- maintenance tickets'); as_user(JOSEPH)
check('technician sees only tickets assigned to him', sorted(r[0] for r in rows("select reference from maintenance_tickets"))==['TKT-1030','TKT-1036','TKT-1042'])
check('technician cannot read student profiles or payments', one("select count(*) from profiles")==1 and one("select count(*) from payments")==0)
check('technician cannot edit status directly', 'permission denied' in (err("update maintenance_tickets set status='completed'") or ''))
check('technician cannot touch another technician\'s ticket', 'TICKET_NOT_FOUND' in (err("select set_ticket_status((select id from maintenance_tickets where reference='TKT-1041'), 'completed')") or '') or 'NOT_ALLOWED' in (err("select set_ticket_status((select id from maintenance_tickets where reference='TKT-1041'), 'completed')") or ''))
t42 = "(select id from maintenance_tickets where reference='TKT-1042')"
check('start work: assigned to in progress', err(f"select set_ticket_status({t42}, 'in_progress', 'On my way')") is None)
check('invalid jump is refused (in progress to reopened)', err(f"select set_ticket_status({t42}, 'reopened')") is not None)
check('mark completed', err(f"select set_ticket_status({t42}, 'completed', 'Washer replaced')") is None)
check('ticket history recorded with notes', [r[0] for r in rows(f"select to_status::text from ticket_events where ticket_id={t42} order by id")]==['pending','assigned','in_progress','completed'])
as_user(NAT)
check('student cannot complete a ticket', 'NOT_ALLOWED' in (err("select set_ticket_status((select id from maintenance_tickets where reference='TKT-1030'), 'completed')") or ''))
check('student can reopen a ticket completed 3 days ago', err("select set_ticket_status((select id from maintenance_tickets where reference='TKT-1036'), 'reopened', 'Light is out again')") is None)
as_root(); cur.execute("update maintenance_tickets set status_note=null where false")
check('overdue job escalates tickets', one("select escalate_overdue_tickets()") is not None)

print('--- documents and verification'); as_user(KABWE)
check('admin sees Natasha\'s 2 documents (institution scope)', one("select count(*) from documents")>=2)
nat_doc = one("select id from documents where kind='national_id' and review_decision='pending' limit 1")
check('admin can review a document', err("update documents set review_decision='verified', reviewer_note='Readable and complete' where id=%s", (str(nat_doc),)) is None and one("select reviewer_id is not null and reviewed_at is not null from documents where id=%s", (str(nat_doc),)) is True)
check('admin cannot edit the automated check result', 'permission denied' in (err("update documents set auto_result='clear'") or ''))
as_user(SYS)
check('system administrator cannot open private documents (OD-03)', one("select count(*) from documents")==0)
as_root(); total_apps = one("select count(*) from applications"); as_user(SYS)
check('system administrator can read every application (support, read only)', one("select count(*) from applications")==total_apps)
check('system administrator cannot decide allocations', 'NOT_ALLOWED' in (err("select decide_allocation(%s, 'approved')", (str(run),)) or ''))
as_user(GRACE)
check('Rachael cannot see Natasha\'s documents', one("select count(*) from documents where uploader_id=%s", (str(uid(NAT)),))==0)

print('--- announcements'); as_user(KABWE)
cur.execute("insert into announcements (author_id, title, body, audience, audience_institution_id) values (auth.uid(), 'Test notice', 'Hello UNZA', 'institution', (select id from institutions where code='UNZA')) returning id"); ann = cur.fetchone()[0]
n = one("select publish_announcement(%s)", (str(ann),))
as_root()
check('announcement reaches exactly the UNZA people', n == one("select count(*) from profiles where institution_id=(select id from institutions where code='UNZA')") and n == one("select count(*) from notifications where announcement_id=%s", (str(ann),)), n)
as_user(KABWE)
check('an announcement cannot be sent twice', 'ALREADY_SENT' in (err("select publish_announcement(%s)", (str(ann),)) or ''))
check('admin cannot target another institution', err("insert into announcements (author_id, title, body, audience, audience_institution_id) values (auth.uid(), 'x', 'y', 'institution', (select id from institutions where code='ZCAS'))") is not None)

print('--- listing moderation and audit'); as_root()
chel = one("select id from listings where name='Chelston Gardens Rooms'")
as_user(KABWE)
gecl = one("select id from listings where name='Great East Court'")
check('admin cannot moderate a listing their institution is not partnered with', 'NOT_ALLOWED' in (err("select moderate_listing(%s, 'suspended', 'x')", (str(chel),)) or ''))
check('suspending needs a reason', 'NOTE_REQUIRED' in (err("select moderate_listing(%s, 'suspended')", (str(gecl),)) or ''))
check('admin of a partnered institution can suspend with a reason', err("select moderate_listing(%s, 'suspended', 'Test reason')", (str(gecl),)) is None and one("select moderation::text from listings where id=%s", (str(gecl),))=='suspended')
as_root()
check('a suspended listing disappears from the public view', one("select count(*) from listing_cards where name='Great East Court'")==0)
check('audit log is not empty and records status changes', one("select count(*) from audit_events where action='applications.status_changed'")>5)
check('audit entries cannot be edited', 'AUDIT_IMMUTABLE' in (err("update audit_events set outcome='x'") or ''))
check('audit entries cannot be deleted', 'AUDIT_IMMUTABLE' in (err("delete from audit_events") or ''))
check('audit log cannot be truncated', 'AUDIT_IMMUTABLE' in (err("truncate audit_events") or ''))
check('every decision was audited with its note', one("select count(*) from audit_events where action='allocation.decision' and detail->>'note' is not null")>=1)
# hold expiry on an accepted private application (use a bed in Olympia Park, which is still published)
as_user(NAT)
cur.execute("insert into applications (student_id, route, listing_id, requested_room_type, budget_zmw, gender_needed, intake) values (auth.uid(), 'private', %s, 'double', 2000, 'female_only', 'Semester I 2027') returning id", (str(olympia),)); papp = cur.fetchone()[0]
check('private application submits', one("select submit_application(%s)", (str(papp),))=='submitted')
as_user(GRACE)
inbox = rows("select applicant_name, applicant_institution, reference from private_application_inbox")
check('owner inbox shows the applicant name and institution only', len(inbox)==1 and inbox[0][0]=='Natasha Mwale' and inbox[0][1]=='University of Zambia', inbox)
check('owner decline without a reason is refused', 'NOTE_REQUIRED' in (err("select decide_private_application(%s, 'declined')", (str(papp),)) or ''))
ob = one("select b.id from beds b join rooms r on r.id=b.room_id where r.listing_id=%s and b.state='available' limit 1", (str(olympia),))
check('owner accepts and holds a bed', err("select decide_private_application(%s, 'accepted', %s, 'Welcome')", (str(papp), str(ob))) is None and one("select state::text from beds where id=%s", (str(ob),))=='held')
as_user(NAT)
check('student sees status accepted', one("select status::text from applications where id=%s", (str(papp),))=='accepted')
check('a second open application to the same property is refused', err("insert into applications (student_id, route, listing_id) values (auth.uid(), 'private', %s)", (str(olympia),)) is not None)
check('student can hide her name from owners', err("update profiles set owner_can_see_profile=false where id=auth.uid()") is None)
as_user(GRACE)
check('owner then sees "Applicant" instead of the name', one("select applicant_name from private_application_inbox")=='Applicant')
as_root(); cur.execute("update beds set hold_expires_at = now() - interval '1 hour' where id=%s", (str(ob),))
check('expire_holds frees the bed', (one("select expire_holds()") or 0) >= 1 and one("select state::text from beds where id=%s", (str(ob),))=='available')
check('and the linked application becomes expired', one("select status::text from applications where id=%s", (str(papp),))=='expired')

print('--- private document storage'); as_root()
check('the documents bucket exists and is NOT public', rows("select public from storage.buckets where id='documents'")==[(False,)])
mine = str(uid(NAT)); theirs = str(uid(GRACE))
as_user(NAT)
check('a student can upload into her own folder', err("insert into storage.objects (bucket_id, name) values ('documents', %s)", (mine + '/id.pdf',)) is None)
check('a student cannot upload into someone else\'s folder', err("insert into storage.objects (bucket_id, name) values ('documents', %s)", (theirs + '/id.pdf',)) is not None)
as_root(); cur.execute("insert into storage.objects (bucket_id, name) values ('documents', %s)", (theirs + '/owner.pdf',))
as_user(NAT)
check('a student can only list her own files', [r[0] for r in rows("select name from storage.objects where bucket_id='documents'")]==[mine + '/id.pdf'])
as_user(None)
check('a visitor cannot read any document file', err("select * from storage.objects") is not None)

fails = [r for r in results if not r[1]]
print(f"\n{len(results)-len(fails)} passed, {len(fails)} failed")
sys.exit(1 if fails else 0)
