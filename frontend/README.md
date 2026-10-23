# Rutgers SOC frontend

A React + TypeScript + Vite app for browsing Rutgers courses and building a personal weekly schedule against the `backend` API.

## Install and run

From `frontend`:

```sh
npm install
npm run dev
```

This starts the Vite dev server at `http://localhost:5173`. It expects the backend API at `http://localhost:8000` (override with `VITE_API_BASE_URL`); see `backend/README.md` to collect course data and start the API.

## Pages

- **Browse** (`/`) — search and filter courses by subject code, pulled from `/courses`.
- **Course detail** (`/courses/:courseId`) — a course's sections, meeting times, and instructors, with an "Add to schedule" action per section.
- **My Schedule** (`/schedule`) — a weekly grid of your added sections, built from meeting times. Sections with overlapping meeting times are flagged with a "Conflict" badge rather than blocked. Your selections persist to `localStorage`; there's no backend account system.

## Other scripts

```sh
npm run build   # typecheck + production build
npm run test    # vitest (unit tests for schedule conflict detection)
npm run lint    # oxlint
```
