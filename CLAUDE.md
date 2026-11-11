@AGENTS.md

# StudentStay

Student accommodation platform for Lusaka universities. Final-year project by three students. Test project: everything is invented demo data and payments are simulated.
Stack: Next.js (App Router, TypeScript, Tailwind), Supabase (Postgres, Auth, Storage), Vercel, GitHub.

## Read first
- `docs/database-reference.md`: tables, states, server-side actions, error codes. Read it before writing any database or API code.
- `supabase/migrations/*.sql`: the source of truth for the database.
- `design/*.html`: the visual reference (Modern concept). Match layout, wording and status labels. Open them in a browser.
- `docs/*.docx` are for people (PRD, readiness pack, design document). You cannot read them well. Ask for the requirement as text. Requirement IDs look like FR5.3 or SEC-02.

## Rules that must never break
1. **Out of scope. Never build:** real payments or any card, bank or mobile-money field; native apps; university SIS integration; autonomous allocation; legal or identity certification; MySQL.
2. **Recommended is not approved.** The engine only recommends. A booking exists only after an administrator calls `decide_allocation`. Never use the two words interchangeably in code, data or UI text.
3. **Payments are simulated.** Show "Demonstration payment, no real money moves" on every payment screen.
4. **Verification wording.** Badges say "Verified listing information", "Verification pending" or "Requires review". Never write safe, secure, legal, guaranteed or genuine. Explain with "Not a guarantee".
5. **Status is never colour alone.** Use icon, text and colour. Keep focus visible. Text contrast at least 4.5:1.
6. **Scoring uses only** room type, budget, distance, facilities and availability. Never name, nationality, religion or other personal details.
7. **Privileged changes run on the server.** The browser cannot change a status, a role or a booking. Use the functions in `docs/database-reference.md`.
8. **Secrets.** Never commit `.env.local` or print a key. `SUPABASE_SERVICE_ROLE_KEY` is used only in server-only files and never has the `NEXT_PUBLIC_` prefix. The browser uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` (a publishable key).
9. **Demo data only.** Never put real names, emails, phone numbers or documents into code, tests, seeds or prompts.
10. **Private documents** never get a public URL. Files are in the private `documents` bucket and are opened with short-lived signed links made on the server. Log each one in the audit log.

## How to work
- Always work on a branch. Never push to `main`. Open a pull request. A teammate approves it (the repo owner may merge their own).
- Small commits. Plain English messages.
- A feature is done only when it has: a data path, permission checks, validation, error handling and at least one test.
- Do not invent features. If a requirement is marked OPEN DECISION, use the default in `docs/database-reference.md` and leave a `TODO(OD-xx)` comment. If something is unclear, stop and ask.
- Before every pull request run `npm run lint`, `npx tsc --noEmit` and `npm run build`. Fix what they report.
- When you change the database, follow "Changing the database" in `docs/database-reference.md`.
- Write UI text in plain English, short sentences, no em dashes. Currency is kwacha written like K1,350. Times show Central Africa Time.

## Commands
- `npm run dev` runs the app at http://localhost:3000
- `npm run lint`, `npx tsc --noEmit`, `npm run build`
- Supabase types: generate them into `src/lib/database.types.ts` with the Supabase CLI or the Supabase MCP connector (check the current docs for the exact command). Regenerate after every database change. Never edit the generated file by hand.

## Code layout
```
src/app/        routes, grouped by who uses them: (public) (student) (owner) (admin) (technician) (system)
src/components/ shared interface components
src/server/     server-only code: allocation engine (pure functions), service-role client, signed links, scheduled jobs
src/lib/        Supabase clients, validation schemas, formatting, error-code mapping
supabase/       migrations, seed, reset, tests
```
- Put `import 'server-only'` at the top of every file in `src/server/`.
- The allocation engine is pure functions: data and rules in, ranked rooms, exclusions with reasons, scores and explanations out. Easy to unit test.
- Map database errors by the code before the colon (see the error table) and show a friendly message with a reference code.

## Design (Modern / Minimal)
Font Figtree. Primary blue `#1F5FD6`, deep navy text `#0F1E3D`, pale blue page `#E6EDF9`, white cards with 20px corners, pill buttons, soft shadows. Status pills carry an icon and a label. Copy the structure of the matching file in `design/` rather than inventing a layout.

## Build order (vertical slices)
S1 sign up, sign in, five roles, profile, audit log. S2 owner listings, rooms and beds. S3 public search, filters and property pages. S4 applications and the status tracker. S5 allocation engine and administrator review. S6 bookings and holds. S7 simulated payments. S8 maintenance and the technician view. S9 documents, announcements and reports.
Start with S1. First task: generate the database types, then build the Supabase browser and server clients in `src/lib/`.

## Accounts for testing
The five demo accounts are listed in `docs/database-reference.md`. They have no usable password. Ask the project owner to set one. Do not set a password yourself in code.
