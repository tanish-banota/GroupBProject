# Rutgers SOC frontend

A React + TypeScript + Vite app for browsing Rutgers courses and building a personal weekly schedule against the `backend` API.

## Install and run

From `frontend`:

```sh
npm install
npm run dev
```

This starts the Vite dev server at `http://localhost:5173`. It expects the backend API at `http://localhost:8000` (override with `VITE_API_BASE_URL`); see `backend/README.md` to collect course data and start the API.

## Supabase accounts

Create `frontend/.env.local` with the URL and publishable key of the Supabase project used by this app, then restart Vite:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

Run [`backend/sql/create_users.sql`](../backend/sql/create_users.sql) in that project's Supabase SQL editor. Supabase Auth creates login accounts in `auth.users`; the SQL adds `public.users` for app profiles, creates one row for each login, and limits reads and display name edits to the account owner.

To enable Google sign-in, create a Google OAuth web client. Add the Supabase Auth callback URL shown on the project's **Authentication → Providers → Google** page as a Google authorized redirect URI, and enter the Google client ID and secret on that Supabase page. In Supabase **Authentication → URL Configuration**, allow `http://localhost:5173` as a redirect URL (and add the deployed app URL when available). The local Vite origin must also be an authorized JavaScript origin in the Google OAuth client.

The Account page reads and edits `public.users.display_name`. Course selections and schedules currently remain in browser `localStorage` and are not synced to the account.

## Pages

- **Browse** (`/`) — search and filter courses by subject code, pulled from `/courses`.
- **Course detail** (`/courses/:courseId`) — a course's sections, meeting times, and instructors, with an "Add to schedule" action per section.
- **My Schedule** (`/schedule`) — a weekly grid of your added sections, built from meeting times. Sections with overlapping meeting times are flagged with a "Conflict" badge rather than blocked. Your selections persist to `localStorage`.
- **Account** (`/account`) — sign in with Google and edit the profile stored in Supabase.

## Other scripts

```sh
npm run build   # typecheck + production build
npm run test    # vitest (unit tests for schedule conflict detection)
npm run lint    # oxlint
```
