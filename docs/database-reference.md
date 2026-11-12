# StudentStay database reference

Plain-text copy of the database design for people and AI tools. The SQL in `supabase/migrations/` is the source of truth.
If this file and the SQL disagree, the SQL wins. Update this file in the same pull request as any database change.

## The project
- Supabase project ref: `erzcamqjhoskqkmyxvxc` (region eu-west-1, Postgres 17). One database, used for everything for now.
- Everything in it is invented demo data. Payments are simulated. Do not add real personal data.
- Public URL and publishable key go in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The secret key goes in `SUPABASE_SERVICE_ROLE_KEY` (server only).

## Tables (22)
| Table | Holds |
|---|---|
| institutions | Universities and colleges. Evelyn Hone College is `validation_pending`. |
| profiles | One per sign-in account (created by a trigger). Role, name, institution, student number, preferences. |
| partners | Property owners and operators. `owner_id` is null for demo partners with no login. |
| listings | A property. Type, area, rules, facilities, `moderation` state, `verification` badge, `last_updated_at`. |
| listing_distances | Distance to each campus and whether that institution recognises the listing (`partnered`). |
| rooms | Room type, capacity, price. Inserting a room creates its beds automatically. |
| beds | One row per bed with `state`, who changed it, when, and `hold_expires_at`. |
| applications | University allocation or private. `status`, `status_reason`. |
| application_events | Timeline of status changes. Filled by a trigger. Read only. |
| allocation_rules | Per institution, versioned. Hard constraints (json) and five weights that total 100. |
| allocation_runs | One engine run for one application, plus the administrator decision. |
| allocation_candidates | Ranked rooms with score breakdown, and excluded rooms with reasons. |
| bookings | A student's claim on one bed for a period. Cannot overlap for one bed. |
| payments | Simulated payments only (`is_simulated` must be true). |
| maintenance_tickets | Repair requests. `status` changes only through functions. |
| ticket_events | Ticket timeline. Filled by a trigger. Read only. |
| announcements | A message with an audience. Sent with `publish_announcement`. |
| notifications | One row per recipient. Only `read_at` is writable by the user. |
| documents | Uploaded document record, automated check result, human review. File is in the private `documents` bucket. |
| shortlist | A student's saved listings. |
| audit_events | Append-only log. Cannot be edited or deleted by anyone. |
| state_transitions | The allowed state changes, as data. |

Views: `listing_cards` (public, published listings with bed counts, `is_stale`, `distances`, `room_types`, `free_room_types`) and `private_application_inbox` (what an owner may see of a private applicant).

## Reading listings, rooms and beds: always name the columns
Since `20261112000001_limit_public_columns.sql`, visitors and signed-in users can read only some columns of `beds` and `listings`.
- Always list the columns you need: `select('id, name, area')`. Never `select('*')` or `select()` with no columns on `listings`, `rooms` or `beds`. On `beds` and `listings` it fails; on `rooms` it is the same rule for consistency.
- Visitors (`anon`) read `beds`: id, room_id, label, state, created_at. Signed-in users also read state_note, state_changed_at, hold_expires_at. Nobody reads held_for_application_id or state_changed_by from the browser.
- Visitors read `listings`: id, institution_id, name, type, area, address, description, house_rules, gender, gender_note, facilities, rent_unit, deposit_note, min_stay_note, verification, last_updated_at, lat, lng. Signed-in users also read partner_id, moderation, created_at, updated_at. `moderation_note` is not readable from the browser.
- Row-level security still decides which rows. Owners who need `moderation_note` will need a grant or a function (to decide in slice S2/S6).

## State lists
- `allocation_decision`: pending, approved, modified, rejected, rerun
- `application_route`: university_allocation, private
- `application_status`: draft, submitted, profile_incomplete, under_review, recommended, pending_approval, approved, accepted, declined, no_eligible_room, withdrawn, expired
- `audience_kind`: all, institution, listing, role, users
- `bed_state`: available, held, pending_approval, reserved, occupied, blocked_for_maintenance
- `booking_state`: reserved, occupied, cancelled, expired, released
- `check_result`: clear, unclear, possible_duplicate
- `document_kind`: national_id, proof_of_enrolment, ownership_proof
- `gender_policy`: female_only, male_only, mixed
- `listing_type`: university_hostel, recognised_boarding_house, private_rental
- `moderation_state`: draft, awaiting_moderation, published, requires_review, suspended
- `payment_purpose`: application_fee, deposit, rent
- `payment_status`: pending, successful, failed, refunded
- `review_decision`: pending, verified, resubmission_required, requires_review
- `room_type`: single, double, triple, quad
- `ticket_priority`: low, medium, high
- `ticket_status`: pending, assigned, in_progress, completed, reopened, escalated, cancelled
- `user_role`: student, owner, university_admin, technician, system_admin

## Allowed state changes
Any other change raises `INVALID_TRANSITION`. They are rows in `state_transitions`, so do not hard-code them in the app. Read the table if you need them.

### Bed
- `available` to `blocked_for_maintenance`, `held`, `pending_approval`
- `blocked_for_maintenance` to `available`
- `held` to `available`, `blocked_for_maintenance`, `reserved`
- `occupied` to `available`
- `pending_approval` to `available`, `reserved`
- `reserved` to `available`, `blocked_for_maintenance`, `occupied`

### Booking
- `occupied` to `released`
- `reserved` to `cancelled`, `expired`, `occupied`

### Application
- `accepted` to `expired`, `withdrawn`
- `approved` to `expired`, `withdrawn`
- `draft` to `submitted`, `withdrawn`
- `pending_approval` to `approved`, `declined`, `no_eligible_room`, `submitted`, `withdrawn`
- `profile_incomplete` to `expired`, `submitted`, `withdrawn`
- `recommended` to `pending_approval`, `submitted`, `withdrawn`
- `submitted` to `no_eligible_room`, `profile_incomplete`, `recommended`, `under_review`, `withdrawn`
- `under_review` to `accepted`, `declined`, `withdrawn`

### Ticket
- `assigned` to `cancelled`, `escalated`, `in_progress`, `pending`
- `completed` to `reopened`
- `escalated` to `assigned`, `completed`, `in_progress`
- `in_progress` to `completed`, `escalated`
- `pending` to `assigned`, `cancelled`
- `reopened` to `assigned`, `escalated`, `in_progress`

### Listing moderation
- `awaiting_moderation` to `published`, `requires_review`, `suspended`
- `draft` to `awaiting_moderation`
- `published` to `requires_review`, `suspended`
- `requires_review` to `awaiting_moderation`, `suspended`
- `suspended` to `awaiting_moderation`

### Payment
- `failed` to `pending`
- `pending` to `failed`, `successful`

## Roles
`student`, `owner`, `university_admin`, `technician`, `system_admin`. Stored on `profiles.role`.
- Only `student` or `owner` can be chosen at sign-up, by passing `signup_role` in the sign-up metadata: `supabase.auth.signUp({ email, password, options: { data: { full_name, signup_role: 'owner' } } })`. Anything else becomes `student`.
- Staff roles are assigned with SQL by an administrator (see section 2.2 and Appendix B of the design document).
- A user cannot change their own role. The column is not writable from the browser.

## What the browser can write directly (rows are still filtered by security policies)
- `profiles`: own personal fields only (name, phone, institution, student number, programme, preferences, privacy switches). Never `role`.
- `applications`: create a draft, edit a draft. Never `status`. Use `submit_application`.
- `shortlist`, `notifications.read_at`, `documents` (upload record), `announcements` (create), `listings` (create as draft, edit details), `rooms`, `listing_distances`, `partners`.
- `beds.state`, `state_note`: owners for their own listing, administrators for their own hostel. Changes must follow the allowed list.
- `maintenance_tickets`: create (student with a live booking); owner or administrator can edit priority, access notes, due date.
- `payments.status`: the owner of that tenancy only.
- Not writable at all from the browser: `bookings`, `allocation_*`, `audit_events`, `application_events`, `ticket_events`, `state_transitions`, any `status` or `moderation` column.

## Server-side actions (call with `supabase.rpc('name', {...})`)
| Function | Who | Notes |
|---|---|---|
| `submit_application(p_app)` | student | Returns `submitted` or `profile_incomplete`. Needs a verified email. |
| `withdraw_application(p_app, p_reason)` | student | Releases every bed set aside. Cancels a reserved booking. |
| `decide_allocation(p_run, p_decision, p_bed, p_note, p_start, p_end)` | university administrator | `p_decision`: `approved`, `modified`, `rejected`, `rerun`. `modified` needs `p_bed` and a note; `rejected` needs a note. Creates the booking. |
| `decide_private_application(p_app, p_decision, p_bed, p_note)` | owner of the listing | `p_decision`: `accepted` (needs `p_bed`, holds it 48 hours) or `declined` (needs a note). |
| `record_simulated_payment(p_app, p_purpose, p_amount, p_method)` | student | A `deposit` on an accepted application confirms the booking. Returns the payment row. |
| `assign_ticket(p_ticket, p_technician, p_note)` | owner or administrator of the property | |
| `set_ticket_status(p_ticket, p_new, p_note)` | technician (own: in_progress, completed, escalated), student (reopen within 7 days), owner (escalated, cancelled), administrator (escalated) | |
| `submit_listing_for_moderation(p_listing)` | owner or hostel administrator | |
| `moderate_listing(p_listing, p_state, p_note)` | partnered administrator or system administrator | `p_state`: `published`, `requires_review`, `suspended`. A note is required for the last two. |
| `confirm_listing_availability(p_listing)` | owner or hostel administrator | Refreshes "last updated". |
| `confirm_student_number(p_student)` | university administrator of that institution | |
| `publish_announcement(p_id)` | the author | Returns the number of recipients. |

Server only (service role). Called by the allocation engine's server action, never from the browser:
| Function | Notes |
|---|---|
| `record_recommendation(p_app, p_rule, p_explanation, p_candidates jsonb, p_run_by)` | Saves one engine run all or nothing: the run, its candidates (at most 400 rows), the held top bed and the status change (`submitted` to `recommended` to `pending_approval`, or to `no_eligible_room`). Names `p_run_by` as the actor for the call, so the audit log, timeline and bed history show the administrator. Refuses a `p_run_by` who is not a university administrator of the application's institution (`NOT_ALLOWED`). Raises `BAD_INPUT`, `APPLICATION_NOT_FOUND`, `NOT_UNIVERSITY`, `INVALID_TRANSITION`, `RULE_NOT_ACTIVE`, `BED_UNAVAILABLE`. Granted to `service_role` only. |

Server only (service role, scheduled jobs). Never call from the browser: `expire_holds()`, `escalate_overdue_tickets()`, `_commit_booking`, `_notify`, `_release_beds`, `log_audit`.

## The allocation engine (slice S5)
Code: `src/lib/allocation/engine.ts` (pure, unit tested), loader `src/server/allocation/load.ts`, steps `src/server/allocation/run.ts`.
1. Order: `requireRole('university_admin')`, then with the administrator's OWN session read the application (university allocation, their institution, `submitted`) and the active rule. Only then the service role loads the pool and calls `record_recommendation` with `p_run_by` = the administrator. Decisions (`decide_allocation`) and `confirm_student_number` always use the administrator's own session. The service-role client (`src/server/supabase-admin.ts`) is imported only under `src/server/allocation/`.
2. Inputs, and only these (PRD FR5.6): the application's institution code, room type, monthly budget, who can stay, preferred facilities; the active rule (weights, `hard_constraints`); each room's id, number, type, price, wing, gender, its listing (rent unit, gender policy, facilities, last updated, distance, partnered) and its beds (state, `held_for_application_id`). Never a name, nationality, religion, student number or other personal detail.
3. Pool: every room of every published listing partnered with the institution (`listing_distances.partnered`).
4. Bed: one held or pending for this application, otherwise the lowest available label. A room with no such bed is never ranked, even with `bed_free` switched off.
5. Term prices are divided by `TERM_MONTHS = 5` (`src/lib/allocation/constants.ts`, TODO(OD): confirm per institution).
6. Hard constraints (a missing flag counts as on), first failing reason wins: "Not recognised for your institution", "No free bed in this room", "Gender policy: <policy>" (the room's gender, else the listing's), "Room type not requested (<type> room)", "Above your budget (K<monthly> a month)".
7. Scores 0 to 100, one decimal: room type 100 or 40; budget 100 up to the budget, then 100 - (ratio - 1) * 250 up to 1.2, then 0; distance max(0, 100 - 5 * km); facilities share of the preferred ones (100 if none); availability 100 up to 7 days, 100 - (days - 7) * 40 / 23 up to 30, then 30. Total = weighted sum / 100, two decimals, half up.
8. Ranking: total, then room number (numerically), then bed label. Top 5 kept with a bed each; excluded rooms kept with their reason, at most 300.
9. Recommendation is not allocation. A booking exists only after `decide_allocation`.

## Error codes
Failures start with a code and a colon, for example `BED_UNAVAILABLE: this bed is no longer free`. Match on the code. Show a friendly message and a reference code, never the raw text.
| Code | Meaning | Suggested message |
|---|---|---|
| `BED_UNAVAILABLE` | Bed taken or an overlapping booking exists | That bed was just taken. Here are other options. |
| `INVALID_TRANSITION` | Status change not allowed | That change is not possible from the current status. |
| `NOT_ALLOWED` or SQLSTATE `42501` | Not permitted | You do not have access to do that. |
| `ALREADY_DECIDED` | Already decided | This has already been decided. |
| `NOTE_REQUIRED` | A reason is needed | Please give a reason. |
| `BED_NOT_ELIGIBLE` | Room is not one of the run's eligible rooms | Choose one of the eligible rooms. |
| `BED_REQUIRED` | Owner accepted without a bed | Choose the bed to hold. |
| `EMAIL_NOT_VERIFIED` | Email not verified | Verify your email before applying. |
| `REOPEN_WINDOW_PASSED` | More than 7 days since completed | This request can no longer be reopened. Please report a new one. |
| `NOT_A_TECHNICIAN` | Chosen person is not a technician | Choose a technician. |
| `ALREADY_SENT` | Announcement already sent | This announcement has already been sent. |
| `BED_NOT_FOUND`, `RUN_NOT_FOUND`, `TICKET_NOT_FOUND`, `BAD_DECISION`, `BAD_STATE` | Bad input | Something went wrong. |
| `AUDIT_IMMUTABLE` | Someone tried to change the audit log | Treat as a bug. |
| SQLSTATE `23505` on `profiles_student_number_uq` | The student number is already used at that institution | This student number cannot be used. Check it, or contact your accommodation office. (Does not confirm that someone else has it.) |
| SQLSTATE `23505` on `applications_one_open_per_listing` | The student already has an open application to that listing | You already have an open application to this place. (Link to it.) |
| `EMAIL_NOT_VERIFIED` from `submit_application` | Raised with SQLSTATE `42501`. Match the code before the colon, not the SQLSTATE | Verify your email before applying. |
| `INVALID_TRANSITION` from `withdraw_application` | The application is already closed | This application can no longer be withdrawn. |

| `RULE_NOT_ACTIVE` | The institution has no active rule, or the rule given is not it | There is no active allocation rule for your institution. |
| `NOT_UNIVERSITY` | Matching a private application | Only university allocation applications can be matched. |
| `APPLICATION_NOT_FOUND` (raised without a detail) | No such application | We could not find that application. |
| `BAD_INPUT` | The candidate list is not a list or too long | Something went wrong. |
| `BED_UNAVAILABLE` from `record_recommendation` | The top bed was taken while matching; nothing was saved | A bed was taken while matching, so nothing was saved. Run matching again. |
| `BED_UNAVAILABLE` from `decide_allocation` | The bed was taken before approval; nothing was saved | That bed was just taken. Nothing was saved. (The screen offers the next eligible rooms and Match again.) |
Codes raised with no detail (for example `NOT_ALLOWED` or `APPLICATION_NOT_FOUND` on their own) are matched too.

App-level checks (not raised by the database, mapped in `src/lib/errors.ts`):
| Code | Meaning | Message |
|---|---|---|
| `UNIVERSITY_APPLICATION_OPEN` | The student already has an open university allocation application | You already have an open university allocation application. (Link to it.) |
| `WITHDRAW_NOT_ALLOWED` | `state_transitions` has no move from this status to `withdrawn` | This application can no longer be withdrawn. |
| `NOT_SUBMITTED` | Matching an application that is not `submitted` | Only a submitted application can be matched. |
| `APPLICATION_INCOMPLETE` | The application has no room type, budget or who can stay | This application is missing a room type, budget or who can stay. |
| `SERVICE_ROLE_MISSING` | `SUPABASE_SERVICE_ROLE_KEY` is not set on the server | Matching is not set up on this server. |

Also expect `23514` (a check failed) and `23P01` (an overlap).

## Defaults the database already applies
Hold 48 hours for an accepted private application. Listing is stale after 30 days. Ticket target time: high 24 hours, medium 3 days, low 7 days. Reopen within 7 days. Documents keep a retention date 90 days out. A booking made without dates is 180 days from today. Not enforced yet: the 72 hour deposit deadline (`bookings.deposit_due_at` is stored only), the retention deletion job, the scheduled jobs.

## Sessions
Session expiry is not enforced yet. The PRD default (OD-04: 30 minutes for staff, 12 hours for students) needs Supabase Pro or app-side enforcement. Revisit before real data.

## Demo accounts (invented, example.com addresses)
`natasha.mwale` (student, UNZA), `rachael.musongo` (owner of Olympia Park and Northmead), `johnson.kawemba` (UNZA administrator), `joseph.sakala` (technician), `platform.admin` (system administrator), all `@example.com`. They have random passwords that nobody knows. Set one by running SQL in the Supabase SQL Editor, as in the design document, section 2.2. Never put a password in a file, a commit or a chat. Eight more demo people (seven students and a second technician) never sign in.

## Changing the database
1. Write a new file in `supabase/migrations/` named `YYYYMMDDHHMMSS_short_name.sql`. Never edit a migration that has been applied.
2. Every new table: enable row-level security, add explicit policies, grant only the columns the browser needs. New tables are not exposed to the API until you grant access.
3. Anything that changes a status goes in a function that checks who is calling. Do not grant update on a status column.
4. Test as each role before merging. Run Supabase's security advisor and explain any new warning.
5. Update this file and `docs/StudentStay_Database_Design_v0.9.docx` in the same pull request.
6. After any change, regenerate the TypeScript types (see CLAUDE.md).
7. The migration history in the Supabase dashboard uses different timestamps from the file names, because migrations were applied through the dashboard and connector. Do not run supabase db push without repairing the history first. Ask before using the Supabase command line.

## Known gaps
- One open university allocation application per student is checked in the app only (`src/lib/applications/rules.ts`). The unique index `applications_one_open_per_listing` does not cover it, because university applications have no `listing_id`. A database rule can come later.
- Notification links written by the database use `/applications/<reference>`. The app redirects them to `/student/applications/<reference>` (only for references like `APP-2026-0412`).
- `submit_application` reads institution and student number from the student's profile, not the application. The apply wizard saves them to the profile first, which resets the profile's confirmation (`student_number_matched`).
- Owners cannot read `moderation_note` on `listings`. S2 will add a view limited to listings the person manages.
- The `shortlist` table does not restrict inserts to students at database level. The screens hide the heart for owners. A later migration will restrict it.
