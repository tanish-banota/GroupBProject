# Rutgers SOC frontend

A React + TypeScript + Vite app for browsing Rutgers courses and building a personal weekly schedule against the `backend` API.

## Install and run

Create the Python environment and install the backend dependencies once:

```powershell
cd backend
C:\Python313\python.exe -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
cd ..\frontend
```

Then from `frontend`:

```sh
npm install
npm run dev:all
```

This starts Vite at `http://localhost:5173` and the backend API at `http://127.0.0.1:8000`. See `backend/README.md` to collect course data. Override the API URL with `VITE_API_BASE_URL` when needed.

The course JSON exports must be present in `backend/soc_output`. Running `npm run dev` alone starts only Vite; course requests will fail if the backend is not running on port 8000. Use the Python executable installed on your machine if it is not at `C:\Python313\python.exe`.

## Supabase accounts

Create `frontend/.env.local` with the URL and publishable key of the Supabase project used by this app, then restart Vite:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

Run [`backend/sql/create_users.sql`](../backend/sql/create_users.sql) in that project's Supabase SQL editor. Supabase Auth creates login accounts in `auth.users`; the SQL adds `public.users` for app profiles, creates one row for each login, and limits reads and display name edits to the account owner.

If `create_users.sql` has already been run, run [`backend/sql/add_schedule_to_users.sql`](../backend/sql/add_schedule_to_users.sql) next. It adds the selected courses and scheduled sections to each profile and grants owners permission to save them. New projects must run both SQL files in order.

To enable Google sign-in, create a Google OAuth web client. Add the Supabase Auth callback URL shown on the project's **Authentication → Providers → Google** page as a Google authorized redirect URI, and enter the Google client ID and secret on that Supabase page. In Supabase **Authentication → URL Configuration**, allow `http://localhost:5173` as a redirect URL (and add the deployed app URL when available). The local Vite origin must also be an authorized JavaScript origin in the Google OAuth client.

The first screen offers email/password sign-in, email account creation, and Google sign-in. If the Supabase project requires email confirmation, new email accounts receive a confirmation link before they can sign in. The Account page reads and edits `public.users.display_name`. Selected courses and scheduled sections load from and save to `public.users`; an existing browser-only schedule is imported once when the cloud profile is empty.

## Pages

- **Browse** (`/`) — search and filter courses by subject code, pulled from `/courses`.
- **Course detail** (`/courses/:courseId`) — a course's sections, meeting times, and instructors, with an "Add to schedule" action per section.
- **My Schedule** (`/schedule`) — a weekly grid of your added sections, built from meeting times. Sections with overlapping meeting times are flagged with a "Conflict" badge rather than blocked. Your selections persist to your Supabase profile.
- **Generated schedules** — on My Schedule, generate conflict-free combinations from all selected courses, preview five at a time, and save one to your profile. Closed sections can be included with a toggle, and any manually chosen section can be kept fixed. Results use the section data currently in `backend/soc_output`.
- **Account** (`/account`) — edit the profile stored in Supabase after signing in with email or Google.

## Other scripts

```sh
npm run build   # typecheck + production build
npm run test    # vitest (unit tests for schedule conflict detection)
npm run lint    # oxlint
```
