# studentstay
Student accommodation platform for Lusaka universities

## Running StudentStay locally

### What this is
StudentStay helps students at Lusaka universities find and apply for accommodation, and helps property owners and university accommodation offices manage it. It is our final-year project. Everything in it is invented demo data, and payments are simulated: no real money moves.

It is built with Next.js (App Router, TypeScript, Tailwind) and Supabase (Postgres, Auth, Storage). Read `CLAUDE.md` and `docs/database-reference.md` before you change any code.

### What you need
- Node.js 24 (run `node -v` to check)
- Git
- Access to the StudentStay Supabase project (ask the project owner to invite you)

### 1. Clone the project
```bash
git clone https://github.com/jonathangowera/studentstay.git
cd studentstay
```

### 2. Create `.env.local`
Copy the example file:
```bash
cp .env.example .env.local
```
On Windows PowerShell, use `Copy-Item .env.example .env.local`.

Then fill in these names in `.env.local`:

| Name | Where to find the value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard, Project Settings: the Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard, Project Settings, API keys: the publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard, Project Settings, API keys: the secret key. Not used yet, so you can leave it empty. |
| `NEXT_PUBLIC_SITE_URL` | Optional. Leave it empty locally. |

Rules:
- Never commit `.env.local`. It is already in `.gitignore`.
- Never paste a key into code, a commit, an issue, a chat or this README.
- The secret key never gets a `NEXT_PUBLIC_` name.

### 3. Install and run
```bash
npm install        # install packages
npm run dev        # start the app at http://localhost:3000
```

### 4. Check your work before a pull request
```bash
npm run lint       # code style and common mistakes
npx tsc --noEmit   # type check
npm test           # unit tests (Vitest)
npm run build      # production build
```
All four must pass. Work on a branch, never push to `main`, and open a pull request.

### Demo accounts
These five invented accounts are in the database. All use `@example.com` addresses.

| Email | Role |
|---|---|
| `natasha.mwale@example.com` | Student (UNZA) |
| `rachael.musongo@example.com` | Property owner |
| `johnson.kawemba@example.com` | University administrator (UNZA) |
| `joseph.sakala@example.com` | Technician |
| `platform.admin@example.com` | System administrator |

They have no usable password. Ask the project owner to set one for you in the Supabase SQL Editor (design document, section 2.2). Never write a password in a file, a commit or a chat.

You can also create your own Student or Property owner account on the sign-up page. You need a real inbox for the confirmation email.

### Supabase settings for sign-up and password reset emails
Someone with admin access to the Supabase project sets these once, in the dashboard:

1. **Authentication, URL Configuration**
   - Site URL: `http://localhost:3000`
   - Redirect URLs: add `http://localhost:3000/**`. Add the Vercel address too when we deploy.
2. **Authentication, Email Templates**
   - Confirm signup: make the link point to
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
   - Reset password: make the link point to
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`

   With these links, the email works on any device. The default links also work, but only in the browser where you asked for the email.
3. **Authentication, Sign In / Providers, Email**: keep "Confirm email" switched on.

Supabase's built-in email service sends only a few emails per hour. If an email does not arrive, wait and try again.

Session expiry after inactivity is not set up yet. It needs the Supabase Pro plan. See "Sessions" in `docs/database-reference.md`.

### Where things are
```
src/app/         pages, grouped by who uses them: (public) (student) (owner) (admin) (technician) (system)
src/components/  shared interface components
src/lib/         Supabase clients, validation, error messages, role routing
src/server/      server-only code (session and role checks)
supabase/        database migrations, demo data, tests
docs/            database reference and project documents
design/          the visual design (open the HTML files in a browser)
```
